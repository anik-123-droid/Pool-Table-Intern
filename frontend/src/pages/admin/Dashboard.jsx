import { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
  TrendingUp, Calendar, Star, MoreVertical, Download, Plus,
  ArrowRight, LayoutGrid, BarChart2, Search, Bell, User, Clock, Activity
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (dateStr) => {
  if (!dateStr) return "00:00";
  const d = new Date(dateStr);
  return isValid(d) ? format(d, "hh:mm a") : "00:00";
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every minute to refresh statuses (ACTIVE -> COMPLETED) automatically
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState({
    dailyRevenue: 0,
    monthlyRevenue: 0,
    activeBookings: 0,
    maxBookings: 40,
    mostPopularTable: 'N/A',
    todayBookings: []
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 15000); // refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/bookings');
      if (data) {
        setStats({
          recentBookings: Array.isArray(data) ? data : []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    // Instant UI update
    setActiveDropdown(null);
    setStats(prev => ({
      ...prev,
      recentBookings: (prev.recentBookings || []).map(b => b.id === bookingId ? { ...b, status } : b)
    }));

    try {
      await api.put(`/bookings/${bookingId}`, { status });
      fetchStats();
    } catch (err) {
      console.error(err);
      fetchStats();
    }
  };

  const filteredBookings = (stats.recentBookings || []).filter(booking => {
    const userName = booking.user?.name || booking.userId?.name || (booking.userId === user?.id || booking.userId?.id === user?.id ? user?.name : 'Guest User');
    const matchesSearch = userName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!booking.startTime) return false;
    const bookingDate = new Date(booking.startTime);
    const today = new Date();
    const isToday = bookingDate.getDate() === today.getDate() &&
                    bookingDate.getMonth() === today.getMonth() &&
                    bookingDate.getFullYear() === today.getFullYear();
    
    const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const isFuture = bookingDate >= startOfTomorrow;

    if (showUpcoming) {
      return matchesSearch && isFuture;
    } else {
      return matchesSearch && isToday;
    }
  });

  const getBookingUserName = (booking) => {
    if (booking.user?.name) return booking.user.name;
    if (booking.userId?.name) return booking.userId.name;
    if (booking.userId === user?.id || booking.userId?.id === user?.id) return user?.name || 'Guest User';
    return 'Guest User';
  };

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <header className="h-16 md:h-20 border-b border-outline-variant/10 bg-background/70 backdrop-blur-2xl flex items-center justify-between px-4 md:px-xl sticky top-0 z-30 relative">
          <div className="absolute bottom-0 left-0 right-0 gradient-divider" />
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 -ml-1.5 text-on-surface-variant hover:text-on-surface transition-colors btn-press">
              <LayoutGrid className="w-5 h-5" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Dashboard Overview</p>
          </div>
          
          <div className="hidden md:flex justify-center flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search bookings by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-low border border-primary/30 rounded-full py-2 pl-11 pr-6 text-sm w-96 focus:border-primary transition-all outline-none text-on-surface placeholder-on-surface-variant/50 focus:shadow-[0_0_16px_rgba(6,36,255,0.15)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 md:gap-6">
            <div className="hidden md:flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-xs border border-outline-variant/30 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'A'
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-xl flex-1 overflow-y-auto space-y-6 md:space-y-lg">
          {/* Mobile Search Bar */}
          <div className="md:hidden relative group px-2">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search bookings by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-primary/30 rounded-full py-3 pl-11 pr-6 text-sm focus:border-primary transition-all outline-none text-on-surface placeholder-on-surface-variant/50 focus:shadow-[0_0_16px_rgba(6,36,255,0.15)]"
            />
          </div>

          {/* Booking Overview Section */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 px-2 md:px-4 gap-3">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <h2 className="font-h1 text-2xl md:text-3xl lg:text-4xl text-on-surface uppercase tracking-tight mb-2">
                  {showUpcoming ? 'Upcoming ' : 'Today\'s '}<span className="gradient-text-neon">Bookings</span>
                </h2>
                <p className="text-on-surface-variant font-body-md opacity-80">Managing {filteredBookings.length} sessions for {showUpcoming ? 'upcoming days' : 'today'}</p>
              </motion.div>
              <div className="flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className="px-4 md:px-6 py-2 bg-primary/10 text-primary border border-primary/30 font-bold text-[10px] tracking-widest uppercase rounded-lg hover:bg-primary/20 transition-all"
                >
                  {showUpcoming ? 'View Today' : 'View Upcoming'}
                </motion.button>
              </div>
            </div>

            {/* Cyberpunk VIP Ticket Pass Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking, index) => {
                    const isUpcoming = new Date(booking.startTime) > currentTime;
                    const isCompleted = new Date(booking.endTime) <= currentTime;
                    const isCancelled = booking.status === 'cancelled';
                    const isActive = new Date(booking.startTime) <= currentTime && new Date(booking.endTime) > currentTime && !isCancelled;
                    const tableNum = booking.table?.tableNumber || booking.tableId?.tableNumber || '?';
                    const tableSize = booking.table?.size || booking.tableId?.size || '';
                    
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
                        <div className="w-4 h-4 bg-background rounded-full absolute -left-2.5 top-1/2 -translate-y-1/2 border-r border-outline-variant/20" />
                        <div className="w-4 h-4 bg-background rounded-full absolute -right-2.5 top-1/2 -translate-y-1/2 border-l border-outline-variant/20" />

                        {/* Header: Table Number & Status Pill */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-black text-sm ${
                                isActive ? 'bg-secondary/10 text-secondary border-secondary/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]' :
                                isUpcoming ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_12px_rgba(22,101,52,0.2)]' : 
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
                              isActive ? 'bg-secondary/15 text-secondary border-secondary/40 shadow-[0_0_10px_rgba(56,189,248,0.25)] animate-pulse' :
                              isUpcoming ? 'bg-primary/15 text-primary border-primary/40 shadow-[0_0_10px_rgba(22,101,52,0.25)]' : 
                              isCancelled ? 'bg-error/15 text-error border-error/40' :
                              'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                            }`}>
                              {booking.status === 'cancelled'
                                ? 'CANCELLED'
                                : isCompleted 
                                ? 'COMPLETED' 
                                : isActive 
                                  ? 'ACTIVE' 
                                  : 'UPCOMING'}
                            </span>
                          </div>

                          {/* Ticket Info Grid */}
                          <div className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/15 space-y-2 mb-4">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold text-[8px] border border-outline-variant/30">
                                  {getBookingUserName(booking).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-on-surface font-semibold truncate max-w-[120px]">{getBookingUserName(booking)}</span>
                              </div>
                              <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">User</span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/10">
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
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/10">
                              <span className="text-on-surface-variant/60 font-bold uppercase tracking-wider text-[10px]">Amount</span>
                              <span className="text-secondary font-bold font-body">₹{booking.totalAmount?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="flex items-center gap-2 pt-3 border-t border-outline-variant/15 relative">
                           <button 
                             onClick={() => setActiveDropdown(activeDropdown === booking.id ? null : booking.id)}
                             className="w-full py-2.5 px-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-on-surface hover:text-primary transition-all text-center flex items-center justify-center gap-1.5"
                           >
                             Manage Booking
                             <MoreVertical className="w-3.5 h-3.5" />
                           </button>
                           {activeDropdown === booking.id && (
                             <div className="absolute right-0 bottom-12 w-full bg-surface-container-highest border border-outline-variant/30 rounded-xl shadow-xl overflow-hidden z-50">
                               <button
                                 onClick={() => { handleUpdateStatus(booking.id, 'completed'); setActiveDropdown(null); }}
                                 className="w-full text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors border-b border-outline-variant/10"
                               >
                                 Mark Completed
                               </button>
                               <button
                                 onClick={() => { handleUpdateStatus(booking.id, 'cancelled'); setActiveDropdown(null); }}
                                 className="w-full text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-error hover:bg-error/10 transition-colors"
                               >
                                 Cancel Booking
                               </button>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full p-12 text-center text-on-surface-variant glass-card rounded-3xl border border-outline-variant/20">
                    <div className="flex flex-col items-center gap-3 opacity-60">
                      <svg className="w-12 h-12 text-primary/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>
                      <p className="text-sm font-medium">No bookings scheduled for {showUpcoming ? 'upcoming days' : 'today'}.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>


        </main>
      </div>
    </div>
  );
};

export default Dashboard;
