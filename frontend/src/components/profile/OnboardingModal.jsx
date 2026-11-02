import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatSphereLogo from '../common/ChatSphereLogo';
import { 
  User, 
  Mail, 
  Calendar, 
  Phone, 
  Sparkles, 
  Check, 
  AlertCircle,
  MapPin,
  Tag,
  Shield,
  ArrowRight
} from 'lucide-react';

const INTEREST_OPTIONS = [
  'Tech & AI', 'UI/UX Design', 'WebSockets', 'Open Source', 
  'Cloud Architecture', 'Productivity', 'Gaming', 'Coffee & Code'
];

export default function OnboardingModal({ isOpen }) {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    email: user?.email || '',
    dob: user?.dob || '',
    mobileNumber: user?.mobileNumber || '',
    gender: user?.gender || '',
    avatar: user?.avatar || '',
    bio: user?.bio || '',
    location: user?.location || '',
    interests: user?.interests || ['Tech & AI'],
    privacy: user?.privacy || { showDob: false, showMobile: false, showLocation: true }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        displayName: user.displayName || prev.displayName,
        username: user.username || prev.username,
        email: user.email || prev.email,
        avatar: user.avatar || prev.avatar,
        dob: user.dob || prev.dob,
        mobileNumber: user.mobileNumber || prev.mobileNumber,
        gender: user.gender || prev.gender,
        bio: user.bio || prev.bio,
        location: user.location || prev.location
      }));
    }
  }, [user]);

  if (!isOpen) return null;

  // Calculate profile completion percentage
  const calculateProgress = () => {
    let score = 0;
    if (formData.displayName) score += 20;
    if (formData.username) score += 20;
    if (formData.dob) score += 15;
    if (formData.mobileNumber) score += 15;
    if (formData.gender) score += 15;
    if (formData.bio || formData.location) score += 15;
    return Math.min(100, score);
  };

  const progress = calculateProgress();

  const handleInterestToggle = (tag) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(tag);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((t) => t !== tag) : [...prev.interests, tag]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.displayName.trim()) {
      setError('Full Name is required');
      return;
    }
    if (!formData.username.trim()) {
      setError('Unique Username is required');
      return;
    }
    if (!formData.dob) {
      setError('Date of Birth is required');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Mobile Number is required');
      return;
    }
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(formData.mobileNumber.trim())) {
      setError('Please enter a valid international mobile number (e.g. +14155552671)');
      return;
    }
    if (!formData.gender) {
      setError('Please select your gender');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        displayName: formData.displayName,
        username: formData.username,
        dob: formData.dob,
        mobileNumber: formData.mobileNumber,
        gender: formData.gender,
        avatar: formData.avatar,
        bio: formData.bio,
        location: formData.location,
        interests: formData.interests,
        privacy: formData.privacy
      });
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <ChatSphereLogo size={42} />
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Complete Your ChatSphere Profile</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                Step 1 of 1
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Set up your profile to start connecting and chatting in real-time.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Profile Readiness
            </span>
            <span className={progress === 100 ? 'text-emerald-400' : 'text-indigo-400'}>
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Sarah Connor"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="text-slate-500 font-mono absolute left-3 top-2 text-xs">@</span>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="sarah_c"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email (Read-only Google account) & Mobile Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Email (Fixed)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  readOnly
                  disabled
                  value={formData.email}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mobile Number <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="+14155552671"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Date of Birth & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date of Birth <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gender <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Optional: Bio & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Austin, TX or Remote"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bio (Optional)
              </label>
              <input
                type="text"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Product designer & coffee lover ☕"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Interests & Topics</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((tag) => {
                const selected = formData.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInterestToggle(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      selected
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Protection:</strong> Your Mobile Number and Date of Birth are encrypted and kept strictly private. They are never shared publicly or exposed in user search APIs.
            </span>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || progress < 70}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Save Profile & Enter ChatSphere</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

