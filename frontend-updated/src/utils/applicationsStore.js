// Applications "store" — the single place every page talks to for
// application data. It keeps a fast localStorage cache (so the UI stays
// instant and synchronous, exactly as before) but every read is backed by
// MongoDB via the backend API, and every write is persisted there too.
//
// Nothing else in the app needs to change: every exported function keeps
// its original name and signature. Reads are synchronous (served from the
// cache); writes update the cache immediately (optimistic) and also fire
// the matching API call in the background so the change lands in Mongo.

import {
  fetchApplications,
  fetchApplication,
  createApplication as apiCreateApplication,
  patchApplication as apiPatchApplication,
  renameApplicationRef as apiRenameApplicationRef,
  removeApplication as apiRemoveApplication,
  postMessage as apiPostMessage,
  postNote as apiPostNote,
  postDocument as apiPostDocument,
  removeDocument as apiRemoveDocument,
  postRequestMoreInfo as apiRequestMoreInfo,
  postRespondToInfoRequest as apiRespondToInfoRequest,
  postClearInfoRequest as apiClearInfoRequest,
  postCancelApplication as apiCancelApplication,
} from '../services/applicationsService';

const STORAGE_KEY = 'gn_applications';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

function isLoggedIn() {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}

// Every status a staff/admin member can move an application through. Kept in
// one place so the customer dashboard, staff dashboard, and admin dashboard
// all render the exact same set of pills.
export const STATUS_OPTIONS = [
  'Pending Review',
  'In Progress',
  'Request More Information',
  'Quote Issued',
  'Completed',
  'Rejected',
  'Application Cancelled',
];

// Sample data shown only when nobody is signed in (e.g. previewing the UI).
// Once a real account logs in, syncApplicationsFromServer() replaces this
// with the account's actual data from MongoDB before the dashboard ever
// renders, so signed-in users never see this seed data.
function getDefaultApplications() {
  const user = getUser() || { firstName: 'Tisha', lastName: 'Sharma', email: 'tisha@example.com' };
  const name = `${user.firstName} ${user.lastName}`;
  return [
    {
      ref: 'APP-1042',
      type: 'New Connection',
      utility: 'Gas',
      applicantName: name,
      applicantEmail: user.email,
      property: '77A Central Avenue',
      postcode: 'EN1 3QF',
      submittedDate: '2026-07-02',
      status: 'In Progress',
      assignedStaff: 'Mike Ross',
      infoRequest: null,
      documents: [],
      notes: [],
      messages: [],
    },
  ];
}

// Used to guarantee uniqueness when a record somehow reaches normalize()
// without a ref (e.g. stale localStorage data from before the backend was
// wired up, or a record that failed to get a server-assigned ref). Without
// this, multiple such records would all fall back to the same `undefined`
// key in any list that renders them, which is what triggers React's
// "Each child in a list should have a unique key" warning.
let fallbackRefCounter = 0;

/** Fill in fields that older/seed records might be missing so every consumer
 *  (customer, staff, admin dashboards) can rely on them always being present.
 *  Also guarantees every record has a non-empty, unique `ref` so components
 *  keying off `app.ref` (e.g. ApplicationsTable) never end up with a
 *  missing/duplicate React key. */
function normalize(app) {
  const ref = app.ref || `LOCAL-${Date.now()}-${fallbackRefCounter++}`;
  return {
    assignedStaff: null,
    messages: [],
    documents: [],
    notes: [],
    infoRequest: null,
    ...app,
    ref,
  };
}

/** Read all applications, seeding localStorage with defaults the first time. */
export function getApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalize);
    }
  } catch {
    // fall through to defaults
  }
  const defaults = isLoggedIn() ? [] : getDefaultApplications();
  saveApplications(defaults);
  return defaults;
}

/** Overwrite the full applications list (local cache only). */
export function saveApplications(applications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    // storage unavailable (e.g. private browsing) — silently ignore
  }
}

/**
 * Pull the signed-in account's applications from MongoDB and replace the
 * local cache with them. Call this right after login (before navigating to
 * a dashboard) so the very first render already shows real account data
 * instead of stale/demo data. Safe to call again any time to refresh.
 */
