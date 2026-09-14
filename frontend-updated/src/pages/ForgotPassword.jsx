import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageBackground from '../components/PageBackground';
import logo from '../assets/logo.png';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      // Backend always returns this same generic message whether or not
      // the email exists, so there's nothing sensitive to branch on here.
      setStatus('sent');
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
          <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-1">Forgot password?</h1>
          <p className="text-sm text-[#525F58] mb-6">
            Enter the email address on your account and we'll send you a link to reset your password.
          </p>

          {status === 'sent' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
              If an account exists for <span className="font-semibold">{email}</span>, we've sent a password
              reset link to it. Check your inbox (and spam folder) — the link expires in 15 minutes.
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
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
                {status === 'loading' ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <p className="text-sm text-[#525F58] mt-7 text-center">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-[#B5651D] hover:text-[#D97D34]">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </PageBackground>
  );
}