
import React, { useState } from 'react';
import {
  User,
  MapPin,
  Tag,
  Phone,
  Calendar,
  Shield,
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const INTEREST_OPTIONS = [
  'Tech & AI', 'UI/UX Design', 'WebSockets', 'Open Source',
  'Cloud Architecture', 'Productivity', 'Gaming', 'Coffee & Code'
];

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    avatar: user?.avatar || '',
    dob: user?.dob || '',
    mobileNumber: user?.mobileNumber || '',
    gender: user?.gender || '',
    bio: user?.bio || '',
    location: user?.location || '',
    interests: user?.interests || [],
    privacy: user?.privacy || { showDob: false, showMobile: false, showLocation: true },
    status: user?.status || 'Available on ChatSphere'
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

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

    if (formData.mobileNumber) {
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(formData.mobileNumber.trim())) {
        setError('Please enter a valid international mobile number (e.g. +14155552671)');
        return;
      }
    }

    setLoading(true);
    try {
      await updateUserProfile(formData);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const presetAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in my-6">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <span>Profile & Privacy Settings</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar selector */}
          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
            <img
              src={formData.avatar || user?.avatar}
              alt="avatar"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/40"
            />
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-slate-300 mb-1">Choose an Avatar</p>
              <div className="flex gap-2">
                {presetAvatars.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: av })}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${formData.avatar === av ? 'border-indigo-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                  >
                    <img src={av} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Contact & Demographics */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                placeholder="+14155552671"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Gender & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bio</label>
            <textarea
              rows={2}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Privacy Toggles */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Controls</span>
            </span>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Show location on public profile</span>
              <input
                type="checkbox"
                checked={formData.privacy.showLocation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    privacy: { ...formData.privacy, showLocation: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Show mobile number to contacts</span>
              <input
                type="checkbox"
                checked={formData.privacy.showMobile}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    privacy: { ...formData.privacy, showMobile: e.target.checked }
                  })
                }
                className="rounded accent-indigo-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
