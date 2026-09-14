import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  User as UserIcon,
  HelpCircle,
  LogOut,
  Eye,
  MessageCircle,
  Filter,
  Search as SearchIcon,
  Info,
} from 'lucide-react';
import ThemeBackground from '../components/ThemeBackground';
import {
  getApplications,
  syncApplicationsFromServer,
} from '../utils/applicationsStore';
import { getProfile, saveProfile } from '../utils/customerProfileStore';
import logo from '../assets/logo.png';

const user = JSON.parse(localStorage.getItem('user')) || { firstName: 'Tisha', lastName: 'Sharma', email: 'tisha@example.com' };

const statusStyles = {
  'In Progress': 'bg-[#DCE6F5] text-[#2C5A9A]',
  'Pending Review': 'bg-[#FBEBC7] text-[#8A6D1F]',
  'Request More Information': 'bg-[#FBEBC7] text-[#8A6D1F]',
  Completed: 'bg-[#E4EAE1] text-[#4B5D45]',
  'Quote Issued': 'bg-[#DCE6F5] text-[#3C5A85]',
  'Application Cancelled': 'bg-red-50 text-red-600',
  Rejected: 'bg-red-50 text-red-600',
};

// Sidebar navigation — Applications / Settings live here now, instead of as
// top tabs. Draft Applications has been removed.
const navItems = [
  { key: 'applications', label: 'Applications', icon: FileText },
  { key: 'settings', label: 'Profile', icon: UserIcon },
  { key: 'Guidance', label: 'Guidance', icon: HelpCircle },
];

// ---------------------------------------------------------------------
// Read-message tracking (client-side).
//
// We don't have a `read` flag coming from the backend/store, so instead
// we remember, per application ref, how many "customer channel" messages
// had been sent as of the last time the customer opened that application.
// If the current count is higher than what's stored, there are unread
// messages and we show the badge with the difference.
//
// NOTE: this is a local-only signal (per browser). If you want "read"
// state to follow the customer across devices/sessions, move this into
// the backend (e.g. a `readCount` or `read` flag on each message,
// updated via a PATCH request) and swap out getReadCount/markRead below
// for calls to that API — the rest of this component doesn't need to
// change.
// ---------------------------------------------------------------------
const READ_MESSAGES_KEY = 'customerReadMessageCounts';

function loadReadCounts() {
  try {
    return JSON.parse(localStorage.getItem(READ_MESSAGES_KEY)) || {};
  } catch {
    return {};
  }
}

function getReadCount(ref) {
  const counts = loadReadCounts();
  return counts[ref] || 0;
}

function markApplicationMessagesRead(app) {
  if (!app?.ref) return;
  const totalCustomerMessages = app.messages?.filter((m) => m.channel === 'customer').length || 0;
  const counts = loadReadCounts();
  if (counts[app.ref] === totalCustomerMessages) return; // nothing changed
  counts[app.ref] = totalCustomerMessages;
  localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(counts));
}

function getUnreadCustomerMessageCount(app) {
  const totalCustomerMessages = app.messages?.filter((m) => m.channel === 'customer').length || 0;
  const readCount = getReadCount(app.ref);
  return Math.max(0, totalCustomerMessages - readCount);
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 whitespace-nowrap ${statusStyles[status] || 'bg-[#EDEFEF] text-[#525F58]'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {status}
    </span>
  );
}

// Small labeled input used in the Settings edit form below. Keeps the
// styling consistent with the rest of the app's inputs without repeating
// the className string a dozen times.
function SettingsField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#525F58] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
      />
    </div>
  );
}

