import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { useToast } from '../../context/ToastContext';
import { getSocket } from '../../utils/socket';
import {
  Plus, Edit2, Trash2, Clock, Settings, IndianRupee, Wrench, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TableManagement = () => {
  const { addToast } = useToast();
  const [tables, setTables] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_cached_tables');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({ tableNumber: '', size: '9ft', basePricePerHour: '' });
  const [liveSessions, setLiveSessions] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [maintenanceModalTable, setMaintenanceModalTable] = useState(null);
  const [priceModalTable, setPriceModalTable] = useState(null);
  const [newHourlyRate, setNewHourlyRate] = useState('');
  const [timers, setTimers] = useState({});

  useEffect(() => {
    fetchTables();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchTables();
    };

    socket.on('tables_updated', handleUpdate);
    socket.on('booking_updated', handleUpdate);

    const pollInterval = setInterval(() => {
      fetchTables();
    }, 3000);

    return () => {
      socket.off('tables_updated', handleUpdate);
      socket.off('booking_updated', handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Timer countdown background logic
  useEffect(() => {
    const loadTimers = () => {
      try {
        const stored = localStorage.getItem('poolTableTimers');
        if (stored) {
          const parsed = JSON.parse(stored);
          const now = Date.now();
          const activeTimers = {};
          let changed = false;
          
          for (const id in parsed) {
            if (parsed[id] > now) {
              activeTimers[id] = Math.floor((parsed[id] - now) / 1000);
            } else {
              changed = true;
            }
          }
          
          if (changed) {
            const updatedStorage = {};
            for (const id in activeTimers) {
              updatedStorage[id] = parsed[id];
            }
            localStorage.setItem('poolTableTimers', JSON.stringify(updatedStorage));
          }
          
          setTimers(activeTimers);
        }
      } catch (e) {}
    };
    
    loadTimers();

    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem('poolTableTimers');
        if (!stored) return;
        
        const parsed = JSON.parse(stored);
        const now = Date.now();
        const next = {};
        let needsCleanup = false;
        
        for (const id in parsed) {
          if (parsed[id] > now) {
            next[id] = Math.floor((parsed[id] - now) / 1000);
          } else {
            needsCleanup = true;
          }
        }

        if (needsCleanup) {
          const updatedStorage = {};
          for (const id in next) {
            updatedStorage[id] = parsed[id];
          }
          localStorage.setItem('poolTableTimers', JSON.stringify(updatedStorage));
        }

        setTimers(next);
      } catch (e) {}
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetTimer = (table) => {
    const mins = window.prompt(`Set countdown timer for Table ${table.tableNumber} (in minutes):`, '60');
    if (mins !== null) {
      const parsedMins = parseInt(mins, 10);
      if (!isNaN(parsedMins) && parsedMins > 0) {
        const endTime = Date.now() + (parsedMins * 60 * 1000);
        try {
          const stored = localStorage.getItem('poolTableTimers');
          const parsed = stored ? JSON.parse(stored) : {};
          parsed[table.id] = endTime;
          localStorage.setItem('poolTableTimers', JSON.stringify(parsed));
        } catch (err) {
          console.error("Error saving timer", err);
        }
        setTimers(prev => ({ ...prev, [table.id]: parsedMins * 60 }));
        addToast(`Timer set for Table ${table.tableNumber} (${parsedMins} min)`, 'success');
      }
    }
  };

  const handleClearTimer = (tableId) => {
    try {
      const stored = localStorage.getItem('poolTableTimers');
      if (stored) {
        const parsed = JSON.parse(stored);
        delete parsed[tableId];
        localStorage.setItem('poolTableTimers', JSON.stringify(parsed));
      }
    } catch (e) {}
    setTimers(prev => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
    addToast('Timer stopped', 'info');
  };

  const handleOpenPriceModal = (table) => {
    setPriceModalTable(table);
    setNewHourlyRate(table.basePricePerHour ? table.basePricePerHour.toString() : '200');
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!priceModalTable) return;
    const rateNum = parseFloat(newHourlyRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      addToast('Please enter a valid positive price rate', 'error');
      return;
    }

    const targetTable = priceModalTable;
    setTables(prev => prev.map(t => t.id === targetTable.id ? { ...t, basePricePerHour: rateNum } : t));
    setPriceModalTable(null);
    addToast(`Table #${targetTable.tableNumber} rate set to INR ${rateNum}/h`, 'success');

    try {
      await api.put(`/tables/${targetTable.id}`, { basePricePerHour: rateNum });
      fetchTables();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update price', 'error');
      fetchTables();
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const { data } = await api.get('/tables/availability?summary=true');
      if (data && data.summary) {
        setLiveSessions(data.summary.occupiedCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTables = async () => {
    try {
      const isoTime = new Date().toISOString();
      const { data } = await api.get(`/tables/availability?time=${isoTime}&summary=true`);
      let loadedTables = [];
      if (data && data.tables) {
        loadedTables = data.tables;
        if (data.summary) {
          setLiveSessions(data.summary.occupiedCount || 0);
        }
      } else if (Array.isArray(data)) {
        loadedTables = data;
      }
      if (loadedTables.length > 0) {
        setTables(loadedTables);
        try {
          localStorage.setItem('admin_cached_tables', JSON.stringify(loadedTables));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Fetch tables error:', err);
      try {
        const cached = localStorage.getItem('admin_cached_tables');
        if (cached && tables.length === 0) {
          setTables(JSON.parse(cached));
        }
      } catch (e) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, {
          tableNumber: formData.tableNumber,
          size: formData.size,
          basePricePerHour: parseFloat(formData.basePricePerHour),
          color: 'green'
        });
        addToast('Table updated successfully', 'success');
      } else {
        await api.post('/tables', {
          tableNumber: formData.tableNumber,
          size: formData.size,
          basePricePerHour: parseFloat(formData.basePricePerHour),
          color: 'green',
          positionX: 50,
          positionY: 50,
          rotation: 0
        });
        addToast('Table created successfully', 'success');
      }
      setShowModal(false);
      fetchTables();
    } catch (err) {
      addToast(err.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) return;
    try {
      await api.delete(`/tables/${id}`);
      addToast('Table deleted successfully', 'success');
      fetchTables();
    } catch (err) {
      addToast('Failed to delete table', 'error');
    }
  };

  const handleToggleStatus = async (table) => {
    if (table.status === 'active') {
      setMaintenanceModalTable(table);
    } else {
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: 'active' } : t));
      addToast('Table set to active', 'success');
      try {
        await api.put(`/tables/${table.id}`, { status: 'active' });
      } catch (err) {
        addToast('Failed to revert status', 'error');
        fetchTables();
      }
    }
  };

  const executeMaintenance = async (type) => {
    if (!maintenanceModalTable) return;
    const targetTable = maintenanceModalTable;
    const newStatus = type === 'emergency' ? 'maintenance' : 'maintenance_scheduled';
    
    setMaintenanceModalTable(null);
    setTables(prev => prev.map(t => t.id === targetTable.id ? { ...t, status: newStatus } : t));
    addToast(type === 'emergency' ? 'Table halted immediately' : 'Maintenance scheduled', 'success');

    try {
      await api.put(`/tables/${targetTable.id}/maintenance`, { type });
    } catch (err) {
      addToast('Failed to set maintenance', 'error');
      fetchTables();
    }
  };

  // Open centered add modal pre-filling table size and auto-calculated table number
  const handleOpenAddModal = (size) => {
    let nextNum = 1;
    if (tables.length > 0) {
      const numbers = tables.map(t => parseInt(t.tableNumber.toString().replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      } else {
        nextNum = tables.length + 1;
      }
    }
    const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;

    let defaultRate = 200;
    if (size === '9ft') defaultRate = 250;
    if (size === '7ft') defaultRate = 180;

    setEditingTable(null);
    setFormData({
      tableNumber: formattedNum,
      size: size,
      basePricePerHour: defaultRate.toString()
    });
    setShowModal(true);
  };

  // Sort tables strictly by numeric table number (1, 2, 3, ...)
  const sortedTables = [...tables].sort((a, b) => 
    a.tableNumber.toString().localeCompare(b.tableNumber.toString(), undefined, { numeric: true, sensitivity: 'base' })
  );

  const stats = [
    { label: 'Total Tables', value: tables.length, color: 'text-primary' },
    { label: 'Active Sessions', value: liveSessions, color: 'text-secondary' },
    { label: 'Maintenance', value: tables.filter(t => t.status === 'maintenance' || t.status === 'maintenance_scheduled').length, color: 'text-error' },
    { label: 'Avg. Rate', value: 'INR ' + (tables.length > 0 ? (tables.reduce((acc, t) => acc + (t.basePricePerHour || 0), 0) / tables.length).toFixed(0) : '0'), color: 'text-on-surface' },
  ];

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <Header title="Table Management" onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="p-4 md:p-xl pt-6 flex-1 flex flex-col space-y-4 md:space-y-lg pb-32">
          {/* Stats Header */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-4 md:p-5 rounded-2xl md:rounded-3xl border border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50 relative overflow-hidden"
              >
                <div>
                  <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 opacity-70">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-body font-bold text-on-surface flex items-baseline gap-1">
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Add Action Bar (Opens Centered Add Modal) */}
          <div className="glass-card p-4 rounded-3xl border border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest/60 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Quick Add Table:</span>
              <button
                onClick={() => handleOpenAddModal('9ft')}
                className="px-4 py-2.5 bg-primary/10 border border-primary/30 hover:border-primary text-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> 9ft Pro
              </button>
              <button
                onClick={() => handleOpenAddModal('8ft')}
                className="px-4 py-2.5 bg-secondary/10 border border-secondary/30 hover:border-secondary text-secondary text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> 8ft Standard
              </button>
              <button
                onClick={() => handleOpenAddModal('7ft')}
                className="px-4 py-2.5 bg-surface-container-highest border border-outline-variant/30 hover:border-on-surface text-on-surface text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> 7ft Junior
              </button>
            </div>
          </div>

          {/* Billiard Table Box Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
            {sortedTables.map((table, idx) => {
              const isTimerActive = timers[table.id] !== undefined;
              const isOccupied = table.status === 'occupied';
              const isMaintenance = table.status === 'maintenance' || table.status === 'maintenance_scheduled';
              const isAvailable = !isOccupied && !isMaintenance;

              return (
                <motion.div
                  key={table.id || idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                  className={`relative rounded-[32px] overflow-hidden border transition-all duration-300 flex flex-col justify-between group shadow-xl min-h-[250px] ${
                    isTimerActive && timers[table.id] <= 10 
                      ? 'border-red-500 ring-2 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse' 
                      : isAvailable 
                      ? 'border-emerald-500/30 hover:border-emerald-500/70 bg-gradient-to-b from-[#14291b] to-[#0c1910] hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)]'
                      : isOccupied
                      ? 'border-rose-500/30 hover:border-rose-500/70 bg-gradient-to-b from-[#2a1317] to-[#170a0c]'
                      : 'border-amber-500/30 hover:border-amber-500/70 bg-gradient-to-b from-[#261d10] to-[#140e08]'
                  }`}
                >
                  {/* Top Billiard Mini Felt Visualizer Header */}
                  <div className="relative p-4 sm:p-6 pb-3 sm:pb-5 bg-[#112216] border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#153e24_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-400 border border-yellow-200 shadow-[0_0_8px_rgba(251,191,36,0.6)] flex items-center justify-center text-[9px] font-bold text-black">8</span>
                        <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                          Table #<span className="font-sans">{table.tableNumber}</span>
                        </h3>
                      </div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-primary/80 mt-1">
                        {table.size === '9ft' ? '9ft Pro Tournament' : table.size === '8ft' ? '8ft Standard' : '7ft Junior'}
                      </p>
                    </div>

                    <div className="relative z-10 self-end sm:self-auto">
                      {/* isAvailable removed from Admin Table Manage view as requested */}
                      {isOccupied && (
                        <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                          <span className="w-2 h-2 rounded-full bg-rose-400" /> In Play
                        </span>
                      )}
                      {isMaintenance && (
                        <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                          <span className="w-2 h-2 rounded-full bg-amber-400" /> Maintenance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 relative z-10 flex-1 flex flex-col justify-center">
                    <div className="bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-medium text-white/50 uppercase tracking-widest">Hourly Rate</p>
                        <button
                          onClick={() => handleOpenPriceModal(table)}
                          className="text-lg sm:text-xl font-bold text-primary hover:text-white transition-colors flex items-center gap-1 group/price text-left"
                          title="Click to edit rate"
                        >
                          INR {table.basePricePerHour} <span className="text-xs font-normal text-white/60">/h</span>
                          <Edit2 className="w-4 h-4 opacity-0 group-hover/price:opacity-100 transition-opacity ml-1 text-primary" />
                        </button>
                      </div>

                      {isTimerActive ? (
                        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 bg-emerald-500/20 border border-emerald-400/50 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                            <span className={`text-xs sm:text-sm font-semibold tracking-wider ${timers[table.id] <= 10 ? 'text-red-400 animate-pulse' : 'text-primary'}`}>
                              {formatTime(timers[table.id])}
                            </span>
                          </div>
                          <button
                            onClick={() => handleClearTimer(table.id)}
                            className="p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-red-400 transition-colors"
                            title="Clear Timer"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetTimer(table)}
                          className="w-full sm:w-auto justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/40 text-white/80 hover:text-primary text-[10px] sm:text-xs font-medium uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                          title="Start timer"
                        >
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Set Timer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer Bar */}
                  <div className="p-3 sm:p-4 pt-2.5 sm:pt-3 bg-black/60 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 relative z-10">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleSetTimer(table)}
                        className="p-2 rounded-xl text-white/70 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Set Countdown Timer"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenPriceModal(table)}
                        className="p-2 rounded-xl text-white/70 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit Rate"
                      >
                        <IndianRupee className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(table)}
                        className={`p-2 rounded-xl transition-colors ${table.status !== 'active' ? 'text-amber-400 bg-amber-500/20' : 'text-white/70 hover:text-amber-400 hover:bg-amber-500/10'}`}
                        title="Maintenance Options"
                      >
                        <Wrench className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingTable(table); setFormData(table); setShowModal(true); }}
                        className="p-2 rounded-xl text-white/70 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Edit Table"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(table.id)}
                        className="p-2 rounded-xl text-white/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Table"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </main>

        {/* Add/Edit Table CENTERED Popup Modal */}
        <AnimatePresence>
          {showModal && (
            <>
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
                style={{ width: '90vw', maxWidth: '440px' }}
              >
                <div className="flex justify-between items-start p-6 pb-4 border-b border-outline-variant/10">
                  <div>
                    <h3 className="font-h1 text-2xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                      <Settings className="w-6 h-6 text-primary" />
                      {editingTable ? 'Edit Table' : 'Add New Table'}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">Configure table details and hourly rate</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <form id="table-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Table Number</label>
                      <input
                        required
                        value={formData.tableNumber}
                        onChange={e => setFormData({ ...formData, tableNumber: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface text-base font-bold focus:border-primary/50 outline-none transition-all"
                        placeholder="e.g. 05"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Table Dimensions</label>
                      <select
                        value={formData.size}
                        onChange={e => setFormData({ ...formData, size: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface text-base font-bold focus:border-primary/50 outline-none appearance-none transition-all"
                      >
                        <option value="7ft" className="bg-[#1a1a1a] text-on-surface">7ft Junior</option>
                        <option value="8ft" className="bg-[#1a1a1a] text-on-surface">8ft Standard</option>
                        <option value="9ft" className="bg-[#1a1a1a] text-on-surface">9ft Pro Tournament</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Hourly Rate (INR)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                        <input
                          type="number"
                          value={formData.basePricePerHour}
                          onChange={(e) => setFormData({ ...formData, basePricePerHour: e.target.value })}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 pl-12 text-on-surface text-base font-bold focus:border-primary/50 outline-none transition-all"
                          placeholder="e.g. 200"
                          required
                        />
                      </div>
                    </div>
                  </form>
                </div>
                
                <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3.5 bg-surface-container-highest text-on-surface font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit" 
                    form="table-form"
                    className="flex-1 bg-primary text-white font-h1 text-sm py-3.5 rounded-xl hover:brightness-110 transition-all uppercase tracking-widest shadow-md"
                  >
                    {editingTable ? 'Save Changes' : 'Add Table'}
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Maintenance Options Modal */}
        <AnimatePresence>
          {maintenanceModalTable && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMaintenanceModalTable(null)}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] z-[110] bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '90vw', maxWidth: '400px' }}
              >
                <div className="flex justify-between items-start p-6 pb-2">
                  <div>
                    <h3 className="font-h1 text-2xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-error" />
                      Maintenance Options
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-2">Choose how to handle Table #{maintenanceModalTable.tableNumber}</p>
                  </div>
                  <button onClick={() => setMaintenanceModalTable(null)} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => executeMaintenance('scheduled')}
                    className="w-full text-left p-4 rounded-2xl border border-secondary/30 hover:border-secondary bg-secondary/5 hover:bg-secondary/10 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-secondary" />
                      <span className="font-bold text-on-surface uppercase tracking-widest text-sm">Schedule Maintenance</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Prevents new bookings. Table goes offline automatically after existing bookings are finished.
                    </p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => executeMaintenance('emergency')}
                    className="w-full text-left p-4 rounded-2xl border border-error/30 hover:border-error bg-error/5 hover:bg-error/10 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 text-error" />
                      <span className="font-bold text-on-surface uppercase tracking-widest text-sm">Emergency Halt</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Shuts down immediately. All active and upcoming bookings on this table will be halted.
                    </p>
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Set Hourly Price Modal */}
        <AnimatePresence>
          {priceModalTable && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPriceModalTable(null)}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] z-[110] bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '90vw', maxWidth: '400px' }}
              >
                <div className="flex justify-between items-start p-6 pb-2">
                  <div>
                    <h3 className="font-h1 text-2xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                      <IndianRupee className="w-6 h-6 text-primary" />
                      Set Table Rate
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Update hourly price for Table #{priceModalTable.tableNumber} ({priceModalTable.size})
                    </p>
                  </div>
                  <button onClick={() => setPriceModalTable(null)} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSavePrice} className="p-6 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Hourly Rate (INR)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                      <input
                        type="number"
                        step="10"
                        min="10"
                        required
                        value={newHourlyRate}
                        onChange={(e) => setNewHourlyRate(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 pl-12 text-on-surface text-lg font-bold focus:border-primary outline-none transition-all"
                        placeholder="e.g. 250"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPriceModalTable(null)}
                      className="flex-1 py-3 bg-surface-container-highest text-on-surface font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-surface-container-high transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-colors shadow-md"
                    >
                      Save Rate
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TableManagement;
