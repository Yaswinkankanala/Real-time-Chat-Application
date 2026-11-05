import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ChatSphereLogo from '../common/ChatSphereLogo';
import {
  User,
  Mail,
  Calendar,
  Phone,
  Tag,
  Check,
  AlertCircle,
  Upload,
  Camera,
  ArrowRight,
  Sparkles,
  Copy
} from 'lucide-react';

const DEFAULT_INTERESTS = [
  'Tech & Coding', 'UI/UX Design', 'WebSockets', 'Open Source',
  'Cloud Architecture', 'Mobile Apps', 'Gaming', 'Music & Art',
  'Reading', 'Fitness', 'Coffee & Code'
];

export default function OnboardingModal({ isOpen }) {
  const { user, updateUserProfile } = useAuth();

  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    dob: '',
    mobileNumber: '',
    gender: '',
    avatar: '',
    bio: '',
    interests: []
  });

  const [previewAvatar, setPreviewAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        username: user.username || '',
        email: user.email || '',
        dob: user.dob || '',
        mobileNumber: user.mobileNumber || '',
        gender: user.gender || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        interests: Array.isArray(user.interests) && user.interests.length > 0 ? user.interests : ['Tech & Coding']
      });
      setPreviewAvatar(user.avatar || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleCopyCode = () => {
    if (user.uniqueCode) {
      navigator.clipboard.writeText(user.uniqueCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.mimetype) && !file.type.startsWith('image/')) {
      setError('Please select a valid image (JPG, JPEG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewAvatar(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    setError('');
    try {
      const uploadRes = await api.uploadFile(file);
      setFormData((prev) => ({ ...prev, avatar: uploadRes.url }));
      setPreviewAvatar(uploadRes.url);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleInterest = (tag) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(tag);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((t) => t !== tag) : [...prev.interests, tag]
      };
    });
  };

  const calculateProgress = () => {
    let score = 0;
    if (formData.displayName.trim()) score += 15;
    if (formData.username.trim()) score += 15;
    if (formData.email.trim()) score += 15;
    if (formData.mobileNumber.trim()) score += 15;
    if (formData.gender) score += 15;
    if (formData.dob) score += 10;
    if (formData.avatar || previewAvatar) score += 10;
    if (formData.interests.length > 0) score += 5;
    return Math.min(100, score);
  };

  const progress = calculateProgress();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.displayName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!formData.username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!formData.gender) {
      setError('Please select your Gender.');
      return;
    }
    if (!formData.dob) {
      setError('Date of Birth is required.');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Contact Number is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!formData.avatar && !previewAvatar) {
      setError('Profile Photo is required. Please select an image.');
      return;
    }
    if (formData.interests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        displayName: formData.displayName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        gender: formData.gender,
        dob: formData.dob,
        avatar: formData.avatar || previewAvatar,
        bio: formData.bio.trim(),
        interests: formData.interests
      });
    } catch (err) {
      setError(err.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-6 transition-colors max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="text-center mb-4 shrink-0">
          <div className="inline-flex items-center justify-center mb-2">
            <ChatSphereLogo size={48} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Complete Your Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Please fill in your mandatory details to activate your ChatSphere account.
          </p>

          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-right text-slate-400 font-semibold mt-1">
            {progress}% Completed
          </p>
        </div>

        {/* Unique Code Display Banner */}
        {user.uniqueCode && (
          <div className="p-3 mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Your Unique Identification Code
              </span>
              <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                {user.uniqueCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Profile Photo */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={previewAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.displayName || 'User')}`}
                alt="Profile Preview"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/40"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-500 transition"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-0.5">
                Profile Photo <span className="text-rose-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {uploadingAvatar ? (
                  <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 text-indigo-500" />
                )}
                <span>{uploadingAvatar ? 'Uploading...' : 'Choose from device'}</span>
              </button>
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="Unique username"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Email & Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                placeholder="+1 234 567 8900"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Gender & DOB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary / Other">Non-binary / Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Interests (Mandatory) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Your Interests <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_INTERESTS.map((item) => {
                const isSelected = formData.interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleInterest(item)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Setup & Enter ChatSphere</span>
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
