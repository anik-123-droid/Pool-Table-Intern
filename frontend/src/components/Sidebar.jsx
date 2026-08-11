import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar, ShieldAlert, Settings, LogOut, X } from 'lucide-react';
import { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { 
      opacity: 1, 
      x: 0, 
      transition: { ease: [0.16, 1, 0.3, 1], duration: 0.2 } 
    },
  };

  const navItems = [
    ...(user?.role !== 'admin' && user?.role !== 'superadmin' ? [
      { name: 'Floor Booking', icon: LayoutGrid, path: '/' },
      { name: 'Recent Bookings', icon: Calendar, path: '/my-bookings' }
    ] : []),
    ...(user?.role === 'admin' || user?.role === 'superadmin' 
      ? [
          { name: 'Admin Dashboard', icon: ShieldAlert, path: '/admin' },
          { name: 'Table Management', icon: LayoutGrid, path: '/admin/tables' }
        ] 
      : []
    ),
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const sidebarContent = (
    <aside className="w-[260px] bg-white/95 backdrop-blur-2xl border-r border-outline-variant/30 flex flex-col h-screen relative overflow-hidden shadow-[0_0_50px_rgba(22,101,52,0.15)]">
      {/* Ambient Cyber Neon Edge Glow */}
      <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/10 via-primary/50 to-primary/10 animate-pulse-glow" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <div className="p-6 md:p-8 relative shrink-0">
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden absolute top-6 right-4 p-2 text-on-surface-variant hover:text-on-surface transition-colors btn-press z-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="shimmer-border">
          <h1 className="text-on-surface font-h1 text-2xl md:text-3xl tracking-tighter leading-none mb-1 italic uppercase">Royal Cue</h1>
          <h1 className="font-h1 text-2xl md:text-3xl tracking-tighter leading-none mb-3 italic uppercase gradient-text-neon">Club</h1>
        </div>
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent mb-3 animate-pulse-glow rounded-full" />
        <p className="text-on-surface-variant text-[8px] md:text-[9px] uppercase tracking-[0.3em] font-bold opacity-50">Premium Experience</p>
      </div>

      {/* Navigation Items */}
      <motion.nav 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-4 mt-2 space-y-1.5 overflow-y-auto"
      >
        {navItems.map((item) => (
          <motion.div key={item.name} variants={itemVariants}>
            <NavLink
              to={item.path}
              end={item.path === '/' || item.path === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 relative group ${
                  isActive
                    ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20 border border-primary/30'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-primary/5 hover:translate-x-1'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ${isActive ? 'text-white' : 'text-on-surface-variant group-hover:scale-110 group-hover:text-primary'}`} />
                  <span className={`font-h1 text-xs italic uppercase tracking-wider ${isActive ? 'text-white' : 'text-on-surface font-semibold'}`}>{item.name}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebarActive"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-l-full"
                      style={{ boxShadow: '0 0 10px rgba(22,101,52,0.8)' }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Footer User Profile & Action */}
      <div className="p-6 border-t border-outline-variant/10 relative shrink-0">
        <div className="absolute top-0 left-4 right-4 gradient-divider" />

        {user?.role !== 'admin' && user?.role !== 'superadmin' && (
          <motion.button 
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(22,101,52,0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (onClose) onClose();
              navigate('/');
              setTimeout(() => {
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }, 100);
            }}
            className="w-full bg-primary text-white font-h1 text-sm italic py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-all mb-8 uppercase tracking-[0.2em]"
          >
            Book a Table
          </motion.button>
        )}
 
        <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-2xl border border-outline-variant/30 hover:border-primary/30 transition-all duration-300 group">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden bg-primary/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
              {user?.avatar ? (
                <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-primary font-bold text-base">{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary rounded-full border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-on-surface font-bold text-xs truncate" title={user?.name}>{user?.name || 'Alex Rivers'}</p>
            <p className="text-on-surface-variant/50 text-[9px] font-bold uppercase tracking-wider truncate">
              {user?.role === 'admin' || user?.role === 'superadmin' ? (
                <span className="text-[9px] font-bold uppercase tracking-wider">{user?.role === 'superadmin' ? 'Super Admin' : 'General Manager'}</span>
              ) : (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                  user?.loyaltyTier === 'Gold' ? 'tier-badge-gold' :
                  user?.loyaltyTier === 'Platinum' ? 'tier-badge-platinum' :
                  'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {user?.loyaltyTier && user.loyaltyTier.toLowerCase() !== 'member' ? `${user.loyaltyTier} Member` : 'Member'}
                </span>
              )}
            </p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout}
            className="p-1.5 text-on-surface-variant/40 hover:text-error transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (Always Visible) */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (Animated via Framer Motion) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
              onClick={onClose}
            />

            {/* Ultra Fast Cyber Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
              className="relative z-10 h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
