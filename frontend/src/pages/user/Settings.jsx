import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Edit2, Lock, CheckCircle, Eye, EyeOff, ShieldCheck, User, Bell, Sparkles, Sliders, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Settings = () => {
  const { user, updateUser } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      const updatePayload = { name, email, phone, avatar };
      if (password) {
        updatePayload.password = password;
        updatePayload.currentPassword = currentPassword;
      }
      await updateUser(updatePayload);
      setPassword('');
      setCurrentPassword('');
      addToast('Profile updated successfully!', 'success');
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } catch (error) {
      console.error('Update failed:', error);
      addToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen min-w-0">
        <Header
          title="Configuration"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto pb-32">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            {/* Title Section */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-h1 text-on-surface mb-2 tracking-tighter uppercase flex items-center gap-3">
                {isAdmin ? 'Admin Settings' : 'Player Settings'}
              </h1>
              <p className="text-on-surface-variant font-body text-sm">
                {isAdmin ? 'Manage your administrator profile, security credentials, and system access.' : 'Manage your VIP member profile, security credentials, and lounge preferences.'}
              </p>
            </motion.div>

            {/* Grid Layout: Left Column (VIP Card) & Right Column (Settings Form) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

              {/* Left Column: Cyberpunk VIP Member Card */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-5 glass-card p-6 md:p-8 rounded-[32px] border border-outline-variant/20 relative overflow-hidden flex flex-col items-center text-center shadow-xl"
              >

                {/* Avatar with Animated Glow Ring */}
                <div className="relative mb-6 group mt-2">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-primary/40 overflow-hidden bg-primary/10 flex items-center justify-center shadow-[0_0_25px_rgba(22,101,52,0.3)] group-hover:border-primary transition-all">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-h1 text-4xl">{name?.charAt(0).toUpperCase() || 'P'}</span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current.click()}
                    className="absolute bottom-1 right-1 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center border-2 border-background shadow-lg transition-transform"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                </div>

                <h2 className="text-2xl font-h1 text-on-surface uppercase tracking-tight mb-1">{name || (isAdmin ? 'Administrator' : 'VIP Player')}</h2>
                <p className="text-xs font-bold text-on-surface-variant/70 mb-4">{email}</p>

                {/* VIP Membership Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${isAdmin ? 'bg-secondary/15 border-secondary/40 text-secondary shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_12px_rgba(22,101,52,0.2)]'} text-[10px] font-black uppercase tracking-widest mb-6`}>
                  {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAdmin ? (user?.role === 'superadmin' ? 'Super Administrator' : 'Administrator') : 'VIP Elite Member'}
                </div>

                {/* Member Lounge Perks Summary */}
                <div className="w-full bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/15 space-y-2 text-left text-xs mb-6">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-on-surface-variant/70 font-bold uppercase tracking-wider text-[10px]">{isAdmin ? 'Access Level' : 'Lounge Tier'}</span>
                    <span className="text-secondary font-bold">{isAdmin ? 'Full System Access' : 'Gold Elite'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface-variant/70 font-bold uppercase tracking-wider text-[10px]">{isAdmin ? 'Dashboard Access' : 'Priority Booking'}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Enabled</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t border-outline-variant/10">
                    <span className="text-on-surface-variant/70 font-bold uppercase tracking-wider text-[10px]">{isAdmin ? 'Admin ID' : 'Member Pass ID'}</span>
                    <span className="text-primary font-mono font-bold">{isAdmin ? `#ADM-${user?.id ? String(user.id).slice(-4) : '0001'}` : `#VIP-${user?.id ? String(user.id).slice(-4) : '8829'}`}</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Settings & Security Form */}
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-7 space-y-6"
              >
                {/* Personal Information */}
                <div className="glass-card p-6 md:p-8 rounded-[32px] border border-outline-variant/20 space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Personal Information</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Full Name</label>
                      <input
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-sm text-on-surface focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Email Address</label>
                      <input
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-sm text-on-surface focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Contact Number</label>
                      <input
                        type="tel"
                        placeholder="Enter your phone number"
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-sm text-on-surface focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Security Section */}
                <div className="glass-card p-6 md:p-8 rounded-[32px] border border-outline-variant/20 space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-outline-variant/15 pb-4">
                    <Lock className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-on-surface">Security & Credentials</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          placeholder="Current password..."
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 pr-12 text-sm text-on-surface focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 block">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          placeholder="New password..."
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 pr-12 text-sm text-on-surface focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="w-full sm:w-auto bg-primary text-white font-h1 text-sm uppercase tracking-widest py-4 px-10 rounded-2xl hover:brightness-110 transition-all neon-shadow-purple disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? 'Saving Updates...' : showSaved ? (<><CheckCircle className="w-4 h-4 text-emerald-300" /> Saved!</>) : 'Update Profile'}
                  </motion.button>
                </div>
              </motion.div>

            </div>

            {/* Footer space */}
            <div className="pt-8 md:pt-12 pb-4 flex flex-col md:flex-row items-center justify-between border-t border-outline-variant/10 mt-8 md:mt-12 text-[10px] text-on-surface-variant font-medium gap-2">
              <p>© 2026 Neon Night Lounge. Premium Pool Experience.</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-on-surface transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-on-surface transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-on-surface transition-colors">Support</a>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
