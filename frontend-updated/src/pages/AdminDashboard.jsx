import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, User, HelpCircle, LogOut, Eye, Trash2, FolderOpen } from 'lucide-react';
import ThemeBackground from '../components/ThemeBackground';
import DocumentsTab from '../components/DocumentsTab';
import {
  getApplications,
  deleteApplication,
  syncApplicationsFromServer,
  STATUS_OPTIONS,
} from '../utils/applicationsStore';
import logo from '../assets/logo.png';

const statusStyles = {
  'In Progress': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Pending Review': 'bg-[#FBEBC7] text-[#8A6D1F]',
  'Request More Information': 'bg-[#FBEBC7] text-[#8A6D1F]',
  Completed: 'bg-[#E4EAE1] text-[#4B5D45]',
  'Quote Issued': 'bg-[#DCE6F5] text-[#3C5A85]',
  Rejected: 'bg-red-50 text-red-600',
};

// "Overview" removed — All Jobs is now the landing tab.
const tabs = [
  { key: 'jobs', label: 'All Jobs', icon: Briefcase },
  { key: 'customerLog', label: 'Customer Activity', icon: Users },
  { key: 'documents', label: 'Documents', icon: FolderOpen },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'support', label: 'Support', icon: HelpCircle },
];

// Fallback shown only if nothing is in localStorage (shouldn't normally
// happen for a signed-in admin, but keeps the UI from crashing).
const DEFAULT_USER = { firstName: 'Admin', lastName: '', email: 'admin@meterexpress.co.uk' };

// "Seen" tracking for the Customer Activity notification badges. This is
// deliberately separate from replying: opening/expanding a conversation
// should clear its badge immediately (like any notification list), even
// if the admin hasn't sent a reply yet. Keyed by job ref -> ISO timestamp
// of the newest customer message that had been seen as of that visit.
const SEEN_KEY = 'admin_seen_messages';

function getSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSeenMap(map) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobs, setJobs] = useState(() => getApplications());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Customer Activity tab's own search + "needs reply only" filter, and
  // which customer row is expanded to show their jobs.
  const [customerSearch, setCustomerSearch] = useState('');
  const [needsReplyOnly, setNeedsReplyOnly] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [seenMap, setSeenMap] = useState(() => getSeenMap());

  // FIX: read the logged-in user INSIDE the component (via useState's lazy
  // initializer) instead of as a module-level `const`. A module-level const
  // is only evaluated once — the first time this file is imported by the
  // bundler — so in a single-page app it can end up "frozen" on whichever
  // account was logged in earliest in the session, even after a different
  // account logs in later. Reading it here means it's re-evaluated fresh
  // every time this component mounts (i.e. every time you land on this route).
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  // FIX: previously this just called getApplications(), which only reads
  // the LOCAL localStorage cache — it never talks to the server. That meant
  // new applications created by a customer (especially in a different
  // browser/session, where localStorage isn't shared) would never show up
  // here, even when the tab regained focus. Now it calls
  // syncApplicationsFromServer(), which fetches the real, current list from
  // MongoDB and updates both the local cache and this component's state.
  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      const applications = await syncApplicationsFromServer();
      if (isMounted) setJobs(applications);
    };

    refresh(); // sync once immediately on mount, not just on focus
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Matches against every field actually shown in the table — Reference/Type
  // (ref, type, utility), Applicant (name, email), Property (property,
  // postcode), Status, and Submitted date — so a search term can hit any
  // visible column, not just reference/applicant/email.
  const matchesSearch = (job) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const submitted = job.submittedDate
      ? new Date(job.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const haystack = [
      job.ref,
      job.type,
      job.utility,
      job.applicantName,
      job.applicantEmail,
      job.property,
      job.postcode,
      job.status,
      submitted,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
    return matchesSearch(job) && matchesStatus;
  });

  const handleViewJob = (job) => {
    const customerMsgs = (job.messages || []).filter((m) => m.channel === 'customer');
    if (customerMsgs.length) {
      const latest = customerMsgs[customerMsgs.length - 1].time;
      setSeenMap((prev) => {
        const next = { ...prev, [job.ref]: latest };
        saveSeenMap(next);
        return next;
      });
    }
    navigate(`/admin-application/${job.ref}`);
  };

  const handleDeleteJob = (job) => {
    const confirmed = window.confirm(`Delete application ${job.ref}? This cannot be undone.`);
    if (!confirmed) return;
    setJobs(deleteApplication(job.ref));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Built live from real applications instead of hardcoded mock data, so
  // this reflects actual customer submissions and customer chat messages.
  //
  // REDESIGN: previously this was a flat, chronological event feed — one
  // row per submission or message, sorted by time. In practice that ended
  // up showing almost the same information as "All Jobs" (same refs, same
  // people), just re-ordered, so the tab didn't earn its own place in the
  // nav.
  //
  // Now it's grouped BY CUSTOMER instead of by event: one row per person,
  // showing how many jobs they have open and — the actually useful new
  // bit — a "Needs reply" flag whenever their most recent message on a job
  // hasn't been answered by staff yet. That turns this tab into a real
  // worklist ("who am I ignoring right now?") rather than a duplicate of
  // the jobs table. Customers needing a reply float to the top; everyone
  // else is sorted by most recent activity.
  const customerActivity = useMemo(() => {
    const byCustomer = {};

    jobs.forEach((job) => {
      const key = job.applicantEmail || job.applicantName;
      if (!byCustomer[key]) {
        byCustomer[key] = {
          key,
          name: job.applicantName,
          email: job.applicantEmail,
          jobs: [],
          lastActivity: 0,
          pendingMessages: 0,
        };
      }
      const c = byCustomer[key];

      const customerMsgs = (job.messages || []).filter((m) => m.channel === 'customer');

      // A message counts as "pending" (unseen) if it's FROM the customer
      // AND its timestamp is newer than the last time the admin looked at
      // this job's thread. This makes the badge behave like a real
      // notification: opening the conversation clears it, independent of
      // whether the admin has actually typed a reply yet.
      const seenSince = seenMap[job.ref] ? new Date(seenMap[job.ref]).getTime() : 0;
      const pending = customerMsgs.filter(
        (m) => m.role === 'customer' && new Date(m.time).getTime() > seenSince
      ).length;

      const latestCustomerMsgTime = customerMsgs.length
        ? customerMsgs[customerMsgs.length - 1].time
        : null;

      c.jobs.push({
        ref: job.ref,
        type: job.type,
        utility: job.utility,
        status: job.status,
        submittedDate: job.submittedDate,
        messageCount: customerMsgs.length,
        pendingMessages: pending,
        latestCustomerMsgTime,
      });

      c.pendingMessages += pending;

      const times = [
        new Date(job.submittedDate).getTime(),
        ...customerMsgs.map((m) => new Date(m.time).getTime()),
      ].filter((t) => !Number.isNaN(t));

      if (times.length) {
        c.lastActivity = Math.max(c.lastActivity, ...times);
      }
    });

    return Object.values(byCustomer)
      .map((c) => ({
        ...c,
        jobs: c.jobs.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate)),
        lastActivityLabel: c.lastActivity
          ? new Date(c.lastActivity).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
      }))
      .sort((a, b) => {
        if (a.pendingMessages !== b.pendingMessages) return b.pendingMessages - a.pendingMessages;
        return b.lastActivity - a.lastActivity;
      });
  }, [jobs, seenMap]);

  // Mark every job belonging to this customer as "seen" — clears their
  // notification badge immediately, the same way opening a notification
  // list clears its count, regardless of whether a reply has been sent.
  const markCustomerSeen = (customer) => {
    setSeenMap((prev) => {
      const next = { ...prev };
      customer.jobs.forEach((j) => {
        if (j.latestCustomerMsgTime) next[j.ref] = j.latestCustomerMsgTime;
      });
      saveSeenMap(next);
      return next;
    });
  };

  // Mark a single job as seen (used when navigating into that job's own
  // detail page, where the admin will see the full thread directly).
  const markJobSeen = (job) => {
    if (!job.latestCustomerMsgTime) return;
    setSeenMap((prev) => {
      const next = { ...prev, [job.ref]: job.latestCustomerMsgTime };
      saveSeenMap(next);
      return next;
    });
  };

  const filteredCustomerActivity = customerActivity.filter((c) => {
    if (needsReplyOnly && c.pendingMessages === 0) return false;
    const term = customerSearch.trim().toLowerCase();
    if (!term) return true;
    const haystack = [c.name, c.email, ...c.jobs.map((j) => j.ref)].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(term);
  });

  // Sidebar badge + page header: total number of individual customer
  // messages still awaiting a staff reply, summed across every customer
  // and every job — not just a count of how many customers are waiting.
  const pendingMessageTotal = customerActivity.reduce((sum, c) => sum + c.pendingMessages, 0);

  return (
    <div className="min-h-screen flex relative">
      <ThemeBackground />
      {/* Sidebar */}
      <aside className="w-[240px] bg-white text-[#1E2422] flex flex-col shrink-0 border-r border-[#EDEFEF]">
        <div className="p-6 border-b border-[#EDEFEF]">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Company logo" className="h-8 w-8 object-contain shrink-0" />
            <span className="font-display text-base font-semibold text-[#1E2422]">Meter Express</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#FBEBC7] text-[#1E2422]'
                    : 'text-[#525F58] hover:bg-[#EDEFEF]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-[#B5651D]' : 'text-[#8A938D]'} />
                  {t.label}
                </span>
                {t.key === 'customerLog' && pendingMessageTotal > 0 && (
                  <span className="text-[10px] font-semibold bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                    {pendingMessageTotal}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#EDEFEF]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-display font-semibold text-sm">
              {user.firstName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium text-[#1E2422]">{user.firstName || 'Admin'}</p>
              <p className="text-xs text-[#8A938D]">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-[#8A938D] hover:text-[#2563EB] transition"
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* ---------------- ALL JOBS ---------------- */}
        {activeTab === 'jobs' && (
          <div>
            <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-6">
              All Jobs
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                type="text"
                placeholder="Search by reference, type, applicant, email, property, postcode, status, or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] focus:outline-none focus:border-[#2563EB]"
              >
                <option>All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-[#F7F8F6] text-left text-xs uppercase tracking-wide text-[#525F58]">
                    <th className="px-5 py-3">Reference / Type</th>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Property</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.ref} className="border-t border-[#EDEFEF] hover:bg-[#F7F8F6]/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#1E2422]">{job.ref}</p>
                        <p className="text-xs text-[#525F58]">{job.type} — {job.utility}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-[#1E2422]">{job.applicantName}</p>
                        <p className="text-xs text-[#8A938D]">{job.applicantEmail}</p>
                      </td>
                      <td className="px-5 py-3 text-[#525F58]">
                        {job.property}
                        <p className="text-xs text-[#8A938D]">{job.postcode}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusStyles[job.status] || 'bg-[#EDEFEF] text-[#525F58]'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#525F58] whitespace-nowrap">
                        {job.submittedDate ? new Date(job.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title={job.status === 'Pending Review' ? 'Start reviewing' : 'View job'}
                            onClick={() => handleViewJob(job)}
                            className="h-8 flex items-center gap-1.5 px-3 rounded-md border border-[#CBD0CA] text-[#525F58] hover:border-[#2563EB] hover:text-[#2563EB] transition text-xs font-semibold"
                          >
                            <Eye size={14} />
                            {job.status === 'Pending Review' ? 'Review' : 'View'}
                          </button>
                          <button
                            type="button"
                            title="Delete job"
                            onClick={() => handleDeleteJob(job)}
                            className="w-8 h-8 flex items-center justify-center rounded-md border border-[#CBD0CA] text-[#525F58] hover:border-red-500 hover:text-red-500 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-[#8A938D]">
                        No applications match your search/filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- CUSTOMER ACTIVITY (redesigned) ---------------- */}
        {activeTab === 'customerLog' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-[28px] font-semibold text-[#1E2422]">
                Customer Activity
              </h1>
              {pendingMessageTotal > 0 && (
                <span className="text-xs font-semibold bg-red-50 text-red-600 rounded-full px-3 py-1">
                  {pendingMessageTotal} message{pendingMessageTotal !== 1 ? 's' : ''} awaiting reply
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                type="text"
                placeholder="Search by customer name, email, or reference..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="flex-1 bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => setNeedsReplyOnly((v) => !v)}
                className={`px-4 py-2.5 rounded-md text-sm font-semibold border transition whitespace-nowrap ${
                  needsReplyOnly
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-[#CBD0CA] text-[#525F58] hover:border-[#2563EB]'
                }`}
              >
                {needsReplyOnly ? 'Showing: Needs reply' : 'Needs reply only'}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] divide-y divide-[#EDEFEF]">
              {filteredCustomerActivity.map((c) => {
                const isOpen = expandedCustomer === c.key;
                return (
                  <div key={c.key}>
                    <div
                      onClick={() => {
                        const nowOpen = !isOpen;
                        setExpandedCustomer(nowOpen ? c.key : null);
                        if (nowOpen) markCustomerSeen(c);
                      }}
                      className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#F7F8F6] transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1E2422] flex items-center gap-2">
                          {c.name}
                          {c.pendingMessages > 0 && (
                            <span className="text-[10px] font-semibold bg-red-50 text-red-600 rounded-full px-2 py-0.5 shrink-0">
                              {c.pendingMessages} new message{c.pendingMessages !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[#8A938D] truncate">
                          {c.email} · {c.jobs.length} job{c.jobs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-xs text-[#8A938D] shrink-0 ml-4">{c.lastActivityLabel}</span>
                    </div>

                    {isOpen && (
                      <div className="px-6 pb-4 space-y-2 bg-[#F7F8F6]/40">
                        {c.jobs.map((j) => (
                          <div
                            key={j.ref}
                            onClick={() => {
                              markJobSeen(j);
                              navigate(`/admin-application/${j.ref}`);
                            }}
                            className="flex items-center justify-between text-sm bg-white border border-[#EDEFEF] rounded-lg px-4 py-2.5 cursor-pointer hover:border-[#2563EB] transition"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-[#1E2422]">
                                {j.ref} <span className="font-normal text-[#525F58]">— {j.type}</span>
                              </p>
                              <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[j.status] || 'bg-[#EDEFEF] text-[#525F58]'}`}>
                                {j.status}
                              </span>
                            </div>
                            <span className="text-xs text-[#8A938D] shrink-0 ml-3 text-right">
                              {j.messageCount} message{j.messageCount !== 1 ? 's' : ''}
                              {j.pendingMessages > 0 && (
                                <>
                                  <br />
                                  <span className="text-red-600 font-semibold">
                                    {j.pendingMessages} awaiting reply
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredCustomerActivity.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-[#8A938D]">
                  {customerActivity.length === 0 ? 'No customer activity yet.' : 'No customers match your search/filter.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ---------------- DOCUMENTS ---------------- */}
        {activeTab === 'documents' && (
          <div>
            <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-6">
              Documents
            </h1>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
              <DocumentsTab />
            </div>
          </div>
        )}

        {/* ---------------- PROFILE ---------------- */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-6">Profile</h2>
            <div className="space-y-5 text-sm">
              <div className="flex justify-between border-b border-[#EDEFEF] pb-3">
                <span className="text-[#8A938D]">Name</span>
                <span className="text-[#1E2422] font-medium">{user.firstName || '—'} {user.lastName || ''}</span>
              </div>
              <div className="flex justify-between border-b border-[#EDEFEF] pb-3">
                <span className="text-[#8A938D]">Email</span>
                <span className="text-[#1E2422] font-medium">{user.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A938D]">Access Level</span>
                <span className="text-[#1E2422] font-medium">Administrator</span>
              </div>
            </div>
            <button className="mt-8 border border-[#2563EB] text-[#2563EB] font-semibold text-sm py-2.5 px-5 rounded-md hover:bg-[#2563EB] hover:text-white transition">
              Edit Details
            </button>
          </div>
        )}

        {/* ---------------- SUPPORT ---------------- */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-3">
              Need help?
            </h2>
            <p className="text-sm text-[#525F58] mb-6">
              Reach IT support or escalate an urgent issue affecting the network.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between border border-[#EDEFEF] rounded-lg px-5 py-4">
                <span className="text-sm text-[#1E2422] font-medium">IT / systems support</span>
                <span className="text-sm text-[#2563EB] font-semibold">0800 111 999</span>
              </div>
              <div className="flex items-center justify-between border border-[#EDEFEF] rounded-lg px-5 py-4">
                <span className="text-sm text-[#1E2422] font-medium">Emergency escalation</span>
                <span className="text-sm text-[#2563EB] font-semibold">0800 111 999</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}