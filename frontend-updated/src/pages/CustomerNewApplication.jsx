import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Droplet,
  Waves,
  Zap,
  UploadCloud,
  X,
  FileText,
  Check,
  Building2,
  PlusCircle,
  Link2,
  SlidersHorizontal,
  Wrench,
  Gauge,
  Hash,
  PowerOff,
  Lock,
} from 'lucide-react';
import logo from '../assets/logo.png';
import ThemeBackground from '../components/ThemeBackground';
import {
  addApplication,
  addDocument,
  getApplicationByRef,
  updateApplication,
} from '../utils/applicationsStore';
import { getProfile, saveProfile, hasIdentity } from '../utils/customerProfileStore';

// ---------- Utility connection options ----------
const utilityOptions = [
  { key: 'water', label: 'Water', icon: Droplet },
  { key: 'gas', label: 'Gas', icon: Flame },
  { key: 'drainage', label: 'Drainage', icon: Waves },
  { key: 'electric', label: 'Electric', icon: Zap },
];

// ---------- Request type options (shown once a utility is selected) ----------
const requestTypeOptions = [
  { key: 'new', label: 'New Connection', icon: PlusCircle },
  { key: 'existing', label: 'Existing Connection', icon: Link2 },
  { key: 'alteration', label: 'Alteration', icon: SlidersHorizontal },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
  { key: 'metering', label: 'Metering', icon: Gauge },
  { key: 'mpan_mprn', label: 'MPAN/MPRN', icon: Hash },
  { key: 'disconnection', label: 'Disconnection', icon: PowerOff },
];

const WORK_DESCRIPTION_MAX_LENGTH = 2000;
const MAX_DOCUMENTS = 20;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Reads a single File as a base64 data URL. Wrapped in a Promise so
// persistDocuments (below) can await it per-file.
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error(`Could not read file "${file.name}"`));
    reader.readAsDataURL(file);
  });
}

// Small helper to generate a stable id for each picked file so we can
// key/rename/remove it reliably, independent of its (possibly duplicate)
// filename.
function makeFileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// FIX: Files picked in this form only ever lived as in-memory File objects
// (never uploaded anywhere) until the application itself was saved. Once we
// have a real application ref back from the server, we push each file's
// metadata AND content into that application's `documents` array via
// addDocument() — exactly like the "View Documents" modal on
// ApplicationView.jsx does.
//
// `entries` is now an array of { id, file, docName } — docName is the
// customer-facing label (defaults to the filename, editable in the UI) and
// is what gets saved as the document's display name, mirroring the
// "Document type" field on the admin upload modal.
async function persistDocuments(ref, entries, uploadedBy) {
  for (const entry of entries) {
    const { file, docName } = entry;
    try {
      const data = await readFileAsDataURL(file);
      const trimmedName = (docName || '').trim();
      // FIX: previously generated our own `doc-...` id and passed it in.
      // ApplicationView.jsx's own upload flow never does this — it lets
      // addDocument() assign the id itself. Passing a caller-generated id
      // here meant documents added via this form and documents added via
      // "View Documents" were shaped differently, which is the likely
      // reason customer-submitted files weren't reliably showing up in
      // the admin/View Documents list. Now both paths hand addDocument()
      // an identically-shaped record and let it own id assignment.
      addDocument(ref, {
        name: trimmedName || file.name,
        size: formatBytes(file.size),
        uploadedBy,
        folder: trimmedName,
        data,
      });
    } catch (err) {
      // Don't let one unreadable file abort the whole submission — log it
      // and continue with the rest. The application itself has already
      // been created/updated by this point.
      console.warn(`Could not read and save file "${file.name}":`, err.message);
    }
  }
}

