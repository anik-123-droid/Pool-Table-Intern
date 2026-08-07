import { useState, useEffect, useContext } from 'react';
import { Search, Bell, User, X, CheckCircle2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const Header = ({ title, onMenuClick }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error(err);
      fetchNotifications(); 
    }
  };

  useEffect(() => {
    if (showNotifications) {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length > 0) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        api.put('/notifications/mark-all-read').catch(console.error);
      }
    }
  }, [showNotifications, notifications]);

  const unreadCount = (Array.isArray(notifications) ? notifications : []).filter(n => !n?.isRead).length;

  return (
    <header className="h-16 bg-background/70 backdrop-blur-2xl flex items-center justify-between px-4 md:px-xl sticky top-0 z-30 relative">
      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 gradient-divider" />
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-1.5 -ml-1.5 text-on-surface-variant hover:text-on-surface transition-colors btn-press"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-xs md:text-sm uppercase tracking-widest font-black text-on-surface italic">{title}</p>
      </div>

      <div className="flex items-center gap-4 relative">
        {user?.role !== 'admin' && user?.role !== 'superadmin' && (
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-on-surface-variant hover:text-on-surface transition-colors btn-press"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-background badge-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute top-full right-0 mt-2 w-80 glass-card border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center relative">
                <div className="absolute bottom-0 left-0 right-0 gradient-divider" />
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface">Notifications</p>
                <button onClick={() => setShowNotifications(false)} className="btn-press"><X className="w-4 h-4 text-on-surface-variant hover:text-on-surface transition-colors" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {(Array.isArray(notifications) ? notifications : []).length > 0 ? (
                  (Array.isArray(notifications) ? notifications : []).map((n, index) => (
                    <motion.div 
                      key={n.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border-b border-outline-variant/5 hover:bg-on-surface/5 transition-all duration-200 relative group table-row-hover ${!n.isRead ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-xs font-bold text-on-surface mb-1">{n.title}</p>
                      <p className="text-[10px] text-on-surface-variant leading-relaxed mb-2">{n.message}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] text-on-surface-variant/70 font-bold uppercase tracking-widest">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                        {!n.isRead && (
                          <motion.button 
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => markAsRead(n.id)}
                            className="text-primary hover:text-secondary p-1 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-8 text-center opacity-50 text-on-surface">
                    <Bell className="w-8 h-8 mx-auto mb-2 animate-float" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No notifications</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