export async function syncApplicationsFromServer() {
  try {
    const res = await fetchApplications();
    const applications = (res.data.applications || []).map(normalize);
    saveApplications(applications);
    return applications;
  } catch (err) {
    console.warn('Could not sync applications from server:', err.message);
    return getApplications();
  }
}

/**
 * Pull ONE application fresh from the server and reconcile it into the
 * local cache (replacing the matching record, or inserting it if it
 * wasn't in the cache at all). Use this on pages that view a single
 * application — e.g. AdminApplicationView / ApplicationView — so that
 * changes made from a different session (a customer uploading a document,
 * another admin adding a note, etc.) are actually visible instead of only
 * ever showing what THIS browser's local cache already knew about.
 *
 * Falls back to whatever's already in the local cache if the request
 * fails (e.g. offline), same pattern as syncApplicationsFromServer().
 */
export async function refreshApplicationFromServer(ref) {
  try {
    const res = await fetchApplication(ref);
    const fresh = normalize(res.data.application);
    const current = getApplications();
    const exists = current.some((a) => a.ref === fresh.ref);
    const updated = exists
      ? current.map((a) => (a.ref === fresh.ref ? fresh : a))
      : [fresh, ...current];
    saveApplications(updated);
    return fresh;
  } catch (err) {
    console.warn(`Could not refresh application ${ref} from server:`, err.message);
    return getApplicationByRef(ref);
  }
}

