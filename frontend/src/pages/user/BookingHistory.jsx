import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { format, differenceInMinutes, isValid } from 'date-fns';
import { QrCode, CheckCircle2, Search, ArrowRight, Play, MoreVertical, Calendar, Plus, Clock, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { getSocket } from '../../utils/socket';

const BookingHistory = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const [bookings, setBookings] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user_bookings');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyData, setModifyData] = useState({ startTime: '', durationHours: '1', durationMinutes: '00' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [cancelConfirmId, setCancelConfirmId] = useState(null);

  useEffect(() => {
    fetchBookings();

    const socket = getSocket();
    const handleUpdate = () => fetchBookings();
    socket.on('tables_updated', handleUpdate);
    socket.on('booking_updated', handleUpdate);

    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => {
      socket.off('tables_updated', handleUpdate);
      socket.off('booking_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/bookings/mybookings');
      // Sort bookings by creation date / ID descending (newest created booking first)
      const sortedBookings = (data || []).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
        return timeB - timeA;
      });
      setBookings(sortedBookings);
      try {
        localStorage.setItem('cached_user_bookings', JSON.stringify(sortedBookings));
      } catch (e) {}
    } catch (err) {
      console.error(err);
    }
  };

  const handleModify = (booking) => {
    setSelectedBooking(booking);
    setModifyData({
      startTime: format(new Date(booking.startTime), "yyyy-MM-dd'T'HH:mm"),
      durationHours: Math.floor(booking.durationHours).toString(),
      durationMinutes: ((booking.durationHours % 1) * 60).toString().padStart(2, '0')
    });
    setShowModifyModal(true);
  };

  const updateBooking = async () => {
    try {
      const totalHours = parseInt(modifyData.durationHours) + (parseInt(modifyData.durationMinutes) / 60);
      const startTime = new Date(modifyData.startTime).toISOString();
      const endTime = new Date(new Date(modifyData.startTime).getTime() + totalHours * 60 * 60 * 1000).toISOString();
      
      // Instant UI update
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, startTime, endTime, durationHours: totalHours } : b));
      setShowModifyModal(false);
      addToast('Booking updated successfully', 'success');

      await api.put(`/bookings/${selectedBooking.id}`, {
        startTime,
        endTime,
        durationHours: totalHours
      });
      fetchBookings();
    } catch (err) {
      console.error(err);
      addToast('Failed to update booking. Time might be unavailable.', 'error');
      fetchBookings();
    }
  };

  const handleCancelClick = (bookingId) => {
    setCancelConfirmId(bookingId);
    setActiveMenuId(null);
  };

  const confirmCancel = async () => {
    const targetId = cancelConfirmId;
    if (!targetId) return;

    // Instant UI update
    setCancelConfirmId(null);
    setBookings(prev => prev.map(b => b.id === targetId ? { ...b, status: 'cancelled' } : b));
    addToast('Booking cancelled successfully', 'success');

    try {
      await api.post(`/bookings/${targetId}/cancel`);
      fetchBookings();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
      fetchBookings();
    }
  };

  const totalSpent = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalHours = bookings.reduce((sum, b) => sum + (b.durationHours || 0), 0);
  
  // Filter bookings based on search query, selected date, and active status filter
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.table?.tableNumber?.toString().includes(searchQuery) || b.tableId?.tableNumber?.toString().includes(searchQuery) || b.status.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = filterDate && isValid(new Date(b.startTime)) 
      ? format(new Date(b.startTime), 'yyyy-MM-dd') === filterDate 
      : true;
    const matchesStatus = activeStatusFilter === 'ALL' || b.status.toUpperCase() === activeStatusFilter;
    return matchesSearch && matchesDate && matchesStatus;
  });

  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState(null);

  return (
    <div className="flex w-full min-h-screen bg-background text-on-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <Header 
          title="Recent Bookings" 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="p-4 md:p-xl overflow-y-auto pb-32">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-lg mb-8 md:mb-xl">
            {/* Total Sessions */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-card border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl card-lift p-5 md:p-lg rounded-3xl flex items-center gap-4 md:gap-lg hover:border-emerald-500/50 transition-all group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform icon-glow shrink-0">
                <Calendar className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-1">Total Sessions</p>
                <p className="text-2xl font-body font-bold text-emerald-400">{bookings.length}</p>
              </div>
            </motion.div>

            {/* Total Spent */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-card border border-primary/20 bg-primary/5 backdrop-blur-xl card-lift p-5 md:p-lg rounded-3xl flex items-center gap-4 md:gap-lg hover:border-primary/50 transition-all group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform icon-glow shrink-0">
                <span className="text-2xl font-h3 font-black">₹</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-1">Total Investment</p>
                <p className="text-2xl font-body font-bold text-primary">₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </motion.div>

            {/* Total Hours */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card border border-primary/20 bg-primary/5 backdrop-blur-xl card-lift p-5 md:p-lg rounded-3xl flex items-center gap-4 md:gap-lg hover:border-primary/50 transition-all group"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform icon-glow shrink-0">
                <Clock className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/70 mb-1">Total Playtime</p>
                <p className="text-2xl font-body font-bold text-primary">{totalHours.toFixed(1)}h</p>
              </div>
            </motion.div>
          </div>

          {/* Unified Recent Bookings Section */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-lg gap-4">
              <h2 className="font-h1 text-2xl text-on-surface flex items-center gap-md">
                <span className="w-1 h-8 bg-primary-container rounded-full"></span>
                Recent Bookings
              </h2>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Status Filter Tabs */}
                <div className="flex bg-surface-container-low border border-outline-variant/30 p-1 rounded-2xl">
                  {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setActiveStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${
                        activeStatusFilter === status 
                          ? 'bg-primary text-white shadow-md shadow-primary/20' 
                          : 'text-on-surface-variant/60 hover:text-on-surface'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary group-focus-within:text-secondary transition-colors" />
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/30 rounded-2xl py-2 pl-10 pr-4 text-xs font-bold text-on-surface focus:border-secondary/50 outline-none"
                  />
                </div>
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="text-error text-[10px] font-bold uppercase tracking-widest hover:underline px-2 btn-press">
                    Clear Date
                  </button>
                )}
              </div>
            </div>

            {/* Cyberpunk VIP Ticket Pass Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredBookings.map((booking, index) => {
                  const isUpcoming = booking.status === 'confirmed';
                  const isCompleted = booking.status === 'completed';
                  const isCancelled = booking.status === 'cancelled';
                  const hasStarted = new Date(booking.startTime) <= new Date();
                  const tableNum = booking.table?.tableNumber || booking.tableId?.tableNumber || '?';
                  const tableSize = booking.table?.size || booking.tableId?.size || '';
                  const diffMins = (new Date(booking.startTime).getTime() - new Date().getTime()) / (1000 * 60);

                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: Math.min(index * 0.04, 0.4) }}
                      className="glass-card rounded-[28px] border border-outline-variant/20 p-6 relative overflow-hidden card-lift group hover:border-primary/50 transition-all flex flex-col justify-between"
                    >
                      {/* Ticket Cutout Notches */}
                      <div className="w-5 h-5 bg-background rounded-full absolute -left-3 top-1/2 -translate-y-1/2 border border-outline-variant/60 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.12)] z-10" />
                      <div className="w-5 h-5 bg-background rounded-full absolute -right-3 top-1/2 -translate-y-1/2 border border-outline-variant/60 shadow-[inset_2px_0_4px_rgba(0,0,0,0.12)] z-10" />

                      {/* Header: Table Number & Status Pill */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-black text-sm ${
                              isUpcoming ? 'bg-primary/10 text-primary border-primary/30' : 
                              isCancelled ? 'bg-error/10 text-error border-error/30' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}>
                              #{tableNum}
                            </div>
                            <div>
                              <p className="font-h1 text-lg text-on-surface uppercase tracking-tight">Table {tableNum}</p>
                              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{tableSize || 'Lounge Table'}</p>
                            </div>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                            isUpcoming ? 'bg-primary/15 text-primary border-primary/40' : 
                            isCancelled ? 'bg-error/15 text-error border-error/40' :
                            'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        {/* Ticket Info Grid */}
                        <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/15 space-y-2 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Date</span>
                            <span className="text-on-surface font-semibold">
                              {isValid(new Date(booking.startTime)) ? format(new Date(booking.startTime), "EEE, MMM d, yyyy") : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Time Slot</span>
                            <span className="text-on-surface font-medium">
                              {isValid(new Date(booking.startTime)) ? format(new Date(booking.startTime), "hh:mm a") : ''} - {isValid(new Date(booking.endTime)) ? format(new Date(booking.endTime), "hh:mm a") : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/10">
                            <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Duration</span>
                            <span className="text-primary font-bold">{booking.durationHours} Hours</span>
                          </div>
                        </div>

                        {/* Amount Bar */}
                        <div className="flex items-center justify-between px-2 mb-6">
                          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Total Amount</span>
                          <span className="text-2xl font-black text-on-surface font-body">₹{booking.totalAmount?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/15">
                        <button
                          onClick={() => setSelectedReceiptBooking(booking)}
                          className="flex-1 py-2.5 px-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-on-surface hover:text-primary transition-all text-center flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Receipt
                        </button>

                        {isUpcoming && !hasStarted && (
                          <button
                            onClick={() => handleModify(booking)}
                            className="py-2.5 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-primary transition-all"
                          >
                            Modify
                          </button>
                        )}

                        {isUpcoming && diffMins > 30 && (
                          <button
                            onClick={() => handleCancelClick(booking.id)}
                            className="py-2.5 px-3 bg-error/10 hover:bg-error/20 border border-error/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-error transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredBookings.length === 0 && (
                <div className="col-span-full p-12 text-center text-on-surface-variant glass-card rounded-3xl border border-outline-variant/20">
                  <div className="flex flex-col items-center gap-3 opacity-60">
                    <svg className="w-12 h-12 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>
                    <p className="text-sm font-medium">{filterDate ? 'No bookings found for the selected date.' : 'No sessions yet. Hit the tables!'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modify Booking Modal */}
        <AnimatePresence>
          {showModifyModal && selectedBooking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-[448px] max-w-full p-8 rounded-3xl border border-outline-variant relative neon-shadow-blue"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                
                <button 
                  onClick={() => setShowModifyModal(false)}
                  className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors btn-press"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-h1 text-xl text-primary-fixed mb-8 uppercase tracking-wide">Modify Session</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">New Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={modifyData.startTime}
                      onChange={(e) => setModifyData({ ...modifyData, startTime: e.target.value })}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-on-surface focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-body"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Hours</label>
                      <input 
                        type="number" 
                        min="0" max="12"
                        value={modifyData.durationHours}
                        onChange={(e) => setModifyData({ ...modifyData, durationHours: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-on-surface focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Minutes</label>
                      <select 
                        value={modifyData.durationMinutes}
                        onChange={(e) => setModifyData({ ...modifyData, durationMinutes: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-on-surface focus:border-primary/50"
                      >
                        <option value="00">00</option>
                        <option value="15">15</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={updateBooking}
                      className="w-full py-4 bg-primary-container text-on-primary-container rounded-2xl font-bold text-lg uppercase tracking-wider neon-shadow-blue hover:brightness-110 transition-all"
                    >
                      Confirm Changes
                    </motion.button>
                    <button 
                      onClick={() => setShowModifyModal(false)}
                      className="w-full py-4 mt-2 text-on-surface-variant font-bold text-[10px] uppercase tracking-widest hover:text-on-surface btn-press"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {cancelConfirmId && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-[400px] max-w-full p-8 rounded-3xl border border-error/30 relative"
              >
                <button 
                  onClick={() => setCancelConfirmId(null)}
                  className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors btn-press"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-h2 text-xl text-error mb-4">Cancel Booking</h3>
                <p className="text-on-surface-variant mb-8 text-sm">Are you sure you want to cancel this booking? This action cannot be undone.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setCancelConfirmId(null)}
                    className="flex-1 py-3 text-on-surface font-semibold bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors btn-press"
                  >
                    No, keep it
                  </button>
                  <button 
                    onClick={confirmCancel}
                    className="flex-1 py-3 text-white font-semibold bg-error hover:bg-error/90 rounded-xl transition-colors btn-press shadow-lg shadow-error/20"
                  >
                    Yes, cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instant Digital Receipt Modal */}
        <AnimatePresence>
          {selectedReceiptBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-[460px] max-w-full rounded-[36px] border border-white/15 p-8 relative shadow-2xl overflow-hidden neon-shadow-purple"
              >
                <button
                  onClick={() => setSelectedReceiptBooking(null)}
                  className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="font-h1 text-2xl uppercase tracking-tight text-on-surface">Digital <span className="text-primary">Receipt</span></h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Lounge Reservation Pass</p>
                </div>

                <div className="bg-surface-container-low/70 rounded-2xl p-5 border border-outline-variant/15 space-y-3 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Booking Reference</span>
                    <span className="text-primary font-mono font-bold">#{selectedReceiptBooking.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Table Assigned</span>
                    <span className="text-on-surface font-bold">Table #{selectedReceiptBooking.table?.tableNumber || selectedReceiptBooking.tableId?.tableNumber || selectedReceiptBooking.tableId}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Date</span>
                    <span className="text-on-surface font-medium">
                      {isValid(new Date(selectedReceiptBooking.startTime)) ? format(new Date(selectedReceiptBooking.startTime), "EEEE, MMM d, yyyy") : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Time Slot</span>
                    <span className="text-on-surface font-medium">
                      {isValid(new Date(selectedReceiptBooking.startTime)) ? format(new Date(selectedReceiptBooking.startTime), "hh:mm a") : ''} - {isValid(new Date(selectedReceiptBooking.endTime)) ? format(new Date(selectedReceiptBooking.endTime), "hh:mm a") : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-outline-variant/10">
                    <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Session Duration</span>
                    <span className="text-on-surface font-bold">{selectedReceiptBooking.durationHours} Hours</span>
                  </div>
                </div>

                <div className="bg-surface-container/60 rounded-2xl p-5 border border-outline-variant/10 flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Amount Paid</span>
                  <span className="text-2xl font-black text-secondary font-body">₹{selectedReceiptBooking.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>

                <button
                  onClick={() => setSelectedReceiptBooking(null)}
                  className="w-full py-4 bg-primary text-white font-h1 text-sm uppercase tracking-wider rounded-2xl neon-shadow-purple hover:brightness-110 transition-all"
                >
                  Close Receipt
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default BookingHistory;
