import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import TableCanvas from '../../components/TableCanvas';
import { getSocket } from '../../utils/socket';
import { Clock, CheckCircle, XCircle, AlertTriangle, Maximize2, Info, X, Star, User, Calendar, Plus, GlassWater, Zap, CircleDot, CreditCard, Users, Trophy } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../utils/audio';
import WaitlistModal from '../../components/WaitlistModal';
import { format } from 'date-fns';
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
        } catch (e) {}
      } else if (Array.isArray(data)) {
        setTables(data);
        try {
          localStorage.setItem('cached_tables', JSON.stringify(data));
        } catch (e) {}
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

  const handleBook = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const totalHours = (parseFloat(durationHours) || 0) + (parseFloat(durationMinutes) || 0) / 60;
      if (totalHours <= 0) {
        setError('Duration must be at least 15 minutes');
        return;
      }

      const equipment = [];
      if (rentProfessionalCues) equipment.push({ name: 'Professional Cues', price: 50 });
      if (rentPremiumBalls) equipment.push({ name: 'Premium Ball Set', price: 30 });

      const { data } = await api.post('/bookings', {
        tableId: selectedTable.id,
        startTime: new Date(selectedDate).toISOString(),
        durationHours: totalHours,
        equipment: equipment
      });

      playSuccessChime();
      setSuccess('Table booked successfully!');
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setIsSubmitting(false);
        if (data && data.id) {
          navigate(`/booking-success/${data.id.toString()}`);
        } else {
          setError('Booking successful but failed to redirect.');
        }
      }, 300);
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.message || 'Failed to book table');
      setIsSubmitting(false);
    }
  };

  const handleTableSelect = (table) => {
    playClickSound();
    setSelectedTable(table);
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
                onClick={() => setShowModal(false)}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] z-[110] bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '90vw', maxWidth: '400px' }}
              >
                
                {/* Header Area */}
                <div className="p-6 flex-shrink-0 flex items-center justify-between border-b border-outline-variant/10">
                  <h3 className="font-h1 text-xl md:text-2xl text-on-surface uppercase tracking-tight">
                    {selectedTable.size === '9ft' ? 'Royal Slate Pro' : 'Shadow Edge ' + selectedTable.size}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/20">#{selectedTable.tableNumber}</span>
                    <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

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
                    {error && <div className="p-3 bg-error-container/20 text-error text-[10px] rounded-xl mb-4 border border-error/50 font-bold uppercase tracking-widest">{error}</div>}
                    {success && <div className="p-3 bg-secondary-container/20 text-secondary text-[10px] rounded-xl mb-4 border border-secondary/50 font-bold uppercase tracking-widest">{success}</div>}

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
                          const isActive = Number(durationHours) === preset.h && Number(durationMinutes) === preset.m;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setDurationHours(preset.h);
                                setDurationMinutes(preset.m);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${isActive ? 'bg-primary text-white border-primary shadow-[0_0_10px_rgba(22,101,52,0.3)]' : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/50'}`}
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
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                    disabled={isSubmitting}
                    onClick={() => { if(!isSubmitting) { playClickSound(); handleBook(); } }}
                    className={`w-full font-h1 text-lg italic py-4 rounded-2xl transition-all uppercase tracking-widest mb-3 ${isSubmitting ? 'bg-primary/50 text-white/70 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-md'}`}
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
