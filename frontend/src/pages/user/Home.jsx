import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import TableCanvas from '../../components/TableCanvas';
import { getSocket } from '../../utils/socket';
import { Clock, CheckCircle, XCircle, AlertTriangle, Maximize2, Info, X, Star, User, Calendar, Plus, GlassWater, Zap, CircleDot, CreditCard, Users, Trophy, Check, ArrowRight } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../utils/audio';
import WaitlistModal from '../../components/WaitlistModal';
import EightBallLoader from '../../components/EightBallLoader';
import { format, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const Home = () => {
  const [tables, setTables] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_tables');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [selectedTable, setSelectedTable] = useState(null);
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [rentProfessionalCues, setRentProfessionalCues] = useState(false);
  const [rentPremiumBalls, setRentPremiumBalls] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingStep, setBookingStep] = useState('form');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL TABLES');
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const [summaryStats, setSummaryStats] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_summary_stats');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    fetchTables(selectedDate);

    const socket = getSocket();
    const handleUpdate = () => {
      fetchTables(selectedDate);
    };

    socket.on('tables_updated', handleUpdate);

    return () => {
      socket.off('tables_updated', handleUpdate);
    };
  }, [selectedDate]);

  const fetchTables = async (timeStr = selectedDate) => {
    try {
      const isoTime = new Date(timeStr).toISOString();
      const { data } = await api.get(`/tables/availability?time=${isoTime}&summary=true`);
      if (data && data.tables) {
        setTables(data.tables);
        setSummaryStats(data.summary);
        try {
          localStorage.setItem('cached_tables', JSON.stringify(data.tables));
          localStorage.setItem('cached_summary_stats', JSON.stringify(data.summary));
        } catch (e) { }
      } else if (Array.isArray(data)) {
        setTables(data);
        try {
          localStorage.setItem('cached_tables', JSON.stringify(data));
        } catch (e) { }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTotalPrice = () => {
    const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
    let base = selectedTable.basePricePerHour * totalHours;
    if (rentProfessionalCues) base += 50;
    if (rentPremiumBalls) base += 30;
    return (base + 10).toFixed(2);
  };

  const getSlotInfo = () => {
    if (!selectedTable) return { maxAvailableHours: 12, conflictMessage: null, nextBooking: null, currentConflict: null };

    const tableData = tables.find(t => t.id === selectedTable.id) || selectedTable;
    const bookings = tableData.upcomingBookings || [];
    const startMs = new Date(selectedDate).getTime();
    const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
    const BUFFER_MS = 15 * 60 * 1000;

    const currentConflict = bookings.find(b => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return startMs >= (bStart - BUFFER_MS) && startMs < (bEnd + BUFFER_MS);
    });

    if (currentConflict) {
      const confStart = isValid(new Date(currentConflict.startTime)) ? format(new Date(currentConflict.startTime), 'hh:mm a') : '';
      const confEnd = isValid(new Date(currentConflict.endTime)) ? format(new Date(currentConflict.endTime), 'hh:mm a') : '';
      return {
        maxAvailableHours: 0,
        conflictMessage: `Table #${selectedTable.tableNumber} is already booked at this time (${confStart} - ${confEnd}).`,
        nextBooking: currentConflict,
        currentConflict
      };
    }

    const futureBookings = bookings
      .filter(b => new Date(b.startTime).getTime() > startMs)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const nextBooking = futureBookings[0];

    let maxAvailableHours = 12;
    if (nextBooking) {
      const nextStartMs = new Date(nextBooking.startTime).getTime();
      const availableMs = nextStartMs - BUFFER_MS - startMs;
      maxAvailableHours = Math.max(0, availableMs / (1000 * 60 * 60));
    }

    let conflictMessage = null;
    if (totalHours <= 0) {
      conflictMessage = 'Duration must be at least 15 minutes.';
    } else if (totalHours > maxAvailableHours) {
      if (nextBooking) {
        const nextStartStr = isValid(new Date(nextBooking.startTime)) ? format(new Date(nextBooking.startTime), 'hh:mm a') : '';
        const maxH = Math.floor(maxAvailableHours);
        const maxM = Math.round((maxAvailableHours - maxH) * 60);
        const durationStr = maxH > 0 ? `${maxH}h ${maxM}m` : `${maxM}m`;
        conflictMessage = `Duration conflicts with upcoming booking at ${nextStartStr}. Max available duration: ${durationStr}.`;
      } else {
        conflictMessage = `Duration exceeds maximum allowed limit.`;
      }
    }

    return { maxAvailableHours, conflictMessage, nextBooking, currentConflict: null };
  };

  const handleBook = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const slotInfo = getSlotInfo();
    if (slotInfo.conflictMessage || slotInfo.maxAvailableHours <= 0) {
      setError(slotInfo.conflictMessage || 'Selected slot is unavailable.');
      setIsSubmitting(false);
      return;
    }
    try {
      const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
      if (totalHours <= 0) {
        setError('Duration must be at least 15 minutes');
        setIsSubmitting(false);
        return;
      }

      const equipment = [];
      if (rentProfessionalCues) equipment.push({ name: 'Professional Cues', price: 50 });
      if (rentPremiumBalls) equipment.push({ name: 'Premium Ball Set', price: 30 });

      setBookingStep('submitting');

      const { data } = await api.post('/bookings', {
        tableId: selectedTable.id,
        startTime: new Date(selectedDate).toISOString(),
        durationHours: totalHours,
        equipment: equipment
      });

      // Prepend new booking to user's cached bookings for instant UI availability
      if (data && data.id) {
        try {
          const cachedUserBookings = JSON.parse(localStorage.getItem('cached_user_bookings') || '[]');
          const updatedUserBookings = [data, ...cachedUserBookings.filter(b => b.id !== data.id)];
          localStorage.setItem('cached_user_bookings', JSON.stringify(updatedUserBookings));
        } catch (e) {}
      }

      setTimeout(() => {
        playSuccessChime();
        setConfirmedBooking(data);
        setBookingStep('success');
        setIsSubmitting(false);
        fetchTables(selectedDate);
      }, 1000);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.message || 'Failed to book table');
      setBookingStep('form');
      setIsSubmitting(false);
    }
  };

  const handleTableSelect = (table) => {
    playClickSound();
    setSelectedTable(table);
    setBookingStep('form');
    setConfirmedBooking(null);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const filters = ['ALL TABLES', '7FT JUNIOR', '8FT STANDARD', '9FT TOURNAMENT'];

  return (
    <div className="flex w-full min-h-screen bg-background text-on-background relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <Header
          title="Live Floor Blueprint & Availability"
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="p-4 md:p-xl space-y-6 md:space-y-xl">
          {/* Live Floor Metrics Bar */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
          >
            <div className="glass-card p-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Available</p>
                <p className="text-xl md:text-2xl font-black text-emerald-400 leading-none mt-0.5">
                  {summaryStats?.availableCount ?? tables.filter(t => t.status !== 'occupied' && t.status !== 'maintenance').length} <span className="text-xs text-white/40 font-normal">/ {tables.length}</span>
                </p>
              </div>
            </div>

            <div className="glass-card p-4 rounded-3xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Occupied</p>
                <p className="text-xl md:text-2xl font-black text-rose-400 leading-none mt-0.5">
                  {summaryStats?.occupiedCount ?? tables.filter(t => t.status === 'occupied').length} <span className="text-xs text-white/40 font-normal">Tables</span>
                </p>
              </div>
            </div>

            <div
              onClick={() => setShowWaitlistModal(true)}
              className="glass-card p-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-xl flex items-center gap-3 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group"
              title="Click to view or join waitlist"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Waitlist Queue</p>
                <p className="text-xl md:text-2xl font-black text-amber-400 leading-none mt-0.5">
                  {summaryStats?.waitlistCount ?? 0} <span className="text-xs text-white/40 font-normal">Waiting</span>
                </p>
              </div>
            </div>

            <div className="glass-card p-4 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Lounge Rate</p>
                <p className="text-base md:text-lg font-black text-primary leading-none mt-0.5">
                  ₹{summaryStats?.minPrice || 200} - ₹{summaryStats?.maxPrice || 500}<span className="text-[10px] text-white/50">/h</span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Filters and Utilities */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-4 border border-outline-variant/15 rounded-3xl backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
              <div className="flex items-center gap-3 bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/30 px-6 py-2.5 rounded-2xl mr-2 cursor-pointer focus-within:border-primary/50">
                <Calendar className="w-4 h-4 text-primary" />
                <input
                  type="datetime-local"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-on-surface text-xs font-black tracking-wider outline-none cursor-pointer"
                />
              </div>
              {filters.map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2.5 rounded-2xl border text-[10px] font-black tracking-widest transition-all uppercase italic btn-press whitespace-nowrap ${activeFilter === filter
                    ? 'bg-primary text-white border-primary neon-shadow-purple'
                    : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowWaitlistModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-secondary/10 border border-secondary/20 rounded-2xl text-[9px] font-black italic tracking-widest text-secondary hover:bg-secondary/20 transition-all uppercase"
              >
                <Users className="w-3.5 h-3.5" />
                Waitlist
              </motion.button>
              <div className="flex items-center gap-xs text-on-surface-variant text-[10px] font-black italic tracking-widest bg-surface-container-low border border-outline-variant/20 px-4 py-2.5 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span>LIVE SYNC</span>
              </div>
            </div>
          </motion.div>

          {/* Live Floor Map Section */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 md:p-8 rounded-[40px] border border-outline-variant/20 relative w-full shimmer-border"
          >
            <div className="w-full h-full">
              <TableCanvas
                tables={tables.filter(table => {
                  const matchesSearch = table.tableNumber.toString().includes(searchQuery);
                  const matchesFilter = activeFilter === 'ALL TABLES' ||
                    (activeFilter === '7FT JUNIOR' && table.size?.toLowerCase() === '7ft') ||
                    (activeFilter === '8FT STANDARD' && table.size?.toLowerCase() === '8ft') ||
                    (activeFilter === '9FT TOURNAMENT' && table.size?.toLowerCase() === '9ft');
                  return matchesSearch && matchesFilter;
                })}
                isAdmin={false}
                onTableSelect={handleTableSelect}
                viewMode="standard"
              />
            </div>
          </motion.div>
        </main>

        {/* Booking Slide-Over Drawer */}
        <AnimatePresence>
          {showModal && selectedTable && (
            <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSubmitting) {
                  setShowModal(false);
                  setBookingStep('form');
                  setConfirmedBooking(null);
                }
              }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] z-[110] bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{ width: '90vw', maxWidth: '420px' }}
            >

              {/* Header Area */}
              <div className="p-6 flex-shrink-0 flex items-center justify-between border-b border-outline-variant/10">
                <h3 className="font-h1 text-xl md:text-2xl text-on-surface uppercase tracking-tight">
                  {selectedTable.size === '9ft' ? 'Royal Slate Pro' : 'Shadow Edge ' + selectedTable.size}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20">#{selectedTable.tableNumber}</span>
                  <button
                    onClick={() => {
                      if (!isSubmitting) {
                        setShowModal(false);
                        setBookingStep('form');
                        setConfirmedBooking(null);
                      }
                    }}
                    className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>                {/* STEP 1: FORM */}
                {bookingStep === 'form' && (() => {
                  const slotInfo = getSlotInfo();
                  const isBookingBlocked = isSubmitting || !!slotInfo.conflictMessage || slotInfo.maxAvailableHours <= 0;

                  return (
                    <>
                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Table Preview */}
                        <div className="w-full bg-surface-container-low/50 p-6 flex flex-col border-b border-outline-variant/20 relative overflow-hidden">
                          <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
                          
                          <div className="mb-4 relative z-10 flex justify-between items-start">
                            <span className="px-4 py-1.5 bg-secondary-container/20 text-secondary text-[10px] font-bold rounded-full border border-secondary/30 uppercase tracking-widest inline-block">
                              {selectedTable.size === '9ft' ? 'Premium Table #' + selectedTable.tableNumber : 'Active Table #' + selectedTable.tableNumber}
                            </span>
                            <span className="text-primary text-2xl font-body font-black italic">INR {selectedTable.basePricePerHour}/h</span>
                          </div>

                          <div className="relative h-48 rounded-2xl overflow-hidden border border-outline-variant/20 group z-10 holographic">
                            <img
                              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeyYixTgFa8nBxVNoXE1pgsTa4l9nM8pOjQJKX6ExFtLTEivg8Ynb4afEeOcUF5SiMSDG6OG8BOBvoPsIHy9i-lvkjSOMs0USIfQOiWR_kHURcwUD8XT62Q6UKnIFcPpSiuwXy_huI3qWLy1KmipBvHDnSuvKlE8QblEJBOI-FKb0UA-W35J7JIZjZoh9VxX8haScSjwmcGOwhLq7gjkC1sD3UZSmU1TNQAnDrEWCfdaDeIrNc5mxROaIz-t2BEgyc_quEeRP6HuKU"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                              alt="Table Preview"
                            />
                            <div className="absolute bottom-3 left-3 flex gap-2">
                              <span className="px-3 py-1 bg-surface/80 backdrop-blur-md rounded-full text-[9px] font-bold text-on-surface flex items-center gap-1">
                                <User className="w-3 h-3" /> 4 Max
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div className="p-6 flex flex-col">
                          {/* Next Booking Badge */}
                          {slotInfo.nextBooking && isValid(new Date(slotInfo.nextBooking.startTime)) && (
                            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                                <span>Next Booking Today: {format(new Date(slotInfo.nextBooking.startTime), 'hh:mm a')}</span>
                              </div>
                              <span className="text-[9px] px-2 py-0.5 bg-amber-500/20 rounded-md">
                                Max {Math.floor(slotInfo.maxAvailableHours)}h {Math.round((slotInfo.maxAvailableHours % 1) * 60)}m
                              </span>
                            </div>
                          )}

                          {(error || slotInfo.conflictMessage) && (
                            <div className="p-3 bg-error-container/20 text-error text-[10px] rounded-xl mb-4 border border-error/50 font-bold uppercase tracking-widest flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>{error || slotInfo.conflictMessage}</span>
                            </div>
                          )}

                          {/* Duration Presets */}
                          <div className="mb-4">
                            <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-2">Quick Duration Presets</label>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: '1 Hr', h: 1, m: 0 },
                                { label: '1.5 Hrs', h: 1, m: 30 },
                                { label: '2 Hrs', h: 2, m: 0 },
                                { label: '3 Hrs', h: 3, m: 0 },
                                { label: '4 Hrs', h: 4, m: 0 },
                              ].map((preset) => {
                                const presetHours = preset.h + preset.m / 60;
                                const isActive = Number(durationHours) === preset.h && Number(durationMinutes) === preset.m;
                                const isPresetDisabled = presetHours > slotInfo.maxAvailableHours;

                                return (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    disabled={isPresetDisabled}
                                    onClick={() => {
                                      if (!isPresetDisabled) {
                                        setDurationHours(preset.h);
                                        setDurationMinutes(preset.m);
                                      }
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                                      isPresetDisabled
                                        ? 'opacity-30 cursor-not-allowed bg-surface-container-low border-outline-variant/10 text-on-surface-variant/40 line-through'
                                        : isActive
                                        ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(22,101,52,0.3)]'
                                        : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/50'
                                    }`}
                                    title={isPresetDisabled ? `Exceeds next booking at ${slotInfo.nextBooking ? format(new Date(slotInfo.nextBooking.startTime), 'hh:mm a') : ''}` : ''}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Date, Time, Duration Grid */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                              <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-1.5">Select Date</label>
                              <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary group-focus-within:text-secondary transition-colors" />
                                <input
                                  type="date"
                                  value={selectedDate.split('T')[0]}
                                  onChange={(e) => {
                                    const timePart = selectedDate.split('T')[1];
                                    setSelectedDate(`${e.target.value}T${timePart}`);
                                  }}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 pl-9 text-on-surface focus:border-secondary/50 font-body text-xs focus:shadow-[0_0_12px_rgba(100,142,208,0.15)] transition-all outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-1.5">Start Time</label>
                              <div className="relative group">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary group-focus-within:text-secondary transition-colors" />
                                <input
                                  type="time"
                                  value={selectedDate.split('T')[1]}
                                  onChange={(e) => {
                                    const datePart = selectedDate.split('T')[0];
                                    setSelectedDate(`${datePart}T${e.target.value}`);
                                  }}
                                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 pl-9 text-on-surface focus:border-secondary/50 font-body text-xs focus:shadow-[0_0_12px_rgba(100,142,208,0.15)] transition-all outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-1.5">Custom Hours</label>
                              <input
                                type="number"
                                min="0" max="12"
                                value={durationHours}
                                onChange={(e) => setDurationHours(e.target.value)}
                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-on-surface focus:border-secondary/50 text-xs focus:shadow-[0_0_12px_rgba(100,142,208,0.15)] transition-all outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-1.5">Custom Mins</label>
                              <select
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-on-surface focus:border-secondary/50 text-xs focus:shadow-[0_0_12px_rgba(100,142,208,0.15)] transition-all outline-none"
                              >
                                <option value="0">00 mins</option>
                                <option value="15">15 mins</option>
                                <option value="30">30 mins</option>
                                <option value="45">45 mins</option>
                              </select>
                            </div>
                          </div>

                          {/* Extras Section */}
                          <div className="mb-6">
                            <label className="block text-on-surface-variant font-bold text-[9px] uppercase tracking-widest mb-2">Enhance Experience</label>
                            <div className="grid grid-cols-2 gap-3">
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setRentProfessionalCues(!rentProfessionalCues)} className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${rentProfessionalCues ? 'border-secondary bg-secondary/10 shadow-[0_0_12px_rgba(22,101,52,0.15)]' : 'border-outline-variant/20 hover:border-secondary/50'}`}>
                                <Zap className={`w-6 h-6 ${rentProfessionalCues ? 'text-secondary' : 'text-on-surface-variant'}`} />
                                <div className="flex-1">
                                  <p className="text-[11px] font-bold text-on-surface">Pro Cues</p>
                                  <p className="text-[9px] text-on-surface-variant">+INR 50</p>
                                </div>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setRentPremiumBalls(!rentPremiumBalls)} className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${rentPremiumBalls ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(22,101,52,0.15)]' : 'border-outline-variant/20 hover:border-primary/50'}`}>
                                <CircleDot className={`w-6 h-6 ${rentPremiumBalls ? 'text-primary' : 'text-on-surface-variant'}`} />
                                <div className="flex-1">
                                  <p className="text-[11px] font-bold text-on-surface">Premium Balls</p>
                                  <p className="text-[9px] text-on-surface-variant">+INR 30</p>
                                </div>
                              </motion.div>
                            </div>
                          </div>

                          {/* Pricing Summary */}
                          <div className="p-5 card-gradient-red rounded-xl space-y-2 mb-6">
                            <div className="flex justify-between items-center text-[11px] font-body">
                              <span className="text-on-surface-variant uppercase font-bold tracking-widest">Table ({durationHours}h {durationMinutes}m)</span>
                              <span className="text-on-surface font-semibold text-xs">INR {(selectedTable.basePricePerHour * (parseFloat(durationHours) + (durationMinutes / 60))).toFixed(2)}</span>
                            </div>
                            {rentProfessionalCues && (
                              <div className="flex justify-between items-center text-[11px] font-body">
                                <span className="text-on-surface-variant uppercase font-bold tracking-widest">Pro Cues</span>
                                <span className="text-on-surface font-semibold text-xs">INR 50.00</span>
                              </div>
                            )}
                            {rentPremiumBalls && (
                              <div className="flex justify-between items-center text-[11px] font-body">
                                <span className="text-on-surface-variant uppercase font-bold tracking-widest">Premium Balls</span>
                                <span className="text-on-surface font-semibold text-xs">INR 30.00</span>
                              </div>
                            )}
                            <div className="pt-3 border-t border-outline-variant/30 flex justify-between items-end mt-2">
                              <div>
                                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Amount</p>
                                <p className="text-primary text-3xl font-body font-bold italic tracking-tighter leading-none gradient-text-neon">INR {calculateTotalPrice()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Area */}
                      <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest">
                        <motion.button
                          whileHover={{ scale: isBookingBlocked ? 1 : 1.02 }}
                          whileTap={{ scale: isBookingBlocked ? 1 : 0.97 }}
                          disabled={isBookingBlocked}
                          onClick={() => { if (!isBookingBlocked) { playClickSound(); handleBook(); } }}
                          className={`w-full font-h1 text-lg italic py-4 rounded-2xl transition-all uppercase tracking-widest mb-3 ${
                            isBookingBlocked 
                              ? 'bg-outline-variant/30 text-on-surface-variant/40 cursor-not-allowed border border-outline-variant/20' 
                              : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                          }`}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5 text-on-surface" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : 'Reserve Now'}
                        </motion.button>
                        <p className="text-center text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">Free cancellation up to 12 hours before start time.</p>
                      </div>
                    </>
                  );
                })()}

              {/* STEP 2: SUBMITTING / LOADING INSIDE MODAL */}
              {bookingStep === 'submitting' && (
                <div className="p-8 flex flex-col items-center justify-center text-center my-auto min-h-[380px]">
                  <EightBallLoader message="Reserving Table..." fullScreen={false} />
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-2 animate-pulse">
                    Confirming slot for Table #{selectedTable.tableNumber}...
                  </p>
                </div>
              )}

              {/* STEP 3: SUCCESS / CONFIRMED INSIDE MODAL */}
              {bookingStep === 'success' && (
                <div className="p-6 md:p-8 flex flex-col items-center text-center my-auto">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4 relative mx-auto shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                    <Check className="w-10 h-10 text-emerald-400" strokeWidth={3} />
                  </div>

                  <h3 className="text-2xl md:text-3xl font-h1 text-on-surface italic uppercase tracking-tighter mb-1">
                    Booking <span className="gradient-text-neon">Confirmed!</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mb-6 font-body">
                    Reservation locked for Table #{confirmedBooking?.table?.tableNumber || selectedTable.tableNumber}
                  </p>

                  {/* Summary Pass Card */}
                  <div className="w-full bg-surface-container-low/80 rounded-2xl p-5 border border-outline-variant/20 space-y-3 mb-6 text-left text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Table</span>
                      <span className="text-on-surface font-extrabold text-sm uppercase">Table {confirmedBooking?.table?.tableNumber || selectedTable.tableNumber} ({selectedTable.size})</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Date</span>
                      <span className="text-on-surface font-semibold">{isValid(new Date(selectedDate)) ? format(new Date(selectedDate), "EEE, MMM d, yyyy") : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Time Slot</span>
                      <span className="text-secondary font-bold">
                        {isValid(new Date(selectedDate)) ? format(new Date(selectedDate), "hh:mm a") : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10">
                      <span className="text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Total Paid</span>
                      <span className="text-primary font-black text-lg font-body">INR {(confirmedBooking?.totalAmount || calculateTotalPrice())}</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setBookingStep('form');
                        setConfirmedBooking(null);
                        navigate('/my-bookings');
                      }}
                      className="py-3.5 px-4 bg-primary text-white rounded-xl font-bold uppercase text-[10px] tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      View Bookings <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setShowModal(false);
                        setBookingStep('form');
                        setConfirmedBooking(null);
                        fetchTables(selectedDate);
                      }}
                      className="py-3.5 px-4 bg-surface-container-highest text-on-surface hover:bg-surface-container-high rounded-xl font-bold uppercase text-[10px] tracking-widest border border-outline-variant/30 transition-all"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </>
          )}
        </AnimatePresence>

        <WaitlistModal
          isOpen={showWaitlistModal}
          onClose={() => {
            setShowWaitlistModal(false);
            fetchTables(selectedDate);
          }}
          onStatusChange={() => fetchTables(selectedDate)}
        />
      </div>
    </div>
  );
};

// String capitalization helper
if (!String.prototype.equalsIgnoreCase) {
  String.prototype.equalsIgnoreCase = function (anotherString) {
    return (this === anotherString) ||
      (this != null && anotherString != null && this.toLowerCase() === anotherString.toLowerCase());
  };
}

export default Home;
