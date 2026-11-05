import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Calendar,
  Phone,
  Tag,
  X,
  Check,
  AlertCircle,
  Copy,
  Upload,
  Camera,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const DEFAULT_INTEREST_SUGGESTIONS = [
  'Tech & Coding', 'UI/UX Design', 'WebSockets', 'Open Source',
  'Cloud Architecture', 'Mobile Apps', 'Gaming', 'Music & Art',
  'Photography', 'Reading', 'Fitness', 'Coffee & Code'
];

export default function ProfileModal({ isOpen, onClose }) {
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

  const [customInterest, setCustomInterest] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
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
        interests: Array.isArray(user.interests) ? [...user.interests] : []
      });
      setPreviewAvatar(user.avatar || '');
    }
  }, [user, isOpen]);

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

    // Validate image format
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.mimetype) && !file.type.startsWith('image/')) {
      setError('Please select a valid image (JPG, JPEG, PNG, WEBP).');
      return;
    }

    // Client-side preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewAvatar(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
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

  const handleAddCustomInterest = (e) => {
    e.preventDefault();
    if (!customInterest.trim()) return;
    const tag = customInterest.trim();
    if (!formData.interests.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, tag]
      }));
    }
    setCustomInterest('');
  };

  const handleRemoveInterest = (tag) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((t) => t !== tag)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate 8 mandatory fields
    if (!formData.displayName.trim()) {
      setError('Full Name is mandatory');
      return;
    }
    if (!formData.username.trim()) {
      setError('Username is mandatory');
      return;
    }
    if (!formData.gender) {
      setError('Gender is mandatory');
      return;
    }
    if (!formData.dob) {
      setError('Date of Birth is mandatory');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Contact Number is mandatory');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email Address is mandatory');
      return;
    }
    if (!formData.avatar && !previewAvatar) {
      setError('Profile Photo is mandatory. Please select an image.');
      return;
    }
    if (formData.interests.length === 0) {
      setError('Please select or add at least one interest.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl my-6 transition-colors max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">My Profile</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">View and update your personal details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Read-Only Unique Identification Code */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Unique Identification Code (Permanent)
              </span>
              <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white tracking-wider">
                {user.uniqueCode}
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Friends can find and chat with you using this permanent code.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Profile Photo Upload with Device Picker & Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={previewAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formData.displayName || 'User')}`}
                alt="Profile Preview"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/40 shadow"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs font-bold text-slate-900 dark:text-white block mb-0.5">
                Profile Photo <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Select from your device media (JPG, PNG, WEBP).
              </p>
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
                  <span className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>{uploadingAvatar ? 'Uploading...' : 'Upload from device'}</span>
              </button>
            </div>
          </div>

          {/* Grid: Full Name & Username */}
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
                placeholder="e.g. John Doe"
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
                placeholder="e.g. johndoe"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Grid: Email & Contact Number */}
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
                placeholder="name@domain.com"
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
                placeholder="e.g. +91 9876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Grid: Gender & Date of Birth */}
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

          {/* Bio (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              About / Bio
            </label>
            <textarea
              rows={2}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell others a little about yourself..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Interests (Mandatory: pick or add tags) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Interests <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Select suggested interests or add your own custom tags.
            </p>

            {/* Selected interests chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {formData.interests.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(tag)}
                    className="hover:text-rose-500 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Custom interest tag input */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomInterest(e);
                  }
                }}
                placeholder="Add custom interest (press Enter)..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustomInterest}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggested interest pills */}
            <div className="flex flex-wrap gap-1">
              {DEFAULT_INTEREST_SUGGESTIONS.map((item) => {
                const isSelected = formData.interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleInterest(item)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingAvatar}
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
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
