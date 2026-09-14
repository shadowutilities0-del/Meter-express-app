import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { syncApplicationsFromServer } from '../utils/applicationsStore';
import { syncProfileFromServer } from '../utils/customerProfileStore';
import { syncTeamMessagesFromServer } from '../utils/teamChatStore';
import PageBackground from '../components/PageBackground';
import logo from '../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser(form);

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const userRole = res.data.user.role?.toLowerCase();

      // Pull this account's real data from MongoDB now, before navigating,
      // so the dashboard's very first render already shows it instead of
      // stale/demo data from localStorage.
      await Promise.all([
        syncApplicationsFromServer(),
        syncProfileFromServer(),
        userRole === 'admin' || userRole === 'staff' ? syncTeamMessagesFromServer() : Promise.resolve(),
      ]);

      if (userRole === 'admin') navigate('/admin-dashboard');
      else if (userRole === 'customer') navigate('/customer-dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBackground className="flex relative">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#8C9B84] to-[#A9B8A0] text-[#1E2422] p-12 relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 700">
          <polygon points="500,0 500,180 320,0" fill="#ffffff" fillOpacity="0.08" />
          <polygon points="500,40 500,260 380,40" fill="#E4F3EA" fillOpacity="0.10" />
          <polygon points="0,700 0,480 180,700" fill="#ffffff" fillOpacity="0.07" />
          <polygon points="40,700 40,520 220,700" fill="#E4F3EA" fillOpacity="0.09" />
          <polygon points="260,260 340,340 260,420 180,340" fill="#ffffff" fillOpacity="0.05" />
        </svg>
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-[#F6F1E7]/30 blur-3xl"></div>
        <div className="absolute top-1/3 -left-16 w-[250px] h-[250px] rounded-full bg-[#B5651D]/15 blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-16">
            <img src={logo} alt="Meter Express Ltd" className="w-9 h-9 object-contain" />
            <span className="font-display text-xl font-semibold">Meter Express Ltd</span>
          </div>

          <h2 className="font-display text-[36px] leading-tight font-semibold mb-5 max-w-[380px]">
            Manage your utilities connection, all in one place.
          </h2>
          <p className="text-[#3D453D] text-sm leading-relaxed max-w-[340px]">
            Sign in to track applications, manage your account, and get support whenever you need it.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-xs text-[#3D453D]">
          <span>24/7 Emergency Support</span>
          <span>Trusted utilities Network</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-1">Sign In</h1>
          <p className="text-sm text-[#525F58] mb-6">Access your account</p>

          {location.state?.registered && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-6">
              Account created successfully! Please sign in.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D] focus:ring-1 focus:ring-[#B5651D]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 pr-16 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D] focus:ring-1 focus:ring-[#B5651D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A938D] hover:text-[#525F58]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold text-sm py-3.5 rounded-md transition shadow-[0_4px_12px_rgba(181,101,29,0.25)] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-right">
              <span className="text-sm text-[#525F58]">Forgotten your password? </span>
              <Link to="/forgot-password" className="text-sm font-semibold text-[#B5651D] hover:text-[#D97D34]">
                Click here
              </Link>
            </div>
          </form>

          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-[#CBD0CA]"></div>
            <span className="text-sm text-[#525F58]">or</span>
            <div className="flex-1 h-px bg-[#CBD0CA]"></div>
          </div>

          <Link
            to="/register"
            className="block w-full text-center border border-[#B5651D] text-[#B5651D] font-semibold text-sm py-3.5 rounded-md hover:bg-[#B5651D] hover:text-white transition"
          >
            Create Account
          </Link>
        </div>
      </div>
    </PageBackground>
  );
} 