/** Work out the next sequential APP-#### reference. */
export function nextReference(applications) {
  const numbers = applications
    .map((a) => parseInt(String(a.ref).replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const max = numbers.length ? Math.max(...numbers) : 1042;
  return `APP-${max + 1}`;
}

/**
 * Create a new application on the backend, then reconcile the local cache
 * with the server's authoritative response (real ref, real timestamps,
 * etc). This is now async and AWAITS the API call — unlike the other
 * mutators below, we can't save optimistically here because the ref itself
 * is assigned by the server (via computeNextReference in the backend
 * controller), so the local cache has nothing valid to write until the
 * response comes back.
 *
 * Returns the created application object (NOT the full list — callers that
 * need the updated list should call getApplications() afterwards).
 * Throws if the save fails, so callers can show a real error instead of
 * silently pretending it worked.
 */
export async function addApplication(newApp) {
  const res = await apiCreateApplication(newApp);
  const created = normalize(res.data.application);

  const current = getApplications();
  saveApplications([created, ...current]);

  return created;
}

/** Look up a single application by its reference. Returns undefined if not found. */
export function getApplicationByRef(ref) {
  return getApplications().find((a) => a.ref === ref);
}

/**
 * Merge changes into the application matching `updatedApp.ref` and persist it.
 * Fields not present on `updatedApp` are left untouched.
 * Returns the updated list.
 */
export function updateApplication(updatedApp) {
  const current = getApplications();
  const updated = current.map((a) =>
    a.ref === updatedApp.ref ? { ...a, ...updatedApp } : a
  );
  saveApplications(updated);
  apiPatchApplication(updatedApp.ref, updatedApp).catch((err) =>
    console.warn('Could not update application on server:', err.message)
  );
  return updated;
}

/**
 * Change an application's reference number. Unlike updateApplication above,
 * this AWAITS the server response before touching the local cache — a
 * rename changes the very key everything else is looked up by (including
 * the URL, e.g. /admin-application/:ref), so the caller needs to know it
 * actually succeeded (and get the confirmed new ref back) before
 * navigating anywhere. Throws on failure so the caller can show the real
 * error (e.g. "that reference is already in use") instead of silently
 * pretending it worked.
 */
export async function renameReference(oldRef, newRef) {
  const res = await apiRenameApplicationRef(oldRef, newRef);
  const fresh = normalize(res.data.application);

  const current = getApplications();
  const updated = current.map((a) => (a.ref === oldRef ? fresh : a));
  saveApplications(updated);

  return fresh;
}

/** Remove an application by reference. Returns the updated list. */
export function deleteApplication(ref) {
  const current = getApplications();
  const updated = current.filter((a) => a.ref !== ref);
  saveApplications(updated);
  apiRemoveApplication(ref).catch((err) =>
    console.warn('Could not delete application on server:', err.message)
  );
  return updated;
}

/* ------------------------------------------------------------------ */
/* Per-application messaging                                          */
/*                                                                     */
/* Every application carries its own `messages` array. Each message   */
/* has a `channel`:                                                   */
/*   - 'customer' — visible to the customer AND staff/admin. This is  */
/*     the thread rendered on the customer's ApplicationView page and */
/*     on the staff/admin application detail page.                    */
/*   - 'internal'  — staff <-> admin notes about the application,     */
/*     never shown to the customer.                                   */
/* ------------------------------------------------------------------ */

/** Append a message to an application's thread and persist it. Returns the updated list. */
export function addMessage(ref, { channel, author, role, text }) {
  const current = getApplications();
  const updated = current.map((a) => {
    if (a.ref !== ref) return a;
    const message = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel,
      author,
      role,
      text,
      time: new Date().toISOString(),
    };
    return { ...a, messages: [...(a.messages || []), message] };
  });
  saveApplications(updated);
  apiPostMessage(ref, { channel, author, role, text }).catch((err) =>
    console.warn('Could not save message to server:', err.message)
  );
  return updated;
}

/** Get just the messages for one application, optionally filtered to a single channel. */
export function getMessages(ref, channel) {
  const app = getApplicationByRef(ref);
  const messages = app?.messages || [];
  return channel ? messages.filter((m) => m.channel === channel) : messages;
}

/* ------------------------------------------------------------------ */
/* Reviewer info requests + application progress tracking             */
/* ------------------------------------------------------------------ */

/** Staff/admin action: put an application on hold and ask the customer a
 *  question. Sets status to 'Request More Information'. Returns the updated list. */
export function requestMoreInfo(ref, question) {
  const current = getApplications();
  const updated = current.map((a) =>
    a.ref === ref
      ? {
          ...a,
          status: 'Request More Information',
          infoRequest: {
            question,
            askedAt: new Date().toISOString(),
            response: null,
            respondedAt: null,
          },
        }
      : a
  );
  saveApplications(updated);
  apiRequestMoreInfo(ref, question).catch((err) =>
    console.warn('Could not save info request to server:', err.message)
  );
  return updated;
}

/** Customer action: answer an open info request. Posts the answer into the
 *  shared 'customer' message thread and moves the application back to
 *  'In Progress'. The request stays attached (with its response) so staff
 *  can see it's "awaiting review" until they clear it. Returns the updated list. */
export function respondToInfoRequest(ref, responseText) {
  const current = getApplications();
  let applicantName = '';
  const updated = current.map((a) => {
    if (a.ref !== ref || !a.infoRequest) return a;
    applicantName = a.applicantName;
    const message = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel: 'customer',
      author: a.applicantName,
      role: 'customer',
      text: responseText,
      time: new Date().toISOString(),
    };
    return {
      ...a,
      status: 'In Progress',
      infoRequest: {
        ...a.infoRequest,
        response: responseText,
        respondedAt: new Date().toISOString(),
      },
      messages: [...(a.messages || []), message],
    };
  });
  saveApplications(updated);
  apiRespondToInfoRequest(ref, responseText, applicantName).catch((err) =>
    console.warn('Could not save info response to server:', err.message)
  );
  return updated;
}

/** Staff/admin action: acknowledge a customer's response and clear the open
 *  info request so the "awaiting review" banner disappears. Returns the updated list. */
export function clearInfoRequest(ref) {
  const current = getApplications();
  const updated = current.map((a) => (a.ref === ref ? { ...a, infoRequest: null } : a));
  saveApplications(updated);
  apiClearInfoRequest(ref).catch((err) =>
    console.warn('Could not clear info request on server:', err.message)
  );
  return updated;
}