// Table used by the "Applications" tab — columns match the reference design:
// Reference/Type, Applicant Name, Applicant Email, Property, Site Postcode,
// Submitted Date, Status, Actions.
//
// The whole row is clickable (navigates to the application), so users don't
// have to scroll sideways or hunt for the eye icon. The Actions column is
// sticky so it's still reachable on narrow screens without scrolling all
// the way right.
//
// The message badge only shows when there are UNREAD customer-channel
// messages (see getUnreadCustomerMessageCount above). Opening the
// application via onView marks them read, so the badge disappears next
// render.
//
// NOTE: Delete has been intentionally removed from this table — customers
// should not be able to delete their own applications. That action lives
// only in the admin dashboard now. If you re-add it here, make sure the
// backend DELETE route is also restricted to admin users (see
// routes/applicationRoutes.js) — hiding the button alone does not stop a
// customer from calling the API directly.
function ApplicationsTable({ apps, onView }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[1050px]">
        <thead>
          <tr className="border-b border-[#EDEFEF] text-left text-[#8A938D] text-xs uppercase tracking-wide">
            <th className="px-6 py-3.5 font-medium">Reference / Type</th>
            <th className="px-6 py-3.5 font-medium">Applicant Name</th>
            <th className="px-6 py-3.5 font-medium">Applicant Email</th>
            <th className="px-6 py-3.5 font-medium">Property</th>
            <th className="px-6 py-3.5 font-medium">Site Postcode</th>
            <th className="px-6 py-3.5 font-medium">Submitted Date</th>
            <th className="px-6 py-3.5 font-medium">Status</th>
            <th className="px-6 py-3.5 font-medium text-right sticky right-0 bg-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app, index) => {
            const unreadCount = getUnreadCustomerMessageCount(app);
            return (
              <tr
                key={app.ref || `app-row-${index}`}
                onClick={() => onView(app)}
                className="border-b border-[#EDEFEF] last:border-0 hover:bg-[#EDEFEF]/40 transition cursor-pointer"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-[#1E2422]">{app.ref}</p>
                  <p className="text-xs text-[#8A938D]">{app.type} — {app.utility}</p>
                </td>
                <td className="px-6 py-4 text-[#525F58]">{app.applicantName}</td>
                <td className="px-6 py-4 text-[#525F58]">{app.applicantEmail}</td>
                <td className="px-6 py-4 text-[#525F58]">{app.property}</td>
                <td className="px-6 py-4 text-[#525F58]">{app.postcode}</td>
                <td className="px-6 py-4 text-[#8A938D] whitespace-nowrap">
                  {app.submittedDate
                    ? new Date(app.submittedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={app.status} />
                </td>
                <td className="px-6 py-4 sticky right-0 bg-white">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      title="View application"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(app);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-[#CBD0CA] text-[#525F58] hover:border-[#2563EB] hover:text-[#2563EB] transition"
                    >
                      <Eye size={15} />
                    </button>
                    {unreadCount > 0 && (
                      <span
                        title="Has unread messages"
                        className="w-8 h-8 flex items-center justify-center gap-1 rounded-md border border-[#CBD0CA] text-xs font-semibold text-[#2563EB]"
                      >
                        <MessageCircle size={13} />
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {apps.length === 0 && (
            <tr key="empty-state">
              <td colSpan={8} className="px-6 py-10 text-center text-sm text-[#8A938D]">
                No applications found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('applications');
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState(() => getApplications());

  // Customer profile (name/email/phone + default company & site address) —
  // this is what pre-fills the New Application form. Editable from the
  // Settings tab below.
  const [profile, setProfile] = useState(() => getProfile());
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(profile);

  // FIX: previously this only re-read the local cache via getApplications(),
  // which never talked to the backend — so deletes/edits made server-side
  // (or in another session) never showed up here, and this dashboard's own
  // deletes never actually reached MongoDB (see handleDelete below).
  // Now it calls syncApplicationsFromServer(), same as the admin dashboard,
  // so this always reflects what's really in the database.
  useEffect(() => {
    const refresh = async () => {
      const apps = await syncApplicationsFromServer();
      setApplications(apps);
      setProfile(getProfile());
    };
    refresh(); // sync once immediately on mount, not just on focus
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Drafts are no longer surfaced anywhere in this dashboard — only
  // submitted applications are shown.
  const submittedApplications = applications.filter((a) => a.status !== 'Draft');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleView = (app) => {
    // Mark any customer-channel messages on this application as read so
    // the badge in the table stops showing for it. Do this before/along
    // with navigating — order doesn't matter since it's just a
    // localStorage write.
    markApplicationMessagesRead(app);
    navigate(`/applications/${app.ref}`);
  };

  const matchesSearch = (app) =>
    `${app.ref} ${app.type} ${app.applicantName} ${app.applicantEmail} ${app.property} ${app.postcode}`
      .toLowerCase()
      .includes(search.toLowerCase());

  const filteredApplications = submittedApplications.filter(matchesSearch);

  const startEditingSettings = () => {
    setSettingsDraft(profile);
    setEditingSettings(true);
  };

  const updateSettingsField = (field, value) => {
    setSettingsDraft((prev) => ({ ...prev, [field]: value }));
  };

  const cancelEditingSettings = () => {
    setEditingSettings(false);
    setSettingsDraft(profile);
  };

  const saveSettings = () => {
    const saved = saveProfile(settingsDraft);
    setProfile(saved);
    setEditingSettings(false);
  };

  const formattedAddress = profile.propertyNumber || profile.streetName
    ? `${profile.propertyNumber} ${profile.streetName}, ${profile.town} ${profile.postcode}`.trim()
    : '—';

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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const count = item.key === 'applications' ? submittedApplications.length : null;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-[#FBEBC7] text-[#1E2422]' : 'text-[#525F58] hover:bg-[#EDEFEF]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-[#B5651D]' : 'text-[#8A938D]'} />
                  {item.label}
                </span>
                {count !== null && (
                  <span className={`text-xs font-semibold ${isActive ? 'text-[#B5651D]' : 'text-[#8A938D]'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#EDEFEF]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-display font-semibold text-sm">
              {(profile.firstName || user.firstName)?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-[#1E2422]">{profile.firstName || user.firstName || 'Customer'}</p>
              <p className="text-xs text-[#8A938D]">Customer</p>
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
        {/* ---------------- APPLICATIONS ---------------- */}
        {activeTab === 'applications' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-[28px] font-semibold text-[#1E2422]">
                Applications
              </h1>
              <Link
                to="/new-application"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2.5 px-5 rounded-md transition"
              >
                Create new application
              </Link>
            </div>

            <div className="flex items-start gap-3 bg-[#DCE6F5]/60 border border-[#B9CDEE] rounded-xl px-5 py-4 mb-6">
              <Info size={18} className="text-[#2C5A9A] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#1E2422]">Welcome to Meter Express</p>
                <p className="text-sm text-[#525F58] mt-0.5">
                  All of your applications and their status are listed below — click a row (or the eye icon) to
                  view an application, or the message icon to see notes sent to our team.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <button
                type="button"
                className="flex items-center gap-2 bg-white border border-[#CBD0CA] rounded-md px-4 py-2.5 text-sm font-medium text-[#525F58] hover:border-[#2563EB] hover:text-[#2563EB] transition w-fit"
              >
                <Filter size={15} />
                Filters
              </button>
              <div className="relative flex-1">
                <SearchIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938D]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by reference, applicant, or property"
                  className="w-full bg-white border border-[#CBD0CA] rounded-md pl-10 pr-4 py-2.5 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <ApplicationsTable apps={filteredApplications} onView={handleView} />
          </div>
        )}

        {/* ---------------- SETTINGS ---------------- */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-6">Profile</h2>

            {!editingSettings ? (
              <>
                <div className="space-y-5 text-sm">
                  <div className="flex justify-between border-b border-[#EDEFEF] pb-3">
                    <span className="text-[#8A938D]">Name</span>
                    <span className="text-[#1E2422] font-medium">
                      {profile.firstName || '—'} {profile.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#EDEFEF] pb-3">
                    <span className="text-[#8A938D]">Email</span>
                    <span className="text-[#1E2422] font-medium">{profile.email || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#EDEFEF] pb-3">
                    <span className="text-[#8A938D]">Phone</span>
                    <span className="text-[#1E2422] font-medium">{profile.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#EDEFEF] pb-3 gap-6">
                    <span className="text-[#8A938D] shrink-0">Default site address</span>
                    <span className="text-[#1E2422] font-medium text-right">{formattedAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A938D]">Account Type</span>
                    <span className="text-[#1E2422] font-medium">Residential Customer</span>
                  </div>
                </div>
                <button
                  onClick={startEditingSettings}
                  className="mt-8 border border-[#2563EB] text-[#2563EB] font-semibold text-sm py-2.5 px-5 rounded-md hover:bg-[#2563EB] hover:text-white transition"
                >
                  Edit Details
                </button>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">
                    Your details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SettingsField
                      label="First name"
                      value={settingsDraft.firstName}
                      onChange={(v) => updateSettingsField('firstName', v)}
                    />
                    <SettingsField
                      label="Last name"
                      value={settingsDraft.lastName}
                      onChange={(v) => updateSettingsField('lastName', v)}
                    />
                    <SettingsField
                      label="Email address"
                      value={settingsDraft.email}
                      type="email"
                      onChange={(v) => updateSettingsField('email', v)}
                    />
                    <SettingsField
                      label="Contact number"
                      value={settingsDraft.phone}
                      type="tel"
                      onChange={(v) => updateSettingsField('phone', v)}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#525F58] uppercase tracking-wide mb-3">
                    Default site address
                  </p>
                  <p className="text-xs text-[#8A938D] mb-3">
                    Used to pre-fill new applications — you can still change it per application.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SettingsField
                      label="Property number"
                      value={settingsDraft.propertyNumber}
                      onChange={(v) => updateSettingsField('propertyNumber', v)}
                    />
                    <SettingsField
                      label="Street name"
                      value={settingsDraft.streetName}
                      onChange={(v) => updateSettingsField('streetName', v)}
                    />
                    <SettingsField
                      label="Town"
                      value={settingsDraft.town}
                      onChange={(v) => updateSettingsField('town', v)}
                    />
                    <SettingsField
                      label="Postcode"
                      value={settingsDraft.postcode}
                      onChange={(v) => updateSettingsField('postcode', v)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={saveSettings}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-2.5 px-5 rounded-md transition"
                  >
                    Save changes
                  </button>
                  <button
                    onClick={cancelEditingSettings}
                    className="text-sm font-semibold text-[#525F58] hover:text-[#1E2422] px-5 py-2.5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- SUPPORT ---------------- */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 max-w-xl">
            <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-3">
              Need help?
            </h2>
            <p className="text-sm text-[#525F58] mb-6">
              Our support team is available to help with applications, billing, or emergencies.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between border border-[#EDEFEF] rounded-lg px-5 py-4">
                <span className="text-sm text-[#1E2422] font-medium">General enquiries</span>
                <span className="text-sm text-[#2563EB] font-semibold">0800 111 999</span>
              </div>
              <div className="flex items-center justify-between border border-[#EDEFEF] rounded-lg px-5 py-4">
                <span className="text-sm text-[#1E2422] font-medium">Smell gas / emergency</span>
                <span className="text-sm text-[#2563EB] font-semibold">0800 111 999</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}