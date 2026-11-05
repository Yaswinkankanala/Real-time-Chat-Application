import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ChatSphereLogo from '../common/ChatSphereLogo';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';
import {
  Lock,
  Mail,
  User,
  LogIn,
  UserPlus,
  AlertCircle,
  Phone,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  Camera,
  Upload
} from 'lucide-react';

export default function LoginModal() {
  const { loginWithEmail, registerWithEmail, loginWithGoogleAuth, authError } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    login: '', // for sign in (email or username)
    displayName: '',
    username: '',
    email: '',
    mobileNumber: '',
    gender: '',
    dob: '',
    avatar: '',
    password: '',
    confirmPassword: ''
  });

  const [previewAvatar, setPreviewAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setLocalError('');
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];

    if (!validMimes.includes(file.type.toLowerCase()) && !validExts.includes(ext)) {
      setLocalError('Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('File size exceeds limit of 5MB. Please upload a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Show immediate preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewAvatar(reader.result);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    setLocalError('');
    try {
      const res = await api.uploadFile(file);
      if (!res?.url) {
        throw new Error('Upload response did not return a valid file URL');
      }
      setFormData((prev) => ({ ...prev, avatar: res.url }));
    } catch (err) {
      setLocalError('Failed to upload image: ' + err.message);
      setFormData((prev) => ({ ...prev, avatar: '' }));
      setPreviewAvatar('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (uploadingAvatar) {
      setLocalError('Please wait for your profile photo to finish uploading.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Validations
        if (!formData.avatar) {
          throw new Error('Profile photo is required. Please upload a photo to continue.');
        }
        if (!formData.displayName.trim()) {
          throw new Error('Full Name is required');
        }
        if (!formData.username.trim()) {
          throw new Error('Username is required');
        }
        if (!formData.email.trim()) {
          throw new Error('Email address is required');
        }
        if (!formData.mobileNumber.trim()) {
          throw new Error('Contact number is required');
        }
        if (!formData.gender) {
          throw new Error('Please select your gender');
        }
        if (!formData.dob) {
          throw new Error('Date of Birth is required');
        }
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        await registerWithEmail({
          displayName: formData.displayName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          gender: formData.gender,
          dob: formData.dob,
          avatar: formData.avatar,
          password: formData.password
        });
      } else {
        // Sign In
        if (!formData.login.trim()) {
          throw new Error('Please enter your email or username');
        }
        if (!formData.password) {
          throw new Error('Please enter your password');
        }

        await loginWithEmail(formData.login.trim(), formData.password);
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLocalError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogleAuth();
    } catch (err) {
      setLocalError(err.message || 'Google Authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto select-none">
      {/* Decorative background aura */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-subtle" />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl my-6 transition-colors">
        {/* App Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <ChatSphereLogo size={56} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            ChatSphere
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time messaging with permanent identification codes
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-5 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setLocalError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setLocalError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              isSignUp
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Error notification */}
        {(localError || authError) && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{localError || authError}</span>
          </div>
        )}

        {/* Continue with Google button (Available on both Sign In & Sign Up) */}
        <div className="mb-4">
          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
              {isSignUp ? 'or register with email' : 'or continue with email'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isSignUp ? (
            /* ----------------- SIGN IN FIELDS ----------------- */
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="login"
                    required
                    autoFocus
                    value={formData.login}
                    onChange={handleChange}
                    placeholder="Enter email or username"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ----------------- SIGN UP FIELDS ----------------- */
            <>
              {/* Profile Photo Upload Field */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  {previewAvatar ? (
                    <img
                      src={previewAvatar}
                      alt="Preview"
                      className="w-13 h-13 rounded-full object-cover ring-2 ring-indigo-500/50"
                      onError={(e) => handleAvatarError(e, formData.displayName || 'User')}
                    />
                  ) : (
                    <div className="w-13 h-13 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center ring-2 ring-dashed ring-slate-300 dark:ring-slate-700">
                      <Camera className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-500 transition"
                  >
                    <Camera className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Profile Photo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    {uploadingAvatar ? (
                      <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3 text-indigo-500" />
                    )}
                    <span>{uploadingAvatar ? 'Uploading...' : previewAvatar ? 'Change Photo' : 'Select Photo'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Compulsory. Allowed: JPG, PNG, WEBP (Max 5MB)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                      })
                    }
                    placeholder="unique_username"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@domain.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    required
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
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
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Unique code generated automatically upon signup</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                </button>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign In to ChatSphere</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setLocalError('');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setLocalError('');
                  }}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
