import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import PageBackground from '../components/PageBackground';
import logo from '../assets/logo.png';

// Public sign-up only ever creates a Customer account — Admin/Staff
// accounts can't be self-registered, they're granted by an existing Admin.
const CUSTOMER_ROLE = 'customer';

export default function Register() {
  const navigate = useNavigate();
  const [role] = useState(CUSTOMER_ROLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
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
      const payload = {
        role,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        password: form.password,
      };

      await registerUser(payload);

      navigate('/login', {
        state: { registered: true, email: form.email },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageBackground className="flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[40%] bg-gradient-to-br from-[#8C9B84] to-[#A9B8A0] text-[#1E2422] p-12 relative overflow-hidden sticky top-0 h-screen">
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
            Create your account in minutes.
          </h2>
          <p className="text-[#3D453D] text-sm leading-relaxed max-w-[340px]">
            Join to manage applications, get updates your way, and stay connected with your utilities network.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-8 text-xs text-[#3D453D]">
          <span>24/7 Emergency Support</span>
          <span>Trusted Utilities Network</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-[560px]">
          <h1 className="font-display text-[28px] font-semibold text-[#1E2422] mb-8">
            Create New Account
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Account type — customer sign-up is the only public option, so
                this is an informational banner rather than a picker. Staff
                and Admin accounts are created separately by an existing Admin. */}
            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Account Type
              </label>
              <div className="flex items-center gap-4 border border-[#CBD0CA] bg-white rounded-lg py-4 px-5">
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#F3E3D5] text-xl shrink-0">
                  🏠
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1E2422]">Customer Account</p>
                  <p className="text-xs text-[#8A938D]">
                    Submit applications and manage your utility supply.
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#B5651D] bg-[#F3E3D5] rounded-full px-3 py-1.5 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Selected
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                  First Name <span className="text-[#B5651D]">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  required
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                  Last Name <span className="text-[#B5651D]">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  required
                  className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Phone Number <span className="text-[#B5651D]">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                required
                className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Email Address <span className="text-[#B5651D]">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                required
                className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D]"
              />
              <p className="text-xs text-[#525F58] mt-1.5">
                Please use a permanent email address. Temporary or disposable email addresses are not accepted.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1E2422] mb-1.5">
                Password <span className="text-[#B5651D]">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                minLength={6}
                className="w-full bg-white border border-[#CBD0CA] rounded-md px-4 py-3 text-sm text-[#1E2422] placeholder-[#8A938D] focus:outline-none focus:border-[#B5651D]"
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 border border-[#CBD0CA] text-[#1E2422] font-semibold text-sm py-3.5 rounded-md hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold text-sm py-3.5 rounded-md transition shadow-[0_4px_12px_rgba(181,101,29,0.25)] disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageBackground>
  );
}