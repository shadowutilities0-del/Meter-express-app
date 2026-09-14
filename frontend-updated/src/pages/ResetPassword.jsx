import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import logo from '../assets/logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Route this at: /reset-password/:resettoken
// (matches the URL the backend puts in the email: `${CLIENT_URL}/reset-password/${resetToken}`)
export default function ResetPassword() {
  const { resettoken } = useParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password/${resettoken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      // Backend logs the user straight in after a successful reset (same
      // response shape as /login), so we can drop them straight into the
      // app instead of making them sign in again.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setStatus('success');
      setTimeout(() => {
        const role = data.user.role?.toLowerCase();
        if (role === 'admin') navigate('/admin-dashboard');
        else if (role === 'customer') navigate('/customer-dashboard');
        else navigate('/');
      }, 1500);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message);
    }
  };

  return (
    <PageBackground className="flex relative">
      {/* Left branding panel — matches Login.jsx exactly */}
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
          <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-1">Set a new password</h1>
          <p className="text-sm text-[#525F58] mb-6">Choose a new password for your account.</p>

          {status === 'success' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
              Password updated. Redirecting you in…
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
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

              <div>
                <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D] focus:ring-1 focus:ring-[#B5651D]"
                />
              </div>

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold text-sm py-3.5 rounded-md transition shadow-[0_4px_12px_rgba(181,101,29,0.25)] disabled:opacity-60"
              >
                {status === 'loading' ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <p className="text-sm text-[#525F58] mt-7 text-center">
            <Link to="/login" className="font-semibold text-[#B5651D] hover:text-[#D97D34]">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </PageBackground>
  );
}