import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, ArrowRight, Loader2, CalendarCheck } from 'lucide-react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const SmartBookingModal = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setProposal(null);

    try {
      const res = await api.post('/bookings/smart-parse', { text: input });
      setProposal(res.data.proposal);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not understand that. Try "tonight at 8pm"');
    } finally {
      setLoading(false);
    }
  };

    const confirmBooking = async () => {
    setBookingLoading(true);
    try {
      const res = await api.post('/bookings', {
        tableId: proposal.tableId,
        startTime: proposal.startTime,
        durationHours: proposal.durationHours,
        equipment: [],
        useSubscription: false
      });
      onClose();
      navigate(`/booking-success/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-[90vw] min-w-[300px] max-w-md bg-surface-container rounded-3xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto mx-auto"
          >
            <div className="p-6 md:p-8 relative z-10">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-h1 text-xl italic uppercase">AI Concierge</h3>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Smart Booking Assistant</p>
                </div>
              </div>

              {!proposal ? (
                <form onSubmit={handleSearch} className="space-y-4">
                  <p className="text-sm text-on-surface/80">
                    Tell me when you want to visit. For example: <br/>
                    <span className="text-primary italic">"Aaj raat 8 baje 2 ghante ke liye"</span>
                  </p>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your request..."
                      className="w-full bg-background border border-outline-variant/30 rounded-xl px-4 py-4 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-12"
                      autoFocus
                    />
                    <button 
                      type="submit" 
                      disabled={loading || !input.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 transition-all cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>
                  {error && <p className="text-error text-sm mt-2">{error}</p>}
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
                    <CalendarCheck className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-on-surface mb-1">Perfect Table Found!</h4>
                    <p className="text-sm text-on-surface-variant mb-4">
                      We've found a spot for you at <strong className="text-primary">{new Date(proposal.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong> on Table {proposal.tableNumber} for {proposal.durationHours} hours.
                    </p>
                    <div className="bg-background rounded-xl p-3 flex justify-between items-center text-sm border border-outline-variant/20">
                      <span className="text-on-surface-variant">Estimated Total</span>
                      <span className="font-bold text-secondary text-lg">₹{proposal.totalAmount}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setProposal(null); setInput(''); }}
                      className="flex-1 py-3 px-4 rounded-xl border border-outline-variant hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Try Again
                    </button>
                    <button 
                      onClick={confirmBooking}
                      disabled={bookingLoading}
                      className="flex-1 py-3 px-4 rounded-xl bg-primary text-white shadow-md hover:bg-primary/90 transition-all text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 cursor-pointer"
                    >
                      {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Booking'}
                    </button>
                  </div>
                  {error && <p className="text-error text-sm text-center">{error}</p>}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SmartBookingModal;