/** Customer action: withdraw an application. Returns the updated list. */
export function cancelApplication(ref) {
  const current = getApplications();
  const updated = current.map((a) => {
    if (a.ref !== ref) return a;
    const message = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      channel: 'customer',
      author: 'System',
      role: 'system',
      text: "This application has been cancelled at the applicant's request.",
      time: new Date().toISOString(),
    };
    return { ...a, status: 'Application Cancelled', messages: [...(a.messages || []), message] };
  });
  saveApplications(updated);
  apiCancelApplication(ref).catch((err) =>
    console.warn('Could not cancel application on server:', err.message)
  );
  return updated;
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/*                                                                     */
/* Document metadata AND file content (as a base64 data URL) are both  */
/* persisted to MongoDB via the `data` field. Fine for small/medium    */
/* files; if uploads grow large or frequent, move file storage to      */
/* GridFS or an object store (S3/R2) instead of storing bytes inline.  */
/* ------------------------------------------------------------------ */

/** Add a document's metadata and content to an application. `data` should be
 *  a base64 data URL (e.g. from FileReader.readAsDataURL). Accepts an
 *  optional `id` so the caller can correlate it if needed. Returns the
 *  updated list. */
export function addDocument(ref, { id, name, size, uploadedBy, folder, data }) {
  const current = getApplications();
  if (!current.some((a) => a.ref === ref)) {
    console.warn(
      `addDocument: no local application found with ref "${ref}" — document was not saved to the local cache. ` +
        `This usually means the cache is stale; try syncApplicationsFromServer().`
    );
  }
  const docId = id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const updated = current.map((a) => {
    if (a.ref !== ref) return a;
    const doc = {
      id: docId,
      name,
      size,
      uploadedBy,
      folder: folder || '',
      data: data || '',
      uploadedAt: new Date().toISOString(),
    };
    return { ...a, documents: [...(a.documents || []), doc] };
  });
  saveApplications(updated);
  apiPostDocument(ref, { id: docId, name, size, uploadedBy, folder, data }).catch((err) =>
    console.warn('Could not save document to server:', err.message)
  );
  return updated;
}

/** Remove a document by id from an application. Returns the updated list. */
export function deleteDocument(ref, docId) {
  const current = getApplications();
  const updated = current.map((a) =>
    a.ref === ref ? { ...a, documents: (a.documents || []).filter((d) => d.id !== docId) } : a
  );
  saveApplications(updated);
  apiRemoveDocument(ref, docId).catch((err) =>
    console.warn('Could not delete document on server:', err.message)
  );
  return updated;
}

/* ------------------------------------------------------------------ */
/* Notes                                                                */
/*                                                                     */
/* A general-purpose log shown in the "Application Notes" modal.       */
/* Distinct from `messages` (the direct customer <-> staff chat).      */
/* ------------------------------------------------------------------ */

/** Append a note and persist it. Returns the updated list. */
export function addNote(ref, { author, role, text }) {
  const current = getApplications();
  const updated = current.map((a) => {
    if (a.ref !== ref) return a;
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      role,
      text,
      time: new Date().toISOString(),
    };
    return { ...a, notes: [...(a.notes || []), note] };
  });
  saveApplications(updated);
  apiPostNote(ref, { author, role, text }).catch((err) =>
    console.warn('Could not save note to server:', err.message)
  );
  return updated;
}

/* ------------------------------------------------------------------ */
/* Progress tracker                                                    */
/* ------------------------------------------------------------------ */

const PROGRESS_STAGES = ['Application Received', 'Quote', 'Construction', 'Review'];

const STATUS_PROGRESS = {
  'Pending Review': { percent: 20, stageIndex: 0 },
  'In Progress': { percent: 50, stageIndex: 0 },
  'Request More Information': { percent: 50, stageIndex: 0 },
  'Quote Issued': { percent: 65, stageIndex: 1 },
  Completed: { percent: 100, stageIndex: 3 },
};

/** Returns { percent, stageIndex, stages, cancelled } for the progress panel. */
export function getProgress(status) {
  if (status === 'Rejected' || status === 'Application Cancelled') {
    return {
      percent: 100,
      stageIndex: -1,
      stages: PROGRESS_STAGES.map((label) => ({ label, state: 'skipped' })),
      cancelled: true,
    };
  }
  const { percent, stageIndex } = STATUS_PROGRESS[status] || { percent: 10, stageIndex: 0 };
  const stages = PROGRESS_STAGES.map((label, i) => ({
    label,
    state: i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'upcoming',
  }));
  return { percent, stageIndex, stages, cancelled: false };
}