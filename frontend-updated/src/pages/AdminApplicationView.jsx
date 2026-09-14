import { useState, useEffect, useCallback } from 'react';
import logo from '../assets/logo.png';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  FolderOpen,
  Download,
  Bell,
  PlayCircle,
  CheckCircle2,
  XCircle,
  FileCheck,
  Paperclip,
  Trash2,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import ThemeBackground from '../components/ThemeBackground';
import Modal from '../components/Modal';
import ChatPanel from '../components/ChatPanel';
import {
  getApplicationByRef,
  refreshApplicationFromServer,
  addMessage,
  updateApplication,
  renameReference,
  requestMoreInfo,
  clearInfoRequest,
  addDocument,
  deleteDocument,
  addNote,
  STATUS_OPTIONS,
} from '../utils/applicationsStore';

const user = JSON.parse(localStorage.getItem('user')) || { firstName: 'Admin', lastName: '', email: 'admin@meterexpress.co.uk' };
const adminName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';

const statusStyles = {
  'In Progress': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Pending Review': 'bg-[#FBEBC7] text-[#8A6D1F]',
  'Request More Information': 'bg-[#FBEBC7] text-[#8A6D1F]',
  Completed: 'bg-[#E4EAE1] text-[#4B5D45]',
  'Quote Issued': 'bg-[#DCE6F5] text-[#3C5A85]',
  'Application Cancelled': 'bg-red-50 text-red-600',
  Rejected: 'bg-red-50 text-red-600',
};

const CLOSED_STATUSES = ['Completed', 'Rejected', 'Application Cancelled'];

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
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 ${statusStyles[status] || 'bg-[#EDEFEF] text-[#525F58]'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-[#1E2422]">{value?.toString().trim() ? value : '—'}</p>
    </div>
  );
}

export default function AdminApplicationView() {
  const navigate = useNavigate();
  const { ref } = useParams();

  // FIX: start from whatever's in the local cache (instant paint, same as
  // before) but immediately follow up with a real server fetch — see the
  // effect below. Without this, this page would only ever show data that
  // THIS browser's session already knew about, so e.g. a document a
  // customer uploaded from their own session would never appear here.
  const [app, setApp] = useState(() => getApplicationByRef(ref));
  const [loadError, setLoadError] = useState('');

  const [infoQuestion, setInfoQuestion] = useState('');
  const [showInfoForm, setShowInfoForm] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [openSection, setOpenSection] = useState('details');

  const [docType, setDocType] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [noteText, setNoteText] = useState('');

  const [editingRef, setEditingRef] = useState(false);
  const [refDraft, setRefDraft] = useState('');
  const [refSaving, setRefSaving] = useState(false);
  const [refError, setRefError] = useState('');

  // FIX: pulls this one application fresh from the server and reconciles
  // it into the local cache, so admin sees whatever the CURRENT truth is —
  // not just what this browser already had cached. Used both on initial
  // load and again after any action that changes server state, in case
  // another session (customer, another admin) also touched it meanwhile.
  const loadFresh = useCallback(async () => {
    try {
      const fresh = await refreshApplicationFromServer(ref);
      setApp(fresh);
      setLoadError('');
    } catch (err) {
      setLoadError('Could not load the latest data — showing the last known version.');
    }
  }, [ref]);

  useEffect(() => {
    loadFresh();
  }, [loadFresh]);

  const refresh = () => loadFresh();

  const startEditRef = () => {
    setRefDraft(app.ref);
    setRefError('');
    setEditingRef(true);
  };

  const cancelEditRef = () => {
    setEditingRef(false);
    setRefError('');
  };

  const saveRef = async () => {
    const newRef = refDraft.trim();
    if (!newRef || newRef === app.ref) {
      setEditingRef(false);
      return;
    }
    setRefSaving(true);
    setRefError('');
    try {
      const fresh = await renameReference(app.ref, newRef);
      setEditingRef(false);
      // The URL param (:ref) still points at the OLD reference — replace
      // it so the address bar, refreshes, and back-button all point at the
      // application under its new reference instead of a now-stale one.
      navigate(`/admin-application/${fresh.ref}`, { replace: true });
      setApp(fresh);
    } catch (err) {
      setRefError(err.response?.data?.message || 'Could not update the reference number');
    } finally {
      setRefSaving(false);
    }
  };

  const handleSendMessage = (text) => {
    addMessage(ref, { channel: 'customer', author: adminName, role: 'staff', text });
    refresh();
  };

  const setStatus = (status) => {
    updateApplication({ ref, status });
    refresh();
  };

  const handleRequestInfo = () => {
    if (!infoQuestion.trim()) return;
    requestMoreInfo(ref, infoQuestion.trim());
    refresh();
    setInfoQuestion('');
    setShowInfoForm(false);
  };

  const handleClearInfoRequest = () => {
    clearInfoRequest(ref);
    refresh();
  };

  const handleFileChange = (e) => {
    setPendingFile(e.target.files?.[0] || null);
  };

  const handleUpload = () => {
    if (!pendingFile) return;

    setUploading(true);

    // Read the file into a base64 data URL so it can be persisted
    // (via addDocument -> the backend -> MongoDB) instead of only living
    // in this tab's memory. That's what makes it downloadable later, from
    // this session or any other (e.g. the customer who uploaded it, or a
    // different admin).
    const reader = new FileReader();

    reader.onload = () => {
      addDocument(ref, {
        name: pendingFile.name,
        size: formatBytes(pendingFile.size),
        uploadedBy: adminName,
        folder: docType.trim(),
        data: reader.result,
      });
      refresh();
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
          'It may have been uploaded before file content was saved.'
      );
      return;
    }
    const a = document.createElement('a');
    a.href = doc.data;
    a.download = doc.name;
    a.click();
  };

  const handleDeleteDoc = (doc) => {
    const confirmed = window.confirm(`Delete ${doc.name}?`);
    if (!confirmed) return;
    deleteDocument(ref, doc.id);
    refresh();
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(ref, { author: adminName, role: 'staff', text: noteText.trim() });
    refresh();
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
            We couldn't find an application with reference {ref}. It may have been deleted.
          </p>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2.5 rounded-md transition"
          >
            Back to admin dashboard
          </button>
        </div>
      </div>
    );
  }

  const isClosed = CLOSED_STATUSES.includes(app.status);
  const documents = app.documents || [];
  const notes = app.notes || [];

  return (
    <div className="min-h-screen flex relative">
      <ThemeBackground />
      <main className="flex-1 py-10 px-6 sm:px-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-2.5 mb-5">
            <img src={logo} alt="Meter Express" className="h-12 w-12 object-contain" />
            <span className="font-display text-base font-semibold text-[#1E2422]">Meter Express</span>
          </div>

          <Link
            to="/admin-dashboard"
            className="inline-flex items-center gap-2 text-sm text-[#525F58] hover:text-[#2563EB] transition mb-6"
          >
            <ArrowLeft size={16} />
            Back to admin dashboard
          </Link>

          {loadError && (
            <div className="bg-[#FBEBC7]/50 border border-[#F0D28A] text-[#8A6D1F] text-sm rounded-md px-4 py-3 mb-6">
              {loadError}
            </div>
          )}

          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide">Reference</span>
                <StatusPill status={app.status} />
              </div>

              {editingRef ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={refDraft}
                      onChange={(e) => setRefDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRef();
                        if (e.key === 'Escape') cancelEditRef();
                      }}
                      disabled={refSaving}
                      className="font-display text-[28px] font-bold text-[#2563EB] bg-white border border-[#2563EB] rounded-md px-2 py-0.5 w-64 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={saveRef}
                      disabled={refSaving}
                      title="Save"
                      className="text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-40"
                    >
                      <Check size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditRef}
                      disabled={refSaving}
                      title="Cancel"
                      className="text-[#8A938D] hover:text-red-600 disabled:opacity-40"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {refError && <p className="text-xs text-red-600 mt-1.5">{refError}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="font-display text-[40px] leading-none font-bold text-[#2563EB]">{app.ref}</h1>
                  <button
                    type="button"
                    onClick={startEditRef}
                    title="Change reference number"
                    className="text-[#8A938D] hover:text-[#2563EB] transition opacity-60 hover:opacity-100"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}

              <p className="text-sm text-[#525F58] mt-2">
                {app.type} — {app.utility}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Details */}
              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <h3 className="font-display text-sm font-semibold text-[#1E2422] mb-3">Job Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-0.5">Request Type</p>
                    <p className="text-sm font-medium text-[#1E2422]">{app.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-0.5">Utility</p>
                    <p className="text-sm font-medium text-[#1E2422]">{app.utility}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-0.5">Applicant</p>
                    <p className="text-sm font-medium text-[#1E2422]">{app.applicantName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-0.5">Submitted</p>
                    <p className="text-sm font-medium text-[#1E2422]">
                      {app.submittedDate
                        ? new Date(app.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Correspondence */}
              {app.infoRequest && (
                <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                  <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-4">Correspondence</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">Question</p>
                      <p className="text-sm text-[#1E2422]">{app.infoRequest.question}</p>
                      <p className="text-xs text-[#8A938D] mt-1">
                        Asked: {new Date(app.infoRequest.askedAt).toLocaleString('en-GB')}
                      </p>
                    </div>
                    {app.infoRequest.response ? (
                      <div className="pt-4 border-t border-[#EDEFEF]">
                        <p className="text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-1">Response</p>
                        <p className="text-sm text-[#1E2422]">{app.infoRequest.response}</p>
                        <p className="text-xs text-[#8A938D] mt-1">
                          Received: {new Date(app.infoRequest.respondedAt).toLocaleString('en-GB')}
                        </p>
                        <button
                          type="button"
                          onClick={handleClearInfoRequest}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:underline"
                        >
                          <CheckCircle2 size={14} />
                          Mark as Reviewed
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8A6D1F]">Awaiting response from applicant.</p>
                    )}
                  </div>
                </section>
              )}

              {/* Messages with the customer */}
              <section>
                <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-3">
                  Messages with {app.applicantName}
                </h2>
                <ChatPanel
                  messages={(app.messages || []).filter((m) => m.channel === 'customer')}
                  currentRole="staff"
                  onSend={handleSendMessage}
                  placeholder="Message the applicant about this application..."
                  emptyText="No messages yet."
                  heightClass="h-[320px]"
                />
              </section>
            </div>

            {/* Sidebar — quick actions & status */}
            <div className="space-y-6 lg:sticky lg:top-6 self-start">
              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <h3 className="font-display text-sm font-semibold text-[#1E2422] mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSection('details');
                      setShowDetailsModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#2563EB] hover:text-[#2563EB] transition"
                  >
                    <Eye size={15} />
                    View Application Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      refresh();
                      setShowDocumentsModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#2563EB] hover:text-[#2563EB] transition"
                  >
                    <FolderOpen size={15} />
                    View Documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(true)}
                    className="w-full flex items-center justify-between gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#2563EB] hover:text-[#2563EB] transition"
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
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <h3 className="font-display text-sm font-semibold text-[#1E2422] mb-3">Application Status</h3>
                <div className="mb-4">
                  <StatusPill status={app.status} />
                </div>

                <div className="space-y-2">
                  {app.status === 'Pending Review' && (
                    <button
                      type="button"
                      onClick={() => setStatus('In Progress')}
                      className="w-full flex items-center gap-2.5 text-sm text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2.5 transition"
                    >
                      <PlayCircle size={15} />
                      Start Review
                    </button>
                  )}

                  {app.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => setStatus('Quote Issued')}
                      className="w-full flex items-center gap-2.5 text-sm text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md px-4 py-2.5 transition"
                    >
                      <FileCheck size={15} />
                      Issue Quote
                    </button>
                  )}

                  {(app.status === 'In Progress' || app.status === 'Quote Issued') && (
                    <button
                      type="button"
                      onClick={() => setStatus('Completed')}
                      className="w-full flex items-center gap-2.5 text-sm text-[#1E2422] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#4B5D45] hover:text-[#4B5D45] transition"
                    >
                      <CheckCircle2 size={15} />
                      Mark Accepted / Completed
                    </button>
                  )}

                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(`Reject application ${ref}?`);
                        if (confirmed) setStatus('Rejected');
                      }}
                      className="w-full flex items-center gap-2.5 text-sm text-red-600 border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-red-500 transition"
                    >
                      <XCircle size={15} />
                      Reject Application
                    </button>
                  )}

                  {!isClosed && (
                    <button
                      type="button"
                      onClick={() => setShowInfoForm((v) => !v)}
                      className="w-full flex items-center gap-2.5 text-sm text-[#8A6D1F] border border-[#EDEFEF] rounded-md px-4 py-2.5 hover:border-[#F0D28A] transition"
                    >
                      <Bell size={15} />
                      Request More Information
                    </button>
                  )}
                </div>

                {showInfoForm && (
                  <div className="mt-4 pt-4 border-t border-[#EDEFEF]">
                    <label className="block text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-2">
                      Question for the applicant
                    </label>
                    <textarea
                      value={infoQuestion}
                      onChange={(e) => setInfoQuestion(e.target.value)}
                      rows={3}
                      placeholder="e.g. Please confirm the gas meter location..."
                      className="w-full bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB] resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleRequestInfo}
                      disabled={!infoQuestion.trim()}
                      className="w-full mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Send Request
                    </button>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-[#EDEFEF]">
                  <label className="block text-xs font-semibold text-[#8A938D] uppercase tracking-wide mb-2">
                    Set status manually
                  </label>
                  <select
                    value={app.status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] focus:outline-none focus:border-[#2563EB]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- APPLICATION DETAILS MODAL ---------------- */}
      {showDetailsModal && (
        <Modal title="Application Details" onClose={() => setShowDetailsModal(false)} widthClass="max-w-2xl">
          <div className="space-y-3">
            <div className="border border-[#EDEFEF] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'details' ? null : 'details')}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F8F6] transition"
              >
                <span className="font-medium text-[#1E2422]">Application Details</span>
                <ChevronRight
                  size={18}
                  className={`text-[#8A938D] transition-transform ${openSection === 'details' ? 'rotate-90' : ''}`}
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
                          ? new Date(app.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : ''
                      }
                    />
                  </div>
                  <div className="pt-4 border-t border-[#EDEFEF]">
                    <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">Site Address</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Property number" value={app.propertyNumber} />
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
                    <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">Request</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Request type" value={app.type} />
                      <Field label="Utility connection" value={app.utility} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-[#EDEFEF] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenSection(openSection === 'additional' ? null : 'additional')}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F8F6] transition"
              >
                <span className="font-medium text-[#1E2422]">Additional Information</span>
                <ChevronRight
                  size={18}
                  className={`text-[#8A938D] transition-transform ${openSection === 'additional' ? 'rotate-90' : ''}`}
                />
              </button>
              {openSection === 'additional' && (
                <div className="px-5 pb-5 pt-1 space-y-5">
                  {(app.companyName || app.companyAddress || app.companyNumber) && (
                    <div>
                      <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">Company details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Company name" value={app.companyName} />
                        <Field label="Company number" value={app.companyNumber} />
                        <Field label="Company address" value={app.companyAddress} />
                        <Field label="Company postcode" value={app.companyPostcode} />
                      </div>
                    </div>
                  )}
                  {app.workDescription && (
                    <div className="pt-4 border-t border-[#EDEFEF]">
                      <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-2">Work Description</p>
                      <p className="text-sm text-[#525F58] whitespace-pre-wrap">{app.workDescription}</p>
                    </div>
                  )}
                  {!app.companyName && !app.companyAddress && !app.companyNumber && !app.workDescription && (
                    <p className="text-sm text-[#8A938D]">No additional information provided.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- APPLICATION DOCUMENTS MODAL ---------------- */}
      {showDocumentsModal && (
        <Modal title="Application Documents" onClose={() => setShowDocumentsModal(false)} widthClass="max-w-2xl">
          <div className="border border-[#EDEFEF] rounded-lg p-5 mb-5">
            <p className="text-sm font-semibold text-[#1E2422] mb-1">Upload a document</p>
            <p className="text-xs text-[#8A938D] mb-4">Max 10MB per file.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#525F58] mb-1.5">Document type</label>
                <input
                  type="text"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. Site plan"
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-3 py-2 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#525F58] mb-1.5">File</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-sm text-[#525F58] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-[#CBD0CA] file:bg-white file:text-sm file:font-medium file:text-[#525F58] hover:file:border-[#2563EB]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2 px-4 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Paperclip size={14} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          <p className="text-sm font-semibold text-[#1E2422] mb-3">Total Documents: {documents.length}</p>

          {documents.length === 0 ? (
            <p className="text-sm text-[#8A938D] py-6 text-center">No documents attached yet.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-[#EDEFEF] rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1E2422] truncate">{doc.name}</p>
                    <p className="text-xs text-[#8A938D]">
                      {doc.size} · Uploaded by {doc.uploadedBy} · {new Date(doc.uploadedAt).toLocaleString('en-GB')}
                      {doc.folder && <> · {doc.folder}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] border border-[#CBD0CA] rounded-md px-3 py-1.5 hover:border-[#2563EB] transition"
                    >
                      <Download size={13} />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-[#CBD0CA] rounded-md px-3 py-1.5 hover:border-red-500 transition"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ---------------- APPLICATION NOTES MODAL ---------------- */}
      {showNotesModal && (
        <Modal title="Application Notes" onClose={() => setShowNotesModal(false)} widthClass="max-w-2xl">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#1E2422] mb-2">Add New Note</label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 5000))}
              rows={4}
              placeholder="Type your note here..."
              className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB] resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#8A938D]">{noteText.length} / 5000</span>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2 px-5 rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-[#EDEFEF]">
            <p className="text-sm font-semibold text-[#1E2422] mb-3">Notes History</p>
            {notes.length === 0 ? (
              <p className="text-sm text-[#8A938D] py-4 text-center">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {[...notes].reverse().map((n) => (
                  <div key={n.id} className="border border-[#EDEFEF] rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-[#1E2422]">
                      {n.author} <span className="text-xs font-normal text-[#8A938D]">({n.role})</span>{' '}
                      <span className="text-xs text-[#8A938D]">· {timeAgo(n.time)}</span>
                    </p>
                    <p className="text-sm text-[#525F58] mt-1">{n.text}</p>
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