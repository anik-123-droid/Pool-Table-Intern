import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const user = await login(email, password);
        if (user.role === 'admin' || user.role === 'superadmin') navigate('/admin');
        else navigate('/');
      } else {
        const user = await register(name, email, password, role);
        if (user.role === 'admin' || user.role === 'superadmin') navigate('/admin');
        else navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (loginTab) => {
    setIsLogin(loginTab);
    setError('');
  };

  return (
    <main className="min-h-screen bg-background flex flex-col relative overflow-hidden text-on-surface font-body">

      {/* Light Background Pattern/Image */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[#F4F0EB]"></div>
        {/* Soft radial gradients for eye comfort */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E5D5C5] rounded-full blur-[100px] opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#E0D4CD] rounded-full blur-[120px] opacity-60"></div>
      </div>


      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full h-full pt-12 pb-24">
        {/* Animated Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center mb-10"
        >
          <h1 className="font-h1 text-5xl md:text-6xl text-on-surface italic uppercase tracking-tighter leading-none">
            ROYAL
          </h1>
          <h1 className="font-h1 text-5xl md:text-6xl italic uppercase tracking-tighter leading-none -mt-1 text-primary drop-shadow-sm">
            CUE CLUB
          </h1>
          <p className="mt-4 text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-[0.4em]">
            Premium Experience
          </p>
        </motion.div>

        {/* Modal Box (Light Glass Card) */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl border border-outline-variant/40 rounded-[32px] p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.05)] relative overflow-hidden"
          style={shakeError ? { animation: 'shakeX 0.6s ease-in-out' } : {}}
        >
          {/* Tabs */}
          <div className="flex w-full mb-10 relative">
            <div className="absolute bottom-0 w-full h-[1px] bg-black/5"></div>

            <button
              type="button"
              onClick={() => toggleTab(true)}
              className={`flex-1 pb-4 text-xs font-h1 italic tracking-[0.2em] uppercase transition-all relative ${isLogin ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Sign In
              {isLogin && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => toggleTab(false)}
              className={`flex-1 pb-4 text-xs font-h1 italic tracking-[0.2em] uppercase transition-all relative ${!isLogin ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Create Account
              {!isLogin && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-8 p-4 bg-error/10 border border-error/20 text-error text-[10px] font-bold uppercase tracking-wider text-center rounded-2xl"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="relative z-10" onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant ml-1">Full Name</label>
                    <div className="relative group rounded-2xl border border-outline-variant bg-white/80 transition-all duration-300 focus-within:border-primary hover:border-outline-variant/80">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 group-focus-within:text-primary transition-colors" />
                      <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-none focus:outline-none focus:ring-0 pl-11 py-4 text-on-surface placeholder:text-on-surface-variant/40 font-body text-sm" placeholder="Name" type="text" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant ml-1">Email Address</label>
                  <div className="relative group rounded-2xl border border-outline-variant bg-white/80 transition-all duration-300 focus-within:border-primary hover:border-outline-variant/80">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <input required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-none focus:outline-none focus:ring-0 pl-11 py-4 text-on-surface placeholder:text-on-surface-variant/40 font-body text-sm" placeholder="Email" type="email" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant ml-1">Password</label>
                  <div className="relative group rounded-2xl border border-outline-variant bg-white/80 transition-all duration-300 focus-within:border-primary hover:border-outline-variant/80">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <input
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 pl-11 pr-11 py-4 text-on-surface placeholder:text-on-surface-variant/40 font-body text-sm"
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary transition-colors focus:outline-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              type="submit"
              className="w-full bg-primary text-white font-h1 text-sm italic py-4 rounded-2xl transition-all flex items-center justify-center gap-3 mt-6 uppercase tracking-[0.2em] shadow-md hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-5 h-5" /></>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </main>
  );
};

export default Login;
