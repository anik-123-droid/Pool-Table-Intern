import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { Users, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import EightBallLoader from '../../components/EightBallLoader';

const WaitlistSuccess = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [{ data }] = await Promise.all([
          api.get('/waitlist/status'),
          new Promise(resolve => setTimeout(resolve, 2500))
        ]);
        if (!data.isOnWaitlist) {
          navigate('/');
        } else {
          setStatus(data);
        }
      } catch (err) {
        console.error('Error fetching waitlist status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [navigate]);

  if (loading) return <EightBallLoader message="Loading Status..." />;

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0 w-full">
        <Header title="Waitlist Confirmation" onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="p-4 md:p-xl flex-1 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="w-full max-w-2xl mx-auto relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
              className="text-center mb-10 w-full"
            >
               <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 relative mx-auto">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <Users className="w-12 h-12 text-primary" strokeWidth={2} />
               </div>
               <h1 className="text-4xl md:text-5xl font-h1 text-on-surface italic uppercase tracking-tighter leading-none mb-4">You're in the <span className="text-primary">Queue</span></h1>
               <p className="text-base text-on-surface-variant font-body mx-auto max-w-md">
                 You have successfully joined the lounge waitlist. We will notify you when a table is ready.
               </p>
            </motion.div>

            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card rounded-[32px] md:rounded-[40px] border border-outline-variant/30 overflow-hidden relative"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50"></div>
               
               <div className="p-8 md:p-10 text-center">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Your Current Position</p>
                  <p className="text-6xl font-body font-bold text-on-surface italic mb-4">#{status?.position}</p>
                  
                  <div className="flex items-center justify-center gap-2 text-secondary text-sm font-medium bg-secondary/10 py-3 px-6 rounded-2xl inline-flex mb-6 border border-secondary/20">
                    <Clock className="w-4 h-4" /> Estimated wait: ~{status?.position * 15} mins
                  </div>
               </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-center mt-8"
            >
               <button 
                 onClick={() => navigate('/')}
                 className="px-8 py-4 bg-surface-container text-on-surface hover:text-primary rounded-2xl font-bold uppercase tracking-widest text-xs border border-outline-variant/30 hover:border-primary/50 transition-all flex items-center gap-2"
               >
                  Return to Dashboard <ArrowRight className="w-4 h-4" />
               </button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WaitlistSuccess;
