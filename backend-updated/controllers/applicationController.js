const Application = require('../models/Application');
const {
  sendApplicationSubmittedToCustomer,
  sendNewApplicationToAdmin,
  sendStatusUpdateToCustomer,
  sendNewMessageNotification,
} = require('../services/emailService');

const genId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Work out the next reference in the form MEL-YYMM##, e.g. MEL-260801.
 *  - MEL  = fixed company prefix
 *  - YY   = current year, 2 digits
 *  - MM   = current month, 2 digits (01-12)
 *  - ##   = sequence number *within that month*, starting at 01
 *
 * The sequence resets automatically whenever the month/year changes,
 * because it's derived by looking only at existing refs that already
 * start with the current MEL-YYMM prefix — once the month rolls over,
 * nothing matches the new prefix yet, so numbering starts fresh at 01.
 */
async function computeNextReference() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `MEL-${yy}${mm}`;

  // Only pull refs for the current month/year — a simple regex match on
  // the prefix, done in Mongo rather than in JS, so this stays cheap even
  // as the applications collection grows.
  const apps = await Application.find(
    { ref: { $regex: `^${prefix}\\d{2}$` } },
    { ref: 1 }
  ).lean();

  const sequences = apps
    .map((a) => parseInt(String(a.ref).slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const nextSeq = (sequences.length ? Math.max(...sequences) : 0) + 1;

  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
}

// GET /api/applications
// Customers only see their own applications; Admin/Staff see everything.
exports.getApplications = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'Customer') {
      filter.$or = [{ owner: req.user.id }, { applicantEmail: req.user.email }];
    }
    const apps = await Application.find(filter).sort({ createdAt: -1 });
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/:ref
exports.getApplicationByRef = async (req, res) => {
  try {
    const app = await Application.findOne({ ref: req.params.ref });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications
exports.createApplication = async (req, res) => {
  try {
    const ref = req.body.ref || (await computeNextReference());
    const app = await Application.create({
      ...req.body,
      ref,
      owner: req.user.id,
      applicantEmail: req.body.applicantEmail || req.user.email,
    });

    res.status(201).json({ application: app, applications: await allFor(req) });

    // Fire-and-forget: respond to the customer first, then send the
    // confirmation + admin alert emails. A slow/failed email should never
    // delay or break the actual application submission.
    Promise.all([
      sendApplicationSubmittedToCustomer(app),
      sendNewApplicationToAdmin(app),
    ]).catch((err) => console.error('Post-submit emails failed:', err));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'An application with that reference already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/applications/:ref  — merge/patch update
exports.updateApplication = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.ref;
    delete updates._id;

    const previous = await Application.findOne({ ref: req.params.ref }, { status: 1 }).lean();

    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $set: updates },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });

    res.json({ application: app, applications: await allFor(req) });

    // Only email the customer if the status actually changed (this route
    // also handles other field edits, so don't fire on every save).
    if (updates.status && previous && updates.status !== previous.status) {
      sendStatusUpdateToCustomer(app, updates.status).catch((err) =>
        console.error('Status-update email failed:', err)
      );
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/applications/:ref/reference — change an application's reference
// number. Kept as its own endpoint (separate from the general PUT /:ref)
// because renaming the ref means renaming the very field used to look the
// document up, and it needs its own uniqueness + role checks rather than
// being silently allowed through the generic patch endpoint (which
// deliberately strips `ref` out of updates above, on purpose).
exports.renameApplicationReference = async (req, res) => {
  try {
    if (req.user.role === 'Customer') {
      return res.status(403).json({ message: 'You are not authorized to change the reference number' });
    }

    const newRef = (req.body.ref || '').trim();
    if (!newRef) {
      return res.status(400).json({ message: 'New reference number is required' });
    }

    const oldRef = req.params.ref;
    if (newRef === oldRef) {
      const unchanged = await Application.findOne({ ref: oldRef });
      if (!unchanged) return res.status(404).json({ message: 'Application not found' });
      return res.json({ application: unchanged, applications: await allFor(req) });
    }

    const clash = await Application.findOne({ ref: newRef });
    if (clash) {
      return res.status(400).json({ message: `Reference "${newRef}" is already in use` });
    }

    const app = await Application.findOneAndUpdate(
      { ref: oldRef },
      { $set: { ref: newRef } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });

    res.json({ application: app, applications: await allFor(req) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That reference number is already in use' });
    }
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/applications/:ref
// Customers are not permitted to delete applications — only Admin/Staff.
// This check has to live here (not just be hidden in the UI), otherwise a
// customer could still call this endpoint directly with a valid token,
// even with the delete button removed from CustomerDashboard.jsx.
exports.deleteApplication = async (req, res) => {
  try {
    if (req.user.role === 'Customer') {
      return res.status(403).json({ message: 'You are not authorized to delete applications' });
    }

    const app = await Application.findOneAndDelete({ ref: req.params.ref });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ applications: await allFor(req) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/messages
exports.addMessage = async (req, res) => {
  try {
    const { channel, author, role, text } = req.body;
    const message = { id: genId('m'), channel, author, role, text, time: new Date() };
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $push: { messages: message } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });

    res.json({ application: app });

    // Notify whichever side DIDN'T send this message.
    if (channel === 'customer') {
      if (role === 'staff') {
        sendNewMessageNotification({
          to: app.applicantEmail,
          subject: `New message on your application ${app.ref}`,
          recipientName: app.applicantName,
          ref: app.ref,
          senderLabel: 'Meter Express staff',
          messageText: text,
          viewUrl: `${process.env.APP_URL}/track/${app.ref}`,
        }).catch((err) => console.error('New-message email (to customer) failed:', err));
      } else if (role === 'customer') {
        sendNewMessageNotification({
          to: process.env.ADMIN_NOTIFICATION_EMAIL,
          subject: `New customer message — ${app.ref}`,
          recipientName: 'Admin',
          ref: app.ref,
          senderLabel: app.applicantName,
          messageText: text,
          viewUrl: `${process.env.APP_URL}/admin-application/${app.ref}`,
        }).catch((err) => console.error('New-message email (to admin) failed:', err));
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/notes
exports.addNote = async (req, res) => {
  try {
    const { author, role, text } = req.body;
    const note = { id: genId('note'), author, role, text, time: new Date() };
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $push: { notes: note } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/documents
exports.addDocument = async (req, res) => {
  try {
    const { id, name, size, uploadedBy, folder, data } = req.body;
    const doc = {
      id: id || genId('doc'),
      name,
      size,
      uploadedBy,
      folder: folder || '',
      // Base64 data URL of the file content — see DocumentSchema in
      // models/Application.js. Falls back to '' if the caller didn't
      // send any (e.g. an older client), so existing calls don't break.
      data: data || '',
      uploadedAt: new Date(),
    };
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $push: { documents: doc } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/applications/:ref/documents/:docId
exports.deleteDocument = async (req, res) => {
  try {
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $pull: { documents: { id: req.params.docId } } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/request-info  (staff/admin)
exports.requestMoreInfo = async (req, res) => {
  try {
    const { question } = req.body;
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      {
        $set: {
          status: 'Request More Information',
          infoRequest: { question, askedAt: new Date(), response: null, respondedAt: null },
        },
      },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });

    res.json({ application: app });

    // This sets status directly (not via updateApplication), so it needs
    // its own email trigger rather than relying on the status-diff check
    // in updateApplication.
    sendStatusUpdateToCustomer(app, 'Request More Information').catch((err) =>
      console.error('Request-info email failed:', err)
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/respond-info  (customer)
exports.respondToInfoRequest = async (req, res) => {
  try {
    const { responseText, applicantName } = req.body;
    const app = await Application.findOne({ ref: req.params.ref });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (!app.infoRequest) return res.status(400).json({ message: 'No open information request' });

    app.status = 'In Progress';
    app.infoRequest.response = responseText;
    app.infoRequest.respondedAt = new Date();
    app.messages.push({
      id: genId('m'),
      channel: 'customer',
      author: applicantName || app.applicantName,
      role: 'customer',
      text: responseText,
      time: new Date(),
    });
    await app.save();

    res.json({ application: app });

    // Customer responded to an info request — let admin know, same as
    // any other incoming customer message.
    sendNewMessageNotification({
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `Info request response — ${app.ref}`,
      recipientName: 'Admin',
      ref: app.ref,
      senderLabel: app.applicantName,
      messageText: responseText,
      viewUrl: `${process.env.APP_URL}/admin-application/${app.ref}`,
    }).catch((err) => console.error('Info-response email failed:', err));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/clear-info  (staff/admin)
exports.clearInfoRequest = async (req, res) => {
  try {
    const app = await Application.findOneAndUpdate(
      { ref: req.params.ref },
      { $set: { infoRequest: null } },
      { new: true }
    );
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/:ref/cancel  (customer)
exports.cancelApplication = async (req, res) => {
  try {
    const app = await Application.findOne({ ref: req.params.ref });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    app.status = 'Application Cancelled';
    app.messages.push({
      id: genId('m'),
      channel: 'customer',
      author: 'System',
      role: 'system',
      text: "This application has been cancelled at the applicant's request.",
      time: new Date(),
    });
    await app.save();

    res.json({ application: app });

    sendNewMessageNotification({
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject: `Application cancelled — ${app.ref}`,
      recipientName: 'Admin',
      ref: app.ref,
      senderLabel: app.applicantName,
      messageText: "This application has been cancelled at the applicant's request.",
      viewUrl: `${process.env.APP_URL}/admin-application/${app.ref}`,
    }).catch((err) => console.error('Cancellation email failed:', err));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper used to return a fresh, role-scoped list alongside single-record
// mutation responses, so the frontend cache can be updated in one round trip.
async function allFor(req) {
  const filter = {};
  if (req.user.role === 'Customer') {
    filter.$or = [{ owner: req.user.id }, { applicantEmail: req.user.email }];
  }
  return Application.find(filter).sort({ createdAt: -1 });
}