// ---------- Single document upload field (max N files total) ----------
// Mirrors the "Upload a document" box on the admin Application Documents
// modal: a Document type text field + a File picker + an explicit Add
// button, with the running list of added documents shown below.
// `entries` is an array of { id, file, docName }.
function DocumentUploadField({ entries, onAddEntry, onRemoveEntry, maxFiles }) {
  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [limitMessage, setLimitMessage] = useState('');
  const fileInputRef = useRef(null);

  const remaining = maxFiles - entries.length;
  const isFull = remaining <= 0;

  const handleFileChange = (e) => {
    setPendingFile(e.target.files?.[0] || null);
  };

  const handleAdd = () => {
    if (!pendingFile) return;
    if (isFull) {
      setLimitMessage(`You've reached the ${maxFiles}-file limit. Remove a file to add more.`);
      return;
    }

    onAddEntry({
      id: makeFileId(),
      file: pendingFile,
      docName: docType.trim() || pendingFile.name,
    });

    setDocType('');
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLimitMessage('');
  };

  return (
    <div className="space-y-5">
      <div className="border border-[#EDEFEF] rounded-lg p-5 bg-white">
        <p className="text-sm font-semibold text-[#1E2422] mb-1">Upload a document</p>
        <p className="text-xs text-[#8A938D] mb-4">
          Up to 20MB per file · {Math.max(remaining, 0)} of {maxFiles} remaining
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
              Document type
            </label>
            <input
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="e.g. Site plan"
              disabled={isFull}
              className="w-full bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB] disabled:bg-[#F7F8F6] disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#525F58] mb-1.5">File</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              disabled={isFull}
              className="w-full text-sm text-[#525F58] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-[#CBD0CA] file:bg-white file:text-sm file:font-medium file:text-[#525F58] hover:file:border-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!pendingFile || isFull}
          className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2 px-4 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <UploadCloud size={14} />
          {isFull ? 'File limit reached' : 'Add file'}
        </button>

        {limitMessage && <p className="text-xs text-[#B5651D] mt-2">{limitMessage}</p>}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1E2422]">
          Total Documents: {entries.length}
        </p>
        {entries.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B5D45] bg-[#E4EAE1] px-2.5 py-1 rounded-full">
            <Check size={12} />
            {entries.length}/{maxFiles}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[#8A938D] py-4 text-center bg-[#F7F8F6] rounded-lg">
          No documents attached yet.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-[#EDEFEF] rounded-lg px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={15} className="text-[#8A938D] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1E2422] truncate">{entry.docName}</p>
                  <p className="text-xs text-[#8A938D] truncate">
                    {entry.file.name} · {formatBytes(entry.file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-[#CBD0CA] rounded-md px-3 py-1.5 hover:border-red-500 transition shrink-0"
              >
                <X size={13} />
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Small helper for the locked (read-only) identity inputs on the "Your
// Details" section, so a returning customer sees their saved name/email
// instead of a blank form.
function LockedInput({ label, value, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          readOnly
          className="w-full bg-[#F7F8F6] border border-[#CBD0CA] rounded-md pl-4 pr-9 py-2.5 text-sm text-[#525F58] cursor-not-allowed"
        />
        <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A938D]" />
      </div>
    </div>
  );
}

export default function CustomerNewApplication() {
  const navigate = useNavigate();
  const { ref } = useParams(); // present only on the /applications/:ref/edit route
  const isEditMode = Boolean(ref);

  const [form, setForm] = useState(() => {
    const profile = getProfile();
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      companyName: profile.companyName,
      companyPropertyNumber: profile.companyPropertyNumber,
      companyStreetName: profile.companyStreetName,
      companyTown: profile.companyTown,
      companyPostcode: profile.companyPostcode,
      companyNumber: profile.companyNumber,
      propertyNumber: profile.propertyNumber,
      streetName: profile.streetName,
      town: profile.town,
      postcode: profile.postcode,
      workDescription: '',
    };
  });

  const [lockedFromProfile] = useState(() => !isEditMode && hasIdentity(getProfile()));

  const [selectedUtilities, setSelectedUtilities] = useState([]);
  const [requestType, setRequestType] = useState('');

  // Each entry: { id, file, docName }. docName is the customer-editable
  // display name for the document (defaults to the picked filename).
  const [documents, setDocuments] = useState([]);

  // FIX: this now reflects the REAL number of document records already
  // attached to the application (existing.documents.length), not the old
  // existing.documentCount field — which could drift from reality since
  // nothing ever kept it in sync with the actual documents array.
  const [existingDocumentCount, setExistingDocumentCount] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // FIX: track the real, server-assigned reference for a brand-new
  // application, since we no longer invent one on the frontend. Only used
  // for the success screen.
  const [createdRef, setCreatedRef] = useState(null);

  // FIX: submission state + error message, so a failed save is visible to
  // the customer instead of silently failing while the UI acts like it
  // succeeded.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // In edit mode, load the existing application and prefill the form.
  useEffect(() => {
    if (!isEditMode) return;

    const existing = getApplicationByRef(ref);
    if (!existing) {
      setNotFound(true);
      return;
    }

    const [firstName = '', ...rest] = (existing.applicantName || '').split(' ');
    const lastName = rest.join(' ');

    setForm({
      firstName,
      lastName,
      email: existing.applicantEmail || '',
      phone: existing.phone || '',
      companyName: existing.companyName || '',
      companyPropertyNumber: existing.companyPropertyNumber || '',
      companyStreetName: existing.companyStreetName || '',
      companyTown: existing.companyTown || '',
      companyPostcode: existing.companyPostcode || '',
      companyNumber: existing.companyNumber || '',
      propertyNumber: existing.propertyNumber || '',
      streetName: existing.streetName || existing.property || '',
      town: existing.town || '',
      postcode: existing.postcode || '',
      workDescription: existing.workDescription || '',
    });

    const utilityKeys = (existing.utility || '')
      .split('/')
      .map((label) => label.trim())
      .map((label) => utilityOptions.find((u) => u.label === label)?.key)
      .filter(Boolean);
    setSelectedUtilities(utilityKeys);

    const matchedType = requestTypeOptions.find((r) => r.label === existing.type);
    setRequestType(matchedType?.key || '');

    // FIX: derive from the real documents array instead of the old,
    // possibly-out-of-sync documentCount number.
    setExistingDocumentCount((existing.documents || []).length);
  }, [isEditMode, ref]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleUtility = (key) => {
    setSelectedUtilities((prev) =>
      prev.includes(key) ? prev.filter((u) => u !== key) : [...prev, key]
    );
  };

  const addEntry = (entry) => {
    setDocuments((prev) => [...prev, entry]);
  };

  const removeEntry = (id) => {
    setDocuments((prev) => prev.filter((entry) => entry.id !== id));
  };

  const totalDocuments = documents.length + existingDocumentCount;

  const isValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    form.propertyNumber.trim() &&
    form.streetName.trim() &&
    form.town.trim() &&
    form.postcode.trim() &&
    selectedUtilities.length > 0 &&
    requestType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setSubmitError('');

    const utilityLabels = utilityOptions
      .filter((u) => selectedUtilities.includes(u.key))
      .map((u) => u.label)
      .join(' / ');

    const requestTypeLabel =
      requestTypeOptions.find((r) => r.key === requestType)?.label || 'New Connection';

    const applicantName = `${form.firstName} ${form.lastName}`.trim();

    const sharedFields = {
      type: requestTypeLabel,
      utility: utilityLabels,
      applicantName,
      applicantEmail: form.email,
      phone: form.phone,
      companyName: form.companyName,
      companyPropertyNumber: form.companyPropertyNumber,
      companyStreetName: form.companyStreetName,
      companyTown: form.companyTown,
      companyAddress: `${form.companyPropertyNumber} ${form.companyStreetName}, ${form.companyTown}`.trim(),
      companyPostcode: form.companyPostcode,
      companyNumber: form.companyNumber,
      propertyNumber: form.propertyNumber,
      streetName: form.streetName,
      town: form.town,
      property: `${form.propertyNumber} ${form.streetName}, ${form.town}`.trim(),
      postcode: form.postcode,
      workDescription: form.workDescription,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        updateApplication({ ref, ...sharedFields });

        // FIX: newly added files in edit mode were previously never
        // persisted anywhere — only counted. Push each one's metadata AND
        // content (plus the customer-chosen name) now that we know the
        // application's real ref. Awaited so the "submitted" screen doesn't
        // appear until files have actually finished being read and saved.
        await persistDocuments(ref, documents, applicantName);
      } else {
        // FIX: no `ref` is sent here anymore — the backend generates the
        // authoritative next reference (see computeNextReference in
        // applicationController.js) and hands it back in the response.
        // addApplication() is now async and throws if the save fails, so we
        // can surface a real error instead of pretending it worked.
        const created = await addApplication({
          ...sharedFields,
          submittedDate: new Date().toISOString().slice(0, 10),
          status: 'Pending Review',
          notesCount: 0,
        });

        setCreatedRef(created?.ref || null);

        // FIX: persist the actually-uploaded files (with real content and
        // customer-chosen names, not just metadata) against the real,
        // server-assigned ref. Awaited so we don't show "submitted" until
        // the reads/saves are done.
        if (created?.ref) {
          await persistDocuments(created.ref, documents, applicantName);
        }

        // Remember these details for next time, pre-filling the following
        // application. Only for brand-new applications.
        saveProfile({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          companyName: form.companyName,
          companyNumber: form.companyNumber,
          companyPropertyNumber: form.companyPropertyNumber,
          companyStreetName: form.companyStreetName,
          companyTown: form.companyTown,
          companyPostcode: form.companyPostcode,
          propertyNumber: form.propertyNumber,
          streetName: form.streetName,
          town: form.town,
          postcode: form.postcode,
        });
      }

      setSubmitted(true);
    } catch (err) {
      // FIX: previously a failed save was swallowed silently (just a
      // console.warn) and the UI showed "Application submitted" regardless.
      // Now the customer actually sees that it failed and can try again.
      console.error('Failed to submit application:', err);
      setSubmitError(
        err?.response?.data?.message ||
          'Something went wrong submitting your application. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center relative px-6">
        <ThemeBackground />
        <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-[#1E2422] mb-2">
            Application not found
          </h1>
          <p className="text-sm text-[#525F58] mb-8">
            We couldn't find an application with reference {ref}. It may have been deleted.
          </p>
          <button
            onClick={() => navigate('/customer-dashboard')}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2.5 rounded-md transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center relative px-6">
        <ThemeBackground />
        <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#E4EAE1] flex items-center justify-center mx-auto mb-5">
            <Check size={26} className="text-[#4B5D45]" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#1E2422] mb-2">
            {isEditMode ? 'Application updated' : 'Application submitted'}
          </h1>
          <p className="text-sm text-[#525F58] mb-8">
            {isEditMode ? (
              <>Thanks, {form.firstName}. Your changes to {ref} have been saved.</>
            ) : (
              <>
                Thanks, {form.firstName}. We've received your details
                {totalDocuments > 0 ? ` and ${totalDocuments} document${totalDocuments === 1 ? '' : 's'}` : ''}
                {createdRef ? <> — your reference is <strong>{createdRef}</strong></> : ''}.
                Our team will review your application and be in touch by email.
              </>
            )}
          </p>
          <button
            onClick={() => navigate('/customer-dashboard')}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2.5 rounded-md transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      <ThemeBackground />
      <main className="flex-1 py-10 px-6 sm:px-10">
        <div className="max-w-[820px] mx-auto">
          <div className="flex items-center gap-2.5 mb-5">
            <img src={logo} alt="Meter Express" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-semibold text-[#1E2422]">Meter Express</span>
          </div>

          <Link
            to="/customer-dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#525F58] hover:text-[#2563EB] transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-1">
            {isEditMode ? `Edit Application ${ref}` : 'New Application'}
          </h1>
          <p className="text-sm text-[#525F58] mb-8">
            {isEditMode
              ? 'Update your details below. Changes are saved when you submit.'
              : 'Tell us about you, your site, and the connection you need. You can attach supporting documents at the bottom of the form.'}
          </p>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-6">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ---------------- Applicant Details ---------------- */}
            <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-5">
                Your Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {lockedFromProfile ? (
                  <>
                    <LockedInput label="First name" value={form.firstName} />
                    <LockedInput label="Last name" value={form.lastName} />
                    <LockedInput label="Email address" value={form.email} type="email" />
                    <LockedInput label="Contact number" value={form.phone} type="tel" />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                        First name
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        placeholder="e.g. Tisha"
                        className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                        Last name
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        placeholder="e.g. Sharma"
                        className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                        Email address
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                        Contact number
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        placeholder="07123 456789"
                        className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              {lockedFromProfile && (
                <p className="text-xs text-[#8A938D] mt-3">
                  These details come from your account.{' '}
                  <Link to="/customer-dashboard" className="text-[#2563EB] font-semibold hover:underline">
                    Update them in Profile
                  </Link>{' '}
                  if anything's changed.
                </p>
              )}

              <div className="flex items-center gap-2 mt-6 mb-4">
                <Building2 size={16} className="text-[#8A938D]" />
                <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide">
                  Company details (if applying on behalf of a business)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Company name
                  </label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    placeholder="e.g. BuildCo Ltd"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Company number
                  </label>
                  <input
                    type="text"
                    value={form.companyNumber}
                    onChange={(e) => updateField('companyNumber', e.target.value)}
                    placeholder="e.g. 01234567"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Property number
                  </label>
                  <input
                    type="text"
                    value={form.companyPropertyNumber}
                    onChange={(e) => updateField('companyPropertyNumber', e.target.value)}
                    placeholder="e.g. Unit 4"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Street name
                  </label>
                  <input
                    type="text"
                    value={form.companyStreetName}
                    onChange={(e) => updateField('companyStreetName', e.target.value)}
                    placeholder="e.g. Riverside Estate"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Town
                  </label>
                  <input
                    type="text"
                    value={form.companyTown}
                    onChange={(e) => updateField('companyTown', e.target.value)}
                    placeholder="e.g. London"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={form.companyPostcode}
                    onChange={(e) => updateField('companyPostcode', e.target.value)}
                    placeholder="e.g. SE1 9GF"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </section>

            {/* ---------------- Site Address ---------------- */}
            <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-1">
                Site Address
              </h2>
              <p className="text-xs text-[#8A938D] mb-5">
                {lockedFromProfile
                  ? "Pre-filled from your last application — change it below if this one is for a different property."
                  : 'Where the connection or work will take place.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Property number
                  </label>
                  <input
                    type="text"
                    value={form.propertyNumber}
                    onChange={(e) => updateField('propertyNumber', e.target.value)}
                    placeholder="e.g. 77A"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Street name
                  </label>
                  <input
                    type="text"
                    value={form.streetName}
                    onChange={(e) => updateField('streetName', e.target.value)}
                    placeholder="e.g. Central Avenue"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Town
                  </label>
                  <input
                    type="text"
                    value={form.town}
                    onChange={(e) => updateField('town', e.target.value)}
                    placeholder="e.g. Enfield"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                    Postcode
                  </label>
                  <input
                    type="text"
                    value={form.postcode}
                    onChange={(e) => updateField('postcode', e.target.value)}
                    placeholder="e.g. EN1 3QF"
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>
            </section>

            {/* ---------------- Utility Connection ---------------- */}
            <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-1">
                Utility Connection
              </h2>
              <p className="text-xs text-[#8A938D] mb-5">Select all that apply to this application.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {utilityOptions.map((u) => {
                  const Icon = u.icon;
                  const isSelected = selectedUtilities.includes(u.key);
                  return (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => toggleUtility(u.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#DCE6F5]/50 text-[#2C5A9A]'
                          : 'border-[#CBD0CA] text-[#525F58] hover:border-[#2563EB]'
                      }`}
                    >
                      <Icon size={20} className={isSelected ? 'text-[#2563EB]' : 'text-[#8A938D]'} />
                      {u.label}
                    </button>
                  );
                })}
              </div>
              {selectedUtilities.length === 0 && (
                <p className="text-xs text-[#B5651D] mt-3">Select at least one utility connection.</p>
              )}
            </section>

            {/* ---------------- Request Type ---------------- */}
            {selectedUtilities.length > 0 && (
              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-1">
                  Request Type
                </h2>
                <p className="text-xs text-[#8A938D] mb-5">
                  What kind of work do you need for this application?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {requestTypeOptions.map((r) => {
                    const Icon = r.icon;
                    const isSelected = requestType === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRequestType(r.key)}
                        className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#DCE6F5]/50 text-[#2C5A9A]'
                            : 'border-[#CBD0CA] text-[#525F58] hover:border-[#2563EB]'
                        }`}
                      >
                        <Icon size={20} className={isSelected ? 'text-[#2563EB]' : 'text-[#8A938D]'} />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {!requestType && (
                  <p className="text-xs text-[#B5651D] mt-3">Select a request type.</p>
                )}
              </section>
            )}

            {/* ---------------- Work Description ---------------- */}
            {selectedUtilities.length > 0 && (
              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-1">
                  Work Description
                </h2>
                <p className="text-xs text-[#8A938D] mb-5">
                  Tell us more about the job — what needs to be done, any relevant context, and
                  anything our team should know before reviewing your application.
                </p>
                <textarea
                  value={form.workDescription}
                  onChange={(e) =>
                    updateField('workDescription', e.target.value.slice(0, WORK_DESCRIPTION_MAX_LENGTH))
                  }
                  placeholder="e.g. We're building a two-storey extension and need a new water and electric connection routed from the main road to the property boundary..."
                  rows={5}
                  maxLength={WORK_DESCRIPTION_MAX_LENGTH}
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB] resize-none"
                />
                <p className="text-xs text-[#8A938D] mt-1.5 text-right">
                  {form.workDescription.length}/{WORK_DESCRIPTION_MAX_LENGTH}
                </p>
              </section>
            )}

            {/* ---------------- Documents ---------------- */}
            <section>
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-display text-lg font-semibold text-[#1E2422]">
                  Supporting Documents
                </h2>
                {totalDocuments > 0 && (
                  <span className="text-xs font-semibold text-[#525F58]">
                    {totalDocuments} file{totalDocuments === 1 ? '' : 's'} attached
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A938D] mb-5">
                Optional — add meter photos, certificates, designs, site pictures, or anything
                else relevant. Give each file a name so our team knows what it is. Up to{' '}
                {MAX_DOCUMENTS} files total.
              </p>

              {isEditMode && existingDocumentCount > 0 && (
                <p className="text-xs text-[#525F58] bg-[#F7F8F6] rounded-lg px-4 py-2.5 mb-4">
                  {existingDocumentCount} document{existingDocumentCount === 1 ? '' : 's'} already
                  on file from your original submission. Files you add below will be included in
                  addition to those.
                </p>
              )}

              <DocumentUploadField
                entries={documents}
                onAddEntry={addEntry}
                onRemoveEntry={removeEntry}
                maxFiles={Math.max(MAX_DOCUMENTS - existingDocumentCount, 0)}
              />
            </section>

            {/* ---------------- Submit ---------------- */}
            <div className="flex items-center justify-end gap-3 pt-2 pb-10">
              {!isValid && (
                <p className="text-xs text-[#B5651D] mr-auto">
                  {!(form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim())
                    ? 'Some contact details are missing — please check them in Profile.'
                    : selectedUtilities.length === 0
                    ? 'Select at least one utility connection.'
                    : !requestType
                    ? 'Select a request type.'
                    : 'Please fill in all required site address fields.'}
                </p>
              )}
              <Link
                to="/customer-dashboard"
                className="text-sm font-semibold text-[#525F58] hover:text-[#1E2422] px-5 py-2.5 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-[#CBD0CA] disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 px-6 rounded-md transition"
              >
                {isSubmitting
                  ? 'Submitting...'
                  : isEditMode
                  ? 'Save changes'
                  : 'Submit application'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}