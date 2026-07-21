import React, { useState } from 'react';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function LoginScreen({ onBack, onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { login, register: authRegister, loading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      if (isRegisterMode) {
        await authRegister(data.email, data.password, data.name || 'User');
        toast.success('Account created!');
      } else {
        await login(data.email, data.password, data.rememberMe);
        toast.success('Welcome back!');
      }
      onLogin();
    } catch (err) {
      toast.error(err.message || (isRegisterMode ? 'Registration failed' : 'Login failed'));
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    reset();
  };

  return (
    <motion.div
      className="flex-1 flex flex-col bg-[#070b13] p-6 relative"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header back button */}
      <motion.button 
        onClick={onBack}
        className="self-start text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900/50 border border-slate-800/80 mb-6"
        whileTap={{ scale: 0.9 }}
        aria-label="Go back to splash screen"
      >
        <ChevronLeft size={20} />
      </motion.button>

      {/* Brand & Greetings */}
      <div className="flex flex-col items-center mb-8">
        {/* Tiny Hexagon N Logo */}
        <div className="w-14 h-16 relative mb-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">
          <svg viewBox="0 0 100 115" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            <path d="M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87 Z" fill="url(#logoGradSmall)" />
            <path d="M30 30 L45 30 L70 70 L70 30 L80 30 L80 85 L65 85 L40 45 L40 85 L30 85 Z" fill="#ffffff" opacity="0.9" />
          </svg>
        </div>
        <h2 className="text-white text-lg font-semibold tracking-wide">{isRegisterMode ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-slate-400 text-xs mt-1">{isRegisterMode ? 'Sign up to get started' : 'Sign in to continue'}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {isRegisterMode && (
            <div>
              <input 
                type="text" 
                placeholder="Full Name"
                {...register('name', { required: isRegisterMode ? 'Name is required' : false })}
                className={`w-full px-4 py-3 bg-slate-900/60 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200 ${errors.name ? 'border-rose-500/60' : 'border-slate-800/80'}`}
                aria-label="Full Name"
              />
              {errors.name && (
                <p className="text-[10px] text-rose-400 mt-1 ml-1">{errors.name.message}</p>
              )}
            </div>
          )}
          <div>
            <input 
              type="text" 
              placeholder="Email or Phone"
              {...register('email', { required: 'Email is required' })}
              className={`w-full px-4 py-3 bg-slate-900/60 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200 ${errors.email ? 'border-rose-500/60' : 'border-slate-800/80'}`}
              aria-label="Email or Phone"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-[10px] text-rose-400 mt-1 ml-1">{errors.email.message}</p>
            )}
          </div>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' },
              })}
              className={`w-full px-4 py-3 pr-10 bg-slate-900/60 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200 ${errors.password ? 'border-rose-500/60' : 'border-slate-800/80'}`}
              aria-label="Password"
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {errors.password && (
              <p className="text-[10px] text-rose-400 mt-1 ml-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input 
                type="checkbox"
                {...register('rememberMe')}
                className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
              />
              Remember me
            </label>
            <button type="button" className="text-blue-400 hover:underline cursor-pointer" onClick={() => toast('Reset link sent to your email', { icon: '📧' })}>Forgot Password?</button>
          </div>
        </div>

        {/* Action button & Oauth */}
        <div className="mt-8 space-y-6">
          <motion.button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <>
                <LoadingSpinner size={16} className="text-white" />
                {isRegisterMode ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isRegisterMode ? 'CREATE ACCOUNT' : 'LOGIN'
            )}
          </motion.button>

          {/* Social Sign-in */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-slate-800/60"></div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">or</span>
              <div className="flex-1 h-[1px] bg-slate-800/60"></div>
            </div>

            <div className="flex justify-center gap-4">
              {/* Google Button */}
              <motion.button 
                type="button" 
                onClick={() => {
                  toast.success('Google sign-in successful');
                  onLogin();
                }}
                className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 hover:bg-slate-800/60 flex items-center justify-center cursor-pointer"
                whileTap={{ scale: 0.9 }}
                aria-label="Sign in with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.185 15.39 1 12.24 1 5.922 1 1 5.922 1 12s4.922 11 11.24 11c6.6 0 11-4.636 11-11.182 0-.755-.078-1.33-.178-1.818H12.24z" />
                </svg>
              </motion.button>
              {/* Apple Button */}
              <motion.button 
                type="button" 
                onClick={() => {
                  toast.success('Apple sign-in successful');
                  onLogin();
                }}
                className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 hover:bg-slate-800/60 flex items-center justify-center cursor-pointer"
                whileTap={{ scale: 0.9 }}
                aria-label="Sign in with Apple"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.62.72-1.16 1.86-1.01 2.98 1.12.09 2.26-.58 2.96-1.43z" />
                </svg>
              </motion.button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400">
            {isRegisterMode ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" className="text-blue-400 hover:underline cursor-pointer" onClick={toggleMode}>{isRegisterMode ? 'Sign In' : 'Sign Up'}</button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
