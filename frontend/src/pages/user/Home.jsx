import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { getSocket } from '../../utils/socket';
import { Clock, CheckCircle, XCircle, AlertTriangle, Maximize2, Info, X, Star, User, Calendar, Plus, GlassWater, Zap, CircleDot, CreditCard, Users, Trophy, Check, ArrowRight, LayoutGrid } from 'lucide-react';
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
    socket.on('booking_updated', handleUpdate);

    const pollInterval = setInterval(() => {
      fetchTables(selectedDate);
    }, 4000);

    return () => {
      socket.off('tables_updated', handleUpdate);
      socket.off('booking_updated', handleUpdate);
      clearInterval(pollInterval);
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

  const getSlotInfo = () => {
    if (!selectedTable) return { maxAvailableHours: 12, conflictMessage: null, nextBooking: null, currentConflict: null };

    const tableData = tables.find(t => t.id === selectedTable.id) || selectedTable;
    const bookings = tableData.upcomingBookings || [];

    const requestedStart = new Date(selectedDate);
    const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
    const requestedEnd = new Date(requestedStart.getTime() + totalHours * 60 * 60 * 1000);

    let maxHours = 12;
    let conflictMsg = null;
    let nextBkg = null;
    let currentBkg = null;

    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);

      if (requestedStart < bEnd && requestedEnd > bStart) {
        currentBkg = b;
        conflictMsg = `Conflicting booking by ${b.user?.name || 'another user'} from ${format(bStart, 'hh:mm a')} to ${format(bEnd, 'hh:mm a')}`;
        break;
      }

      if (bStart > requestedStart) {
        const hoursUntilNext = (bStart.getTime() - requestedStart.getTime()) / (1000 * 60 * 60);
        if (hoursUntilNext < maxHours) {
          maxHours = hoursUntilNext;
          nextBkg = b;
        }
      }
    }

    return { maxAvailableHours: maxHours, conflictMessage: conflictMsg, nextBooking: nextBkg, currentConflict: currentBkg };
  };

  const calculateTotalPrice = () => {
    if (!selectedTable) return '0.00';
    const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
    const tableRate = selectedTable.basePricePerHour || 0;
    const tableCost = tableRate * totalHours;
    const cuesCost = rentProfessionalCues ? 50 : 0;
    const ballsCost = rentPremiumBalls ? 30 : 0;
    return (tableCost + cuesCost + ballsCost).toFixed(2);
  };

  const handleTableSelect = (table) => {
    playClickSound();
    setSelectedTable(table);
    setShowModal(true);
    setBookingStep('form');
    setError('');
    setSuccess('');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
    if (totalHours <= 0) {
      setError('Please select a valid duration.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isoTime = new Date(selectedDate).toISOString();
      const payload = {
        tableId: selectedTable.id,
        startTime: isoTime,
        durationHours: totalHours,
        rentProfessionalCues,
        rentPremiumBalls,
      };

      const { data } = await api.post('/bookings', payload);
      playSuccessChime();

      setConfirmedBooking(data);
      setBookingStep('success');
      fetchTables(selectedDate);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filters = ['ALL TABLES', '7FT JUNIOR', '8FT STANDARD', '9FT TOURNAMENT'];

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <Header title="Floor Booking" onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="p-4 md:p-xl overflow-y-auto space-y-6 md:space-y-lg pb-32">
          {/* Header Banner */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-card p-6 md:p-10 rounded-[40px] border border-outline-variant/20 relative overflow-hidden card-gradient-red shimmer-border"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent rounded-full pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  Live Reservations
                </span>
                <span className="px-3 py-1 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-black uppercase tracking-widest rounded-full">
                  Interactive Floorplan
                </span>
              </div>
              <h1 className="font-h1 text-3xl md:text-5xl text-on-surface italic uppercase tracking-tighter leading-none mb-3">
                Reserve Your <span className="gradient-text-neon">Table</span>
              </h1>
              <p className="text-on-surface-variant text-xs md:text-sm font-body leading-relaxed">
                Select your preferred table from our real-time interactive floor plan below. Check live availability, customize equipment add-ons, and confirm instantly.
              </p>
            </div>
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          >
            <div className="glass-card p-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Available Now</p>
                <p className="text-xl md:text-2xl font-black text-emerald-400 leading-none mt-0.5">
                  {summaryStats?.availableCount ?? tables.filter(t => t.status === 'active' || !t.status).length} <span className="text-xs text-white/40 font-normal">Tables</span>
                </p>
              </div>
            </div>
            <div className="glass-card p-4 rounded-3xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-3">
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
              onClick={() => setActiveFilter('MAINTENANCE')}
              className="glass-card p-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Waitlist Queue</p>
                <p className="text-xl md:text-2xl font-black text-amber-400 leading-none mt-0.5">
                  {summaryStats?.waitlistCount ?? 0} <span className="text-xs text-white/40 font-normal">Waiting</span>
                </p>
              </div>
            </div>
            <div className="glass-card p-4 rounded-3xl border border-primary/20 bg-primary/5 flex items-center gap-3">
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

          {/* Filters */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-card p-4 border border-outline-variant/15 rounded-3xl"
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
          </motion.div>

          {/* Live Floor Tables Grid */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
              {[...tables]
                .sort((a, b) => a.tableNumber.toString().localeCompare(b.tableNumber.toString(), undefined, { numeric: true, sensitivity: 'base' }))
                .filter(table => {
                  const matchesFilter = activeFilter === 'ALL TABLES' ||
                    (activeFilter === '7FT JUNIOR' && table.size?.toLowerCase() === '7ft') ||
                    (activeFilter === '8FT STANDARD' && table.size?.toLowerCase() === '8ft') ||
                    (activeFilter === '9FT TOURNAMENT' && table.size?.toLowerCase() === '9ft');
                  return matchesFilter;
                })
                .map((table, idx) => {
                  const isOccupied = table.status === 'occupied';
                  const isMaintenance = table.status === 'maintenance' || table.status === 'maintenance_scheduled';
                  const isAvailable = !isOccupied && !isMaintenance;

                  return (
                <motion.div
                  key={table.id || idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                  className={`relative rounded-[32px] overflow-hidden border transition-all duration-300 flex flex-col justify-between group min-h-[300px] bg-white ${
                    isAvailable 
                      ? 'border-outline-variant/30 hover:border-primary/40 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(194,136,64,0.12)] card-lift'
                      : isOccupied
                      ? 'border-rose-500/10 shadow-sm opacity-90'
                      : 'border-amber-500/10 shadow-sm opacity-90'
                  }`}
                >
                  {/* Top Header */}
                  <div className={`relative p-4 sm:p-6 pb-3 sm:pb-5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 overflow-hidden ${
                    isAvailable ? 'bg-primary/5 border-primary/10' : isOccupied ? 'bg-rose-500/5 border-rose-500/10' : 'bg-amber-500/5 border-amber-500/10'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary">8</span>
                        <h3 className="text-xl sm:text-2xl font-bold text-on-surface uppercase tracking-tight">
                          Table #<span className="font-sans">{table.tableNumber}</span>
                        </h3>
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant/80 mt-1">
                        {table.size === '9ft' ? '9ft Pro Tournament' : table.size === '8ft' ? '8ft Standard' : '7ft Junior'}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="self-end sm:self-auto">
                      {isAvailable && (
                        <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                        </span>
                      )}
                      {isOccupied && (
                        <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" /> In Play
                        </span>
                      )}
                      {isMaintenance && (
                        <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Maintenance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 relative z-10 flex-1 flex flex-col justify-between bg-white">
                    <div className="bg-surface-container-low p-3 sm:p-4 rounded-2xl border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Hourly Rate</p>
                        <p className="text-xl sm:text-2xl font-bold text-primary font-body">
                          ₹{table.basePricePerHour} <span className="text-[10px] sm:text-xs text-on-surface-variant/60 font-medium">/ hour</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-outline-variant/20 pt-2 sm:pt-0">
                        <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Capacity</p>
                        <p className="text-[10px] sm:text-xs font-semibold text-on-surface">Up to 4 Players</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isAvailable ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTableSelect(table)}
                        className="w-full py-3 sm:py-4 bg-primary hover:bg-primary/90 text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        Reserve Table <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </motion.button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 sm:py-4 bg-surface-container text-on-surface-variant/40 font-bold text-[9px] sm:text-xs uppercase tracking-wider rounded-2xl cursor-not-allowed border border-outline-variant/10"
                      >
                        {isOccupied ? 'Currently Occupied' : 'Under Maintenance'}
                      </button>
                    )}
                  </div>
                </motion.div>
                  );
                })}
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
                          onClick={(e) => { if (!isBookingBlocked) { playClickSound(); handleBookingSubmit(e); } }}
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
