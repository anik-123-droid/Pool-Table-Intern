import React, { useState, useEffect } from 'react';
import { X, Users, Clock, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const WaitlistModal = ({ isOpen, onClose, onStatusChange }) => {
  const { addToast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableType, setTableType] = useState('Any');

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/waitlist/status');
      setStatus(data);
    } catch (error) {
      console.error('Error fetching waitlist status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleJoin = async () => {
    setSubmitting(true);
    const prevStatus = status;
    const estimatedPos = (status?.totalWaiting || 0) + 1;
    
    // Instant optimistic update
    setStatus({
      isOnWaitlist: true,
      position: estimatedPos,
      totalWaiting: estimatedPos
    });
    addToast('Successfully joined waitlist', 'success');
    onStatusChange?.();

    try {
      await api.post('/waitlist/join', { tableType });
      await fetchStatus();
      onStatusChange?.();
    } catch (error) {
      setStatus(prevStatus);
      addToast(error.response?.data?.message || 'Failed to join waitlist', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = async () => {
    setSubmitting(true);
    const prevStatus = status;

    // Instant optimistic update
    setStatus({
      isOnWaitlist: false,
      position: 0,
      totalWaiting: Math.max(0, (status?.totalWaiting || 1) - 1)
    });
    addToast('Left waitlist', 'success');
    onStatusChange?.();

    try {
      await api.post('/waitlist/leave');
      await fetchStatus();
      onStatusChange?.();
    } catch (error) {
      setStatus(prevStatus);
      addToast(error.response?.data?.message || 'Failed to leave waitlist', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card w-[450px] max-w-full rounded-[40px] border border-white/10 p-8 relative neon-shadow-blue"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Users className="text-primary w-8 h-8" />
            </div>
            <h2 className="text-2xl font-h1 uppercase tracking-tighter mb-2">Queue <span className="text-primary">Master</span></h2>
            <p className="text-on-surface-variant/60 font-bold uppercase tracking-[0.2em] text-[10px]">Lounge Waitlist System</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : status?.isOnWaitlist ? (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-2">Your Current Position</p>
                <p className="text-4xl font-body font-bold text-primary mb-2">#{status.position}</p>
                <p className="text-xs font-medium text-on-surface-variant/60">Estimated wait time: ~{status.position * 15} mins</p>
              </div>

              <div className="flex items-center gap-3 bg-secondary/5 border border-secondary/20 p-4 rounded-2xl text-secondary text-xs">
                <Clock className="w-4 h-4 shrink-0" />
                <p className="font-medium">We'll notify you via SMS and App as soon as a table becomes available.</p>
              </div>

              <button 
                onClick={handleLeave}
                disabled={submitting}
                className="w-full py-4 bg-white/5 hover:bg-error/10 hover:text-error hover:border-error/30 text-on-surface-variant font-h1 text-sm uppercase tracking-wider rounded-2xl border border-white/10 transition-all"
              >
                {submitting ? 'Processing...' : 'Leave Waitlist'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm text-on-surface-variant/80">All tables are currently occupied. Join the waitlist to secure the next available slot.</p>
              </div>

              <div>
                <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-2 px-1">Table Preference</label>
                <select 
                  value={tableType}
                  onChange={(e) => setTableType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-on-surface focus:border-primary/50 font-body text-sm appearance-none outline-none"
                >
                  <option value="Any" className="bg-[#1a1a1a] text-white">Any Available Table</option>
                  <option value="7FT JUNIOR" className="bg-[#1a1a1a] text-white">7ft Junior Zone</option>
                  <option value="8FT STANDARD" className="bg-[#1a1a1a] text-white">8ft Standard Floor</option>
                  <option value="9FT TOURNAMENT" className="bg-[#1a1a1a] text-white">9ft Tournament Pro</option>
                </select>
              </div>

          <button 
            onClick={handleJoin}
            disabled={submitting}
            className="w-full py-4 bg-primary text-white font-h1 text-base uppercase tracking-wider rounded-2xl shadow-md transition-all hover:bg-primary/90"
          >
                {submitting ? 'Joining...' : 'Join Waitlist'}
              </button>
              
              <div className="flex justify-center gap-4">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                  <Users className="w-3 h-3" /> {status?.totalWaiting} Waiting
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WaitlistModal;
