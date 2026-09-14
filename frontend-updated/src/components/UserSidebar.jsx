import { useNavigate } from 'react-router-dom';
import { LayoutGrid, FilePlus, FileText, User, LogOut } from 'lucide-react';

const navItems = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'newApplication', label: 'New Application', icon: FilePlus },
  { key: 'myApplications', label: 'My Applications', icon: FileText },
  { key: 'account', label: 'Account Details', icon: User },
];

export default function UserSidebar({ activeKey, onNavigate }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || { firstName: 'Jordan' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleClick = (item) => {
    if (item.key === 'newApplication') {
      navigate('/new-application-user');
      return;
    }
    if (onNavigate) {
      onNavigate(item.key);
    } else {
      // Called from a page other than UserDashboard (e.g. NewApplicationUser) —
      // go back to the dashboard and land on that tab.
      navigate('/user-dashboard', { state: { tab: item.key } });
    }
  };

  return (
    <aside className="w-[240px] bg-white text-[#1E2422] flex flex-col shrink-0 border-r border-[#EDEFEF]">
      <div className="p-6 border-b border-[#EDEFEF]">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-base font-semibold text-[#1E2422]">My Account</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-[#FBEBC7] text-[#1E2422]' : 'text-[#525F58] hover:bg-[#EDEFEF]'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#B5651D]' : 'text-[#8A938D]'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#EDEFEF]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-display font-semibold text-sm">
            {user.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1E2422]">{user.firstName || 'User'}</p>
            <p className="text-xs text-[#8A938D]">General Access</p>
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
  );
}