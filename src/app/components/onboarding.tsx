import React, { useState } from 'react';
import { User, UserRole } from '../App';
import { ChevronRight, Globe, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import backgroundImage from 'figma:asset/4ff685ce06753bb8241b79c63a7aa3311c69db61.png';
import logo from 'figma:asset/f071fbeb1656a03851eee645d222a7d311cf60d6.png';
import { api } from '../lib/api';

interface OnboardingProps {
  onComplete: (user: User) => void;
  onSignIn: () => void;
}

export function Onboarding({ onComplete, onSignIn }: OnboardingProps) {
  const [language, setLanguage] = useState<'en' | 'sw'>('en');
  const [hasCooperative, setHasCooperative] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'farmer' as UserRole,
    cooperative: '',
    region: '',
  });

  const translations = {
    en: {
      welcome: 'Welcome to FarmEcho',
      subtitle: 'Connect. Decide. Prosper Together.',
      yourDetails: 'Your Details',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      password: 'Password',
      role: 'Your Role',
      farmer: 'Individual Farmer',
      leader: 'Cooperative Leader',
      expert: 'Agricultural Expert',
      cooperative: 'Your Cooperative',
      region: 'Your Region',
      joinCommunity: 'Join Community',
      nairobi: 'Nairobi',
      kisumu: 'Kisumu',
      mombasa: 'Mombasa',
      nakuru: 'Nakuru',
      eldoret: 'Eldoret',
      transnzoia: 'Trans-Nzoia',
      hasCooperative: 'Are you part of a cooperative?',
      yesCooperative: 'Yes, I belong to a cooperative',
      noCooperative: 'No, I am an independent farmer',
      independentFarmer: 'Independent Farmer',
      hasAccount: 'Already have an account?',
      signIn: 'Sign In',
      back: 'Back',
    },
    sw: {
      welcome: 'Karibu FarmEcho',
      subtitle: 'Unganisha. Amua. Stawi Pamoja.',
      yourDetails: 'Maelezo Yako',
      fullName: 'Jina Kamili',
      phoneNumber: 'Nambari ya Simu',
      password: 'Neno la Siri',
      role: 'Jukumu Lako',
      farmer: 'Mkulima Binafsi',
      leader: 'Kiongozi wa Ushirika',
      expert: 'Mtaalamu wa Kilimo',
      cooperative: 'Ushirika Wako',
      region: 'Mkoa Wako',
      joinCommunity: 'Jiunge na Jamii',
      nairobi: 'Nairobi',
      kisumu: 'Kisumu',
      mombasa: 'Mombasa',
      nakuru: 'Nakuru',
      eldoret: 'Eldoret',
      transnzoia: 'Trans-Nzoia',
      hasCooperative: 'Je, wewe ni sehemu ya ushirika?',
      yesCooperative: 'Ndiyo, niko kwenye ushirika',
      noCooperative: 'Hapana, mimi ni mkulima huru',
      independentFarmer: 'Mkulima Huru',
      hasAccount: 'Una akaunti tayari?',
      signIn: 'Ingia',
      back: 'Rudi',
    },
  };

  const t = translations[language];

  const regions = [
    { value: 'nairobi', label: t.nairobi },
    { value: 'kisumu', label: t.kisumu },
    { value: 'mombasa', label: t.mombasa },
    { value: 'nakuru', label: t.nakuru },
    { value: 'eldoret', label: t.eldoret },
    { value: 'transnzoia', label: t.transnzoia },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roleMap = formData.role === 'leader' ? 'cooperative_leader' : formData.role === 'expert' ? 'agricultural_expert' : 'farmer';
      const email = formData.phone.includes('@') ? formData.phone : `${formData.phone.replace(/[^0-9]/g, '')}@farm.com`;
      const res = await api.register({
        fullName: formData.name,
        email,
        phone: formData.phone,
        password: formData.password,
        role: roleMap,
      });
      const apiUser = res.user;
      const token = res.token;
      if (token) {
        localStorage.setItem('farm_echo_session_token', token);
      }
      const user: User = {
        id: apiUser.id || Date.now().toString(),
        name: apiUser.fullName || formData.name,
        role: formData.role,
        cooperative: hasCooperative ? formData.cooperative : t.independentFarmer,
        region: formData.region || apiUser.location || 'nairobi',
        language,
        phone: apiUser.phone || formData.phone,
        password: formData.password,
      };
      onComplete(user);
    } catch (err: any) {
      console.error(err);
      const user: User = {
        id: Date.now().toString(),
        ...formData,
        cooperative: hasCooperative ? formData.cooperative : t.independentFarmer,
        language,
      };
      onComplete(user);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fadeIn">
          <div className="text-center mb-6">
            <div className="mb-4">
              <img src={logo} alt="FarmEcho" className="h-12 w-12 rounded-full object-contain bg-white p-1.5 mx-auto border-2 border-[#2D5016]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2D5016]">{t.welcome}</h2>
            <p className="text-[#8B6F47] text-sm mt-1">{t.subtitle}</p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Globe className="w-4 h-4 text-[#2D5016]" />
            <div className="flex items-center gap-1 bg-[#F5F1E8] rounded-full p-1">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-[#2D5016] text-white' : 'text-[#2D5016] hover:bg-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('sw')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  language === 'sw' ? 'bg-[#2D5016] text-white' : 'text-[#2D5016] hover:bg-white'
                }`}
              >
                SW
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-2">
                {t.fullName}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
                placeholder={language === 'en' ? 'Enter your name' : 'Weka jina lako'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-2">
                {t.phoneNumber}
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
                placeholder="+254 7XX XXX XXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-2">
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg pr-12"
                  placeholder={language === 'en' ? 'Create a password' : 'Unda neno la siri'}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B6F47] hover:text-[#2D5016]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'en' ? 'Minimum 6 characters' : 'Angalau herufi 6'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-2">
                {t.role}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
              >
                <option value="farmer">{t.farmer}</option>
                <option value="leader">{t.leader}</option>
                <option value="expert">{t.expert}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-2">
                {t.region}
              </label>
              <select
                required
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
              >
                <option value="">{language === 'en' ? 'Select region' : 'Chagua mkoa'}</option>
                {regions.map((region) => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cooperative Status */}
            <div>
              <label className="block text-sm font-medium text-[#2D5016] mb-3">
                {t.hasCooperative}
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setHasCooperative(true)}
                  className={`w-full py-3 px-4 rounded-lg border-2 transition-all text-left ${
                    hasCooperative
                      ? 'bg-[#2D5016] text-white border-[#2D5016]'
                      : 'bg-white text-[#2D5016] border-[#8B6F47] hover:bg-[#F5F1E8]'
                  }`}
                >
                  {t.yesCooperative}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasCooperative(false);
                    setFormData({ ...formData, cooperative: '' });
                  }}
                  className={`w-full py-3 px-4 rounded-lg border-2 transition-all text-left ${
                    !hasCooperative
                      ? 'bg-[#2D5016] text-white border-[#2D5016]'
                      : 'bg-white text-[#2D5016] border-[#8B6F47] hover:bg-[#F5F1E8]'
                  }`}
                >
                  {t.noCooperative}
                </button>
              </div>
            </div>

            {/* Cooperative Name - Only show if user has cooperative */}
            {hasCooperative && (
              <div>
                <label className="block text-sm font-medium text-[#2D5016] mb-2">
                  {t.cooperative}
                </label>
                <input
                  type="text"
                  required
                  value={formData.cooperative}
                  onChange={(e) => setFormData({ ...formData, cooperative: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#8B6F47] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5016] text-lg"
                  placeholder={language === 'en' ? 'Enter cooperative name' : 'Weka jina la ushirika'}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-[#2D5016] text-white rounded-xl hover:bg-[#3D6B1F] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {t.joinCommunity}
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="text-center mt-4 text-sm text-gray-500">
              {t.hasAccount}{' '}
              <button type="button" className="text-[#2D5016] font-semibold hover:underline" onClick={onSignIn}>
                {t.signIn}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
