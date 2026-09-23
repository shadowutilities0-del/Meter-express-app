import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Eye,
  FolderOpen,
  Download,
  Bell,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Clock,
  FileUp,
  ChevronRight,
} from 'lucide-react';
import ThemeBackground from '../components/ThemeBackground';
import Modal from '../components/Modal';
import {
  getApplicationByRef,
  respondToInfoRequest,
  cancelApplication,
  addDocument,
  addNote,
  getProgress,
} from '../utils/applicationsStore';

const statusStyles = {
  'In Progress': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Pending Review': 'bg-[#FBEBC7] text-[#8A6D1F]',
  'Request More Information': 'bg-[#FBEBC7] text-[#8A6D1F]',
  Completed: 'bg-[#E4EAE1] text-[#4B5D45]',
  'Quote Issued': 'bg-[#DCE6F5] text-[#3C5A85]',
  'Application Cancelled': 'bg-red-50 text-red-600',
  Rejected: 'bg-red-50 text-red-600',
};

const NON_CANCELLABLE = ['Completed', 'Rejected', 'Application Cancelled'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${
        statusStyles[status] || 'bg-[#EDEFEF] text-[#525F58]'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-[#1E2422]">
        {value?.toString().trim() ? value : '—'}
      </p>
    </div>
  );
}

export default function ApplicationView() {
  const navigate = useNavigate();
  const { ref } = useParams();
  const [app, setApp] = useState(() => getApplicationByRef(ref));
  const [responseText, setResponseText] = useState('');
  const [showHoldInfo, setShowHoldInfo] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [openSection, setOpenSection] = useState('details');

  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [noteText, setNoteText] = useState('');

  const user = JSON.parse(localStorage.getItem('user')) || {
    firstName: 'Customer',
    lastName: '',
  };

  const customerName =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer';

  useEffect(() => {
    setApp(getApplicationByRef(ref));
  }, [ref]);

  const refreshApp = () => setApp(getApplicationByRef(ref));

  const handleSubmitResponse = () => {
    if (!responseText.trim()) return;
    respondToInfoRequest(ref, responseText.trim());
    refreshApp();
    setResponseText('');
  };

  const handleCancel = () => {
    const confirmed = window.confirm(
      `Cancel application ${ref}? This cannot be undone.`
    );
    if (!confirmed) return;
    cancelApplication(ref);
    refreshApp();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleFileChange = (e) => {
    setPendingFile(e.target.files?.[0] || null);
  };

  const handleUpload = () => {
    if (!pendingFile) return;

    setUploading(true);

    // FIX: the "Document type" field the customer types (e.g. "Site plan",
    // "Drawings") is what should show up as the document's name in the
    // list below — previously it was only saved into `folder` and thrown
    // away, so every upload displayed the raw filename instead. Now the
    // typed name is used first, falling back to the filename if the field
    // is left blank.
    const trimmedDocType = docType.trim();

    // Read the file into a base64 data URL so it can be persisted
    // (via addDocument -> the backend -> MongoDB) instead of only living
    // in this tab's memory. That's what makes it downloadable later, from
    // this session or any other.
    const reader = new FileReader();

    reader.onload = () => {
      addDocument(ref, {
        name: trimmedDocType || pendingFile.name,
        size: formatBytes(pendingFile.size),
        uploadedBy: customerName,
        folder: trimmedDocType,
        data: reader.result,
      });

      refreshApp();
      setPendingFile(null);
      setDocType('');
      setUploading(false);
    };

    reader.onerror = () => {
      alert('Could not read that file — please try again.');
      setUploading(false);
    };

    reader.readAsDataURL(pendingFile);
  };

  const handleDownloadDoc = (doc) => {
    if (!doc.data) {
      alert(
        'This document has no stored content and cannot be downloaded. ' +
          'It may have been uploaded before file content was saved — try uploading it again.'
      );
      return;
    }

    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;

    addNote(ref, {
      author: customerName,
      role: 'customer',
      text: noteText.trim(),
    });

    refreshApp();
    setNoteText('');
  };

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center relative px-6">
        <ThemeBackground />

        <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-[#1E2422] mb-2">
            Application not found
          </h1>

          <p className="text-sm text-[#525F58] mb-8">
            We couldn't find an application with reference {ref}. It may have
            been deleted.
          </p>

          <button
            onClick={() => navigate('/customer-dashboard')}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2.5 rounded-md transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const progress = getProgress(app.status);
  const isOnHold = app.status === 'Request More Information';
  const hasOpenInfoRequest = !!app.infoRequest && !app.infoRequest.response;
  const awaitingReview = !!app.infoRequest?.response;
  const isCancellable = !NON_CANCELLABLE.includes(app.status);
  const documents = app.documents || [];
  const notes = app.notes || [];

  // Combined, time-sorted feed for the "Updates" section: notes (including
  // the automatic "Status changed to ..." system notes added by the
  // backend) plus document uploads, newest first. This is what makes every
  // kind of activity on the application — status changes, staff/customer
  // notes, and new document uploads — show up in one place instead of only
  // showing notes.
  const updates = [
    ...notes.map((n) => ({
      id: n.id,
      time: n.time,
      kind: n.role === 'system' ? 'status' : 'note',
      text: n.text,
      author: n.author,
    })),
    ...documents.map((d) => ({
      id: `doc-${d.id}`,
      time: d.uploadedAt,
      kind: 'document',
      text: `Uploaded document "${d.name}"`,
      author: d.uploadedBy,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="min-h-screen flex relative">
      <ThemeBackground />

      <main className="flex-1 py-10 px-6 sm:px-10">
        <div className="max-w-[1100px] mx-auto">

          {/* ONLY CHANGE: Logo + Company Name */}
          <div className="flex items-center gap-5 mb-5">
            <img
              src={logo}
              alt="Meter Express"
              className="h-24 w-24 object-contain"
            />

            <span className="font-display text-3xl font-bold text-[#1E2422]">
              Meter Express
            </span>
          </div>

          <Link
            to="/customer-dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#525F58] hover:text-[#3B82F6] transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide">
                  Reference
                </span>

                <StatusPill status={app.status} />
              </div>

              <h1 className="font-display text-[40px] leading-none font-bold text-[#3B82F6]">
                {app.ref}
              </h1>

              <p className="text-sm text-[#525F58] mt-2">
                {app.type} — {app.utility}
              </p>
            </div>

            <Link
              to={`/applications/${app.ref}/edit`}
              className="shrink-0 inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2.5 px-5 rounded-md transition"
            >
              <Pencil size={15} />
              Edit
            </Link>
          </div>

          {isOnHold && (
            <div className="flex items-start gap-3 bg-[#FBEBC7]/50 border border-[#F0D28A] rounded-xl px-5 py-4 mb-6">
              <AlertTriangle
                size={18}
                className="text-[#8A6D1F] mt-0.5 shrink-0"
              />

              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1E2422]">
                  Your application has been placed on hold
                </p>

                {app.infoRequest?.question && (
                  <p className="text-sm text-[#6B5A1F] mt-0.5">
                    Reason: {app.infoRequest.question}
                  </p>
                )}

                <p className="text-sm text-[#6B5A1F] mt-0.5">
                  There may be something we need from you before we can proceed.
                  Please check for any messages or requests below.
                </p>

                <button
                  type="button"
                  onClick={() => setShowHoldInfo((v) => !v)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#8A6D1F] mt-3 hover:underline"
                >
                  What does this mean?
                  {showHoldInfo ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>

                {showHoldInfo && (
                  <p className="text-sm text-[#6B5A1F] mt-2 max-w-lg">
                    We've paused processing your application while we wait for
                    the information requested below. Once you respond, our team
                    will pick it back up — you don't need to resubmit the whole
                    form.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">
                      Job Details
                    </p>

                    <p className="text-sm font-medium text-[#1E2422]">
                      {app.type || '—'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#EDEFEF]">
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">
                      New Connection
                    </p>

                    <p className="text-sm font-medium text-[#1E2422]">
                      {app.utility || '—'}
                    </p>
                  </div>
                </div>
              </section>

              {hasOpenInfoRequest && (
                <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="bg-[#FBEBC7]/40 px-6 py-4 border-b border-[#F0D28A]">
                    <p className="text-sm font-semibold text-[#1E2422]">
                      Additional Information Required
                    </p>

                    <p className="text-sm text-[#525F58] mt-0.5">
                      The reviewer has requested additional information. Please
                      read the question below and provide your response.
                    </p>
                  </div>

                  <div className="p-6">
                    <div className="border border-[#EDEFEF] rounded-lg p-4 mb-5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[#1E2422] mb-2">
                        <Bell size={14} className="text-[#8A938D]" />
                        Question from Reviewer
                      </p>

                      <p className="text-sm text-[#2C5A9A]">
                        {app.infoRequest.question}
                      </p>

                      <p className="text-xs text-[#8A938D] mt-2">
                        Asked:{' '}
                        {new Date(app.infoRequest.askedAt).toLocaleString(
                          'en-GB'
                        )}
                      </p>
                    </div>

                    <label className="block text-sm font-semibold text-[#1E2422] mb-1">
                      Your Response
                    </label>

                    <p className="text-xs text-[#8A938D] mb-2">
                      Provide the information requested by our team
                    </p>

                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={4}
                      placeholder="Please provide the information requested..."
                      className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#3B82F6] resize-none"
                    />

                    <p className="text-xs text-[#8A938D] mt-3">
                      Need to attach a file with your response? Use{' '}
                      <button
                        type="button"
                        onClick={() => setShowDocumentsModal(true)}
                        className="text-[#3B82F6] font-medium hover:underline"
                      >
                        View Documents
                      </button>{' '}
                      to upload it, then submit your response below.
                    </p>

                    <button
                      type="button"
                      onClick={handleSubmitResponse}
                      disabled={!responseText.trim()}
                      className="w-full mt-5 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2.5 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Submit Response
                    </button>
                  </div>
                </section>
              )}

              {awaitingReview && (
                <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                  <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-4">
                    Correspondence
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">
                        Question
                      </p>

                      <p className="text-sm text-[#1E2422]">
                        {app.infoRequest.question}
                      </p>

                      <p className="text-xs text-[#8A938D] mt-1">
                        Asked:{' '}
                        {new Date(app.infoRequest.askedAt).toLocaleString(
                          'en-GB'
                        )}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#EDEFEF]">
                      <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">
                        Response
                      </p>

                      <p className="text-sm text-[#1E2422]">
                        {app.infoRequest.response}
                      </p>

                      <p className="text-xs text-[#8A938D] mt-1">
                        Received:{' '}
                        {new Date(
                          app.infoRequest.respondedAt
                        ).toLocaleString('en-GB')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 bg-[#FBEBC7]/40 border border-[#F0D28A] rounded-lg px-4 py-3 mt-5">
                    <Clock size={16} className="text-[#8A6D1F] shrink-0" />

                    <div>
                      <p className="text-sm font-semibold text-[#1E2422]">
                        Awaiting Review
                      </p>

                      <p className="text-xs text-[#6B5A1F]">
                        Your response is being reviewed by our team.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell size={16} className="text-[#8A938D]" />

                  <h2 className="font-display text-lg font-semibold text-[#1E2422]">
                    Updates
                  </h2>

                  {updates.length > 0 && (
                    <span className="text-xs font-semibold bg-[#3B82F6] text-white rounded-full px-2 py-0.5">
                      {updates.length}
                    </span>
                  )}
                </div>

                {updates.length === 0 ? (
                  <p className="text-sm text-[#8A938D]">No updates yet.</p>
                ) : (
                  <div className="space-y-3">
                    {updates.slice(0, 4).map((u) => {
                      const Icon = u.kind === 'document' ? FileUp : u.kind === 'status' ? Bell : Paperclip;
                      const borderClass =
                        u.kind === 'document'
                          ? 'border-[#4B9E6B]'
                          : u.kind === 'status'
                          ? 'border-[#B5651D]'
                          : 'border-[#3B82F6]';
                      return (
                        <div
                          key={u.id}
                          className={`border-l-2 ${borderClass} bg-[#F7F8F6] rounded-r-lg px-4 py-3`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon size={14} className="text-[#8A938D] mt-0.5 shrink-0" />
                            <p className="text-sm text-[#1E2422]">{u.text}</p>
                          </div>

                          <p className="text-xs text-[#8A938D] mt-1 pl-[22px]">
                            {u.author ? `${u.author} · ` : ''}
                            {timeAgo(u.time)}
                          </p>
                        </div>
                      );
                    })}

                    {updates.length > 4 && (
                      <button
                        type="button"
                        onClick={() => setShowNotesModal(true)}
                        className="text-sm font-medium text-[#3B82F6] hover:underline"
                      >
                        View all {updates.length} updates
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6 lg:sticky lg:top-6 self-start">
              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <h3 className="font-display text-sm font-semibold text-[#1E2422] mb-3">
                  Quick Actions
                </h3>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSection('details');
                      setShowDetailsModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#3B82F6] hover:text-[#3B82F6] transition"
                  >
                    <Eye size={15} />
                    View Application Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDocumentsModal(true)}
                    className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#3B82F6] hover:text-[#3B82F6] transition"
                  >
                    <FolderOpen size={15} />
                    View Documents
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#3B82F6] hover:text-[#3B82F6] transition"
                  >
                    <Download size={15} />
                    Download Application PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNotesModal(true)}
                    className="w-full flex items-center justify-between gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#3B82F6] hover:text-[#3B82F6] transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Bell size={15} />
                      Add / View Notes
                    </span>

                    {notes.length > 0 && (
                      <span className="text-xs font-semibold bg-[#FBEBC7] text-[#8A6D1F] rounded-full px-2 py-0.5">
                        {notes.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!isCancellable}
                    className="w-full flex items-center gap-2.5 text-sm text-red-600 border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-red-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <XCircle size={15} />
                    Cancel Application
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <h3 className="font-display text-sm font-semibold text-[#1E2422] mb-4">
                  Application Progress
                </h3>

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#525F58]">
                    Overall Progress
                  </span>

                  <span className="text-xs font-semibold text-[#3B82F6]">
                    {progress.percent}%
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#EDEFEF] rounded-full mb-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      progress.cancelled ? 'bg-red-400' : 'bg-[#3B82F6]'
                    }`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-3">
                  {app.type}
                </p>

                <ul className="space-y-3">
                  {progress.stages.map((stage, i) => (
                    <li key={stage.label}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            stage.state === 'done'
                              ? 'bg-[#4B5D45]'
                              : stage.state === 'current'
                              ? 'bg-[#3B82F6]'
                              : 'bg-[#CBD0CA]'
                          }`}
                        />

                        <span
                          className={`text-sm ${
                            stage.state === 'upcoming' ||
                            stage.state === 'skipped'
                              ? 'text-[#8A938D]'
                              : 'text-[#1E2422] font-medium'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>

                      {i === 0 &&
                        stage.state === 'current' &&
                        app.infoRequest && (
                          <ul className="ml-5 mt-2 space-y-1.5 border-l border-[#EDEFEF] pl-4">
                            <li className="flex items-center gap-2 text-xs text-[#4B5D45]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4B5D45]" />
                              Request More Information
                            </li>

                            <li
                              className={`flex items-center gap-2 text-xs ${
                                app.infoRequest.response
                                  ? 'text-[#4B5D45]'
                                  : 'text-[#8A938D]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  app.infoRequest.response
                                    ? 'bg-[#4B5D45]'
                                    : 'bg-[#CBD0CA]'
                                }`}
                              />

                              Additional Information Received
                            </li>
                          </ul>
                        )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      {showDetailsModal && (
        <Modal
          title="Application Details"
          onClose={() => setShowDetailsModal(false)}
          widthClass="max-w-2xl"
        >
          <div className="space-y-3">
            <div className="border border-[#EDEFEF] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(
                    openSection === 'details' ? null : 'details'
                  )
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F8F6] transition"
              >
                <span className="font-medium text-[#1E2422]">
                  Application Details
                </span>

                <ChevronRight
                  size={18}
                  className={`text-[#8A938D] transition-transform ${
                    openSection === 'details' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {openSection === 'details' && (
                <div className="px-5 pb-5 pt-1 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Name" value={app.applicantName} />
                    <Field label="Email" value={app.applicantEmail} />
                    <Field label="Phone" value={app.phone} />

                    <Field
                      label="Submitted"
                      value={
                        app.submittedDate
                          ? new Date(
                              app.submittedDate
                            ).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : ''
                      }
                    />
                  </div>

                  <div className="pt-4 border-t border-[#EDEFEF]">
                    <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">
                      Site Address
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field
                        label="Property number"
                        value={app.propertyNumber}
                      />

                      <Field label="Street name" value={app.streetName} />

                      <Field label="Town" value={app.town} />

                      <Field label="Postcode" value={app.postcode} />
                    </div>

                    {app.property && (
                      <div className="mt-4">
                        <Field label="Full property" value={app.property} />
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#EDEFEF]">
                    <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">
                      Request
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Request type" value={app.type} />
                      <Field
                        label="Utility connection"
                        value={app.utility}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-[#EDEFEF] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setOpenSection(
                    openSection === 'additional' ? null : 'additional'
                  )
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F8F6] transition"
              >
                <span className="font-medium text-[#1E2422]">
                  Additional Information
                </span>

                <ChevronRight
                  size={18}
                  className={`text-[#8A938D] transition-transform ${
                    openSection === 'additional' ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {openSection === 'additional' && (
                <div className="px-5 pb-5 pt-1 space-y-5">
                  {(app.companyName ||
                    app.companyAddress ||
                    app.companyNumber) && (
                    <div>
                      <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">
                        Company details
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                          label="Company name"
                          value={app.companyName}
                        />

                        <Field
                          label="Company number"
                          value={app.companyNumber}
                        />

                        <Field
                          label="Company address"
                          value={app.companyAddress}
                        />

                        <Field
                          label="Company postcode"
                          value={app.companyPostcode}
                        />
                      </div>
                    </div>
                  )}

                  {app.workDescription && (
                    <div className="pt-4 border-t border-[#EDEFEF]">
                      <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-2">
                        Work Description
                      </p>

                      <p className="text-sm text-[#525F58] whitespace-pre-wrap">
                        {app.workDescription}
                      </p>
                    </div>
                  )}

                  {!app.companyName &&
                    !app.companyAddress &&
                    !app.companyNumber &&
                    !app.workDescription && (
                      <p className="text-sm text-[#8A938D]">
                        No additional information provided.
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showDocumentsModal && (
        <Modal
          title="Application Documents"
          onClose={() => setShowDocumentsModal(false)}
          widthClass="max-w-2xl"
        >
          <div className="border border-[#EDEFEF] rounded-lg p-5 mb-5">
            <p className="text-sm font-semibold text-[#1E2422] mb-1">
              Upload a document
            </p>

            <p className="text-xs text-[#8A938D] mb-4">
              Max 10MB per file.
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
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#525F58] mb-1.5">
                  File
                </label>

                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-sm text-[#525F58] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-[#CBD0CA] file:bg-white file:text-sm file:font-medium file:text-[#525F58] hover:file:border-[#3B82F6]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2 px-4 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Paperclip size={14} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#1E2422]">
              Total Documents: {documents.length}
            </p>
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-[#8A938D] py-6 text-center">
              No documents attached yet.
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-[#EDEFEF] rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E2422] truncate">
                      {doc.name}
                    </p>

                    <p className="text-xs text-[#8A938D]">
                      {doc.size} · Uploaded by {doc.uploadedBy} ·{' '}
                      {new Date(doc.uploadedAt).toLocaleString('en-GB')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] border border-[#CBD0CA] rounded-md px-3 py-1.5 hover:border-[#3B82F6] transition"
                    >
                      <Download size={13} />
                      Download
                    </button>
                    {/* Customers cannot delete a document once it's uploaded —
                        only Admin/Staff can (see AdminApplicationView.jsx). */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {showNotesModal && (
        <Modal
          title="Application Notes"
          onClose={() => setShowNotesModal(false)}
          widthClass="max-w-2xl"
        >
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1E2422] mb-2">
              Add New Note
            </label>

            <textarea
              value={noteText}
              onChange={(e) =>
                setNoteText(e.target.value.slice(0, 5000))
              }
              rows={4}
              placeholder="Type your note here..."
              className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#3B82F6] resize-none"
            />

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#8A938D]">
                {noteText.length} / 5000
              </span>

              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-2 px-5 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-[#EDEFEF]">
            <p className="text-sm font-semibold text-[#1E2422] mb-3">
              Full History
            </p>

            {updates.length === 0 ? (
              <p className="text-sm text-[#8A938D] py-4 text-center">
                No updates yet.
              </p>
            ) : (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div
                    key={u.id}
                    className="border border-[#EDEFEF] rounded-lg px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[#1E2422]">
                      {u.author || 'System'}{' '}
                      <span className="text-xs font-normal text-[#8A938D]">
                        ({u.kind === 'document' ? 'document' : u.kind === 'status' ? 'status' : 'note'})
                      </span>{' '}
                      <span className="text-xs text-[#8A938D]">
                        · {timeAgo(u.time)}
                      </span>
                    </p>

                    <p className="text-sm text-[#525F58] mt-1">
                      {u.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}