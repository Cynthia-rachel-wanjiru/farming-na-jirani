import React, { useState } from 'react';
import { User, UserRole } from '../App';
import { ChevronLeft, LogIn, Globe, Eye, EyeOff } from 'lucide-react';
import backgroundImage from 'figma:asset/4ff685ce06753bb8241b79c63a7aa3311c69db61.png';
import logo from 'figma:asset/f071fbeb1656a03851eee645d222a7d311cf60d6.png';
import { api } from '../lib/api';

interface SignInProps {
  onSignIn: (user: User) => void;
  onBack: () => void;
  onSignUp: () => void;
}

export function SignIn({ onSignIn, onBack, onSignUp }: SignInProps) {
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [error, setError] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const t = {
    en: {
      title: 'Welcome Back',
      subtitle: 'Sign in to your FarmEcho account',
      phone: 'Phone Number',
      password: 'Password',
      name: 'Full Name',
      role: 'Your Role',
      signIn: 'Sign In',
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      back: 'Back',
      farmer: 'Individual Farmer',
      leader: 'Cooperative Leader',
      expert: 'Agricultural Expert',
      error: 'Account not found. Please check your details or sign up.',
      forgotPassword: 'Forgot Password?',
      resetTitle: 'Reset Password',
      resetSubtitle: 'Enter your phone number to reset your password',
      resetButton: 'Reset Password',
      resetSuccess: 'Password reset link sent to your phone number',
    },
    sw: {
      title: 'Karibu Tena',
      subtitle: 'Ingia kwenye akaunti yako ya FarmEcho',
      phone: 'Nambari ya Simu',
      password: 'Neno la Siri',
      name: 'Jina Kamili',
      role: 'Jukumu Lako',
      signIn: 'Ingia',
      noAccount: 'Huna akaunti?',
      signUp: 'Jisajili',
      back: 'Rudi',
      farmer: 'Mkulima Binafsi',
      leader: 'Kiongozi wa Ushirika',
      expert: 'Mtaalamu wa Kilimo',
      error: 'Akaunti haikupatikana. Angalia maelezo yako au jisajili.',
      forgotPassword: 'Umesahau Neno la Siri?',
      resetTitle: 'Sukari Neno la Siri',
      resetSubtitle: 'Ingiza nambari yako ya simu kusukari neno la siri',
      resetButton: 'Sukari Neno la Siri',
      resetSuccess: 'Ujumbe wa sukari neno la siri imeunzwa kwenye nambari yako ya simu',
    },
  }[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !password.trim()) {
      setError(t.error);
      return;
    }
    try {
      // Try to login with email if looks like email, else use phone as email fallback? backend expects email
      const email = phone.includes('@') ? phone.trim() : `${phone.trim().replace(/[^0-9]/g, '')}@farm.com`;
      const res = await api.login({ email, password: password.trim() });
      const apiUser = res.user;
      const token = res.token;
      if (token) {
        localStorage.setItem('farm_echo_session_token', token);
      }
      const user: User = {
        id: apiUser.id || Date.now().toString(),
        name: apiUser.fullName || name.trim() || 'User',
        phone: apiUser.phone || phone.trim(),
        password: password.trim(),
        role: apiUser.role === 'cooperative_leader' ? 'leader' : apiUser.role === 'agricultural_expert' ? 'expert' : 'farmer',
        cooperative: apiUser.cooperative || (role === 'farmer' ? 'Independent Farmer' : role === 'leader' ? 'My Cooperative' : 'Kenya Agricultural Board'),
        region: apiUser.location || apiUser.region || 'nairobi',
        language,
      };
      onSignIn(user);
    } catch (err: any) {
      setError(err?.message || t.error);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPhone.trim()) {
      setError(t.error);
      return;
    }
    // Simulate password reset
    setResetSuccess(true);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md relative z-10">
        {showForgotPassword ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setShowForgotPassword(false)} className="text-[#8B6F47] hover:text-[#2D5016]">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#2D5016]">{t.resetTitle}</h1>
                <p className="text-[#8B6F47] text-sm">{t.resetSubtitle}</p>
              </div>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-1">{t.phone}</label>
                <input
                  type="tel"
                  required
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-base"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
              )}

              {resetSuccess ? (
                <p className="text-green-500 text-sm bg-green-50 border border-green-200 rounded-lg p-3">{t.resetSuccess}</p>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-[#2D5016] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3D6520] transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  {t.resetButton}
                </button>
              )}
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <img src={logo} alt="FarmEcho" className="h-16 w-16 rounded-full object-contain bg-white p-2 mx-auto border-2 border-[#2D5016] mb-4" />
              <h1 className="text-3xl font-bold text-[#2D5016] mb-1">{t.title}</h1>
              <p className="text-[#8B6F47] text-sm">{t.subtitle}</p>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Globe className="w-4 h-4 text-[#2D5016]" />
              <div className="flex items-center gap-1 bg-[#F5F1E8] rounded-full p-1">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    language === 'en' ? 'bg-[#2D5016] text-white' : 'text-[#2D5016] hover:bg-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('sw')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    language === 'sw' ? 'bg-[#2D5016] text-white' : 'text-[#2D5016] hover:bg-white'
                  }`}
                >
                  SW
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-1">{t.name}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-base"
                  placeholder={language === 'en' ? 'Your full name' : 'Jina lako kamili'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-1">{t.phone}</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-base"
                  placeholder="+254 7XX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-1">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-base pr-12"
                    placeholder={language === 'en' ? 'Enter your password' : 'Weka neno la siri'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6F47] hover:text-[#2D5016]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-1">{t.role}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-base"
                >
                  <option value="farmer">{t.farmer}</option>
                  <option value="leader">{t.leader}</option>
                  <option value="expert">{t.expert}</option>
                </select>
              </div>

              {error && (
                <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-[#2D5016] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3D6520] transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                {t.signIn}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#2D5016] hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-gray-500">
              {t.noAccount}{' '}
              <button onClick={onSignUp} className="text-[#2D5016] font-semibold hover:underline">{t.signUp}</button>
            </p>

            <button
              onClick={onBack}
              className="w-full text-center text-[#8B6F47] hover:text-[#2D5016] text-sm flex items-center justify-center gap-1 transition-colors mt-4"
            >
              <ChevronLeft className="w-4 h-4" /> {t.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
