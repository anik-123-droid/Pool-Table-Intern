import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { CheckCircle, CalendarDays, Clock, MapPin, Check, ArrowRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { motion } from 'framer-motion';

import EightBallLoader from '../../components/EightBallLoader';

const BookingSuccess = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const [{ data }] = await Promise.all([
          api.get(`/bookings/${id}`),
          new Promise(resolve => setTimeout(resolve, 2500))
        ]);
        setBooking(data);
      } catch (err) {
        console.error('Error fetching booking:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBooking();
    else {
      setTimeout(() => setLoading(false), 2500);
    }
  }, [id]);

  if (loading) return <EightBallLoader message="Loading Confirmation..." />;
  
  if (!booking) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-error p-8 text-center">
      <h2 className="font-h1 text-4xl italic uppercase mb-2">Booking Not Found</h2>
      <p className="text-on-surface-variant mb-8">The reservation details could not be retrieved.</p>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/')} className="px-8 py-3 bg-primary text-on-surface rounded-xl font-bold uppercase tracking-widest">Return Home</motion.button>
    </div>
  );

  const tableNumber = booking?.table?.tableNumber || booking?.tableId?.tableNumber || booking?.tableId || 'N/A';
  const totalAmount = typeof booking?.totalAmount === 'number' ? booking.totalAmount : 0;
  const equipmentArray = Array.isArray(booking?.equipment) ? booking.equipment : [];
  const equipmentTotal = equipmentArray.reduce((sum, item) => sum + (typeof item?.price === 'number' ? item.price : 0), 0);
  const basePrice = Math.max(0, totalAmount - equipmentTotal - 10);
  
  const formattedDate = isValid(new Date(booking.startTime)) ? format(new Date(booking.startTime), "EEEE, MMMM do, yyyy") : 'Unknown Date';
  const formattedTime = isValid(new Date(booking.startTime)) && isValid(new Date(booking.endTime)) 
    ? `${format(new Date(booking.startTime), "hh:mm a")} - ${format(new Date(booking.endTime), "hh:mm a")}` 
    : 'Unknown Time';

  try {
    return (
      <div className="flex min-h-screen bg-background text-on-background">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 md:ml-[260px] flex flex-col min-w-0 w-full">
          <Header title="Reservation / Confirmation" onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="p-4 md:p-xl flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="w-full max-w-2xl mx-auto relative z-10">
              {/* Success Header */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                className="text-center mb-10 w-full"
              >
                 <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6 relative mx-auto">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="absolute inset-[-8px] border-2 border-emerald-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    <Check className="w-12 h-12 text-emerald-400" strokeWidth={3} />
                 </div>
                 <h1 className="text-4xl md:text-5xl lg:text-6xl font-h1 text-on-surface italic uppercase tracking-tighter leading-none mb-4">
                   <span className="animate-typewriter inline-block">Booking </span>
                   <span className="gradient-text-neon">Confirmed</span>
                 </h1>
                 <p className="text-base md:text-lg text-on-surface-variant font-body mx-auto" style={{ display: 'block', width: '100%', maxWidth: '600px', whiteSpace: 'normal' }}>
                   Your table reservation is confirmed. We've sent the details to your registered email.
                 </p>
              </motion.div>

              {/* Main Summary Card */}
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="glass-card rounded-[32px] md:rounded-[40px] border border-outline-variant/30 overflow-hidden relative confetti-dots"
              >
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>
                 
                 <div className="p-8 md:p-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                       {/* Table Info */}
                       <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-outline-variant/30 text-primary shrink-0">
                             <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Table</p>
                             <p className="text-xl md:text-2xl font-body font-bold text-on-surface uppercase italic">Table {tableNumber}</p>
                             <p className="text-xs text-on-surface-variant mt-1">Billiards South Floor</p>
                          </div>
                       </div>
                       
                       {/* Date & Time */}
                       <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center border border-outline-variant/30 text-secondary shrink-0">
                             <CalendarDays className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Schedule</p>
                             <p className="text-sm md:text-base font-bold text-on-surface mb-1">{formattedDate}</p>
                             <p className="text-xs font-medium text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> {formattedTime}</p>
                          </div>
                       </div>
                    </div>

                    <div className="gradient-divider w-full mb-8" />

                    {/* Pricing Summary */}
                    <div className="space-y-4 mb-8">
                       <div className="flex justify-between items-center text-on-surface-variant text-sm font-medium">
                          <span>Table Access ({booking.durationHours || 0} hours)</span>
                          <span className="text-on-surface">INR {basePrice.toFixed(2)}</span>
                       </div>
                       {equipmentArray.map((eq, i) => (
                         <div key={i} className="flex justify-between items-center text-on-surface-variant text-sm font-medium">
                            <span>{eq?.name || 'Equipment'}</span>
                            <span className="text-on-surface">INR {(typeof eq?.price === 'number' ? eq.price : 0).toFixed(2)}</span>
                         </div>
                       ))}
                       <div className="flex justify-between items-center text-on-surface-variant text-sm font-medium">
                          <span>Lounge Fee</span>
                          <span className="text-on-surface">INR 10.00</span>
                       </div>
                    </div>

                    {/* Total */}
                    <div className="bg-surface-container/50 rounded-2xl p-6 border border-outline-variant/10 flex justify-between items-center">
                       <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total Paid</span>
                       <span className="text-3xl font-body font-bold text-on-surface italic tracking-tighter">INR {totalAmount.toFixed(2)}</span>
                    </div>
                 </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 mt-8"
              >
                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => navigate('/my-bookings')}
                   className="flex-1 py-4 bg-primary text-on-surface rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 neon-shadow-purple hover:brightness-110 transition-all"
                 >
                    View My Bookings <ArrowRight className="w-4 h-4" />
                 </motion.button>
                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => navigate('/')}
                   className="flex-1 py-4 bg-surface-container text-on-surface hover:text-on-surface rounded-2xl font-bold uppercase tracking-widest text-xs border border-outline-variant/30 hover:border-outline-variant transition-colors"
                 >
                    Return Home
                 </motion.button>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Crash in BookingSuccess render:', error);
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-error p-8 text-center">
        <h2 className="font-h1 text-4xl italic uppercase mb-2">Something Went Wrong</h2>
        <p className="text-on-surface-variant mb-8">An error occurred while displaying your confirmation.</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 bg-primary text-on-surface rounded-xl font-bold uppercase tracking-widest">Return Home</button>
      </div>
    );
  }
};

export default BookingSuccess;
