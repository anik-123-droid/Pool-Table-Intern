import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import TableCanvas from '../../components/TableCanvas';
import { useToast } from '../../context/ToastContext';
import { getSocket } from '../../utils/socket';
import {
  Plus, Edit2, Trash2, Search, Activity, Clock,
  Settings, CheckCircle, ChevronLeft, ChevronRight, Check,
  Monitor, Layout, IndianRupee, Wrench, Grid, MapPin, X, Menu, AlertTriangle
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
  const [formData, setFormData] = useState({ tableNumber: '', size: '9ft', basePricePerHour: '', color: 'green' });
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSessions, setLiveSessions] = useState(0);
  const [viewMode, setViewMode] = useState('floor');
  const [canvasViewMode, setCanvasViewMode] = useState('standard');
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [maintenanceModalTable, setMaintenanceModalTable] = useState(null);

  useEffect(() => {
    fetchTables();
    fetchLiveSessions();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchTables();
      fetchLiveSessions();
    };

    socket.on('tables_updated', handleUpdate);

    return () => {
      socket.off('tables_updated', handleUpdate);
    };
  }, []);

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
      const { data } = await api.get('/tables');
      if (Array.isArray(data) && data.length > 0) {
        setTables(data);
        try {
          localStorage.setItem('admin_cached_tables', JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Fetch tables error:', err);
      // Fallback to cache if network fails, don't wipe tables
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
          color: formData.color
        });
        addToast('Table updated successfully', 'success');
      } else {
        await api.post('/tables', {
          tableNumber: formData.tableNumber,
          size: formData.size,
          basePricePerHour: parseFloat(formData.basePricePerHour),
          color: formData.color,
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

  const handleCreateOrUpdate = handleSubmit;

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

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/tables/${id}`, { status });
      addToast(`Table status updated to ${status}`, 'success');
      fetchTables();
    } catch (err) {
      addToast('Failed to update table status', 'error');
    }
  };

  const handleToggleStatus = async (table) => {
    if (table.status === 'active') {
      setMaintenanceModalTable(table);
    } else {
      // Optimistic instant UI update
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
    
    // Instant modal close and optimistic UI update
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

  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    setSaveSuccess(true);
    addToast('Floor plan layout saved!', 'success');
    setTimeout(() => setSaveSuccess(false), 3000);

    try {
      await api.put('/tables/bulk-layout', { tables });
    } catch (err) {
      addToast('Failed to save layout positions', 'error');
      fetchTables();
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleLayoutChange = async (updatedTables, action) => {
    if (action && action.type === 'delete') {
      try {
        await api.delete(`/tables/${action.id}`);
        fetchTables();
      } catch (err) {
        console.error('Failed to delete table', err);
      }
      return;
    }
    setTables(updatedTables);
  };

  const handleAddTableBlueprint = async (size) => {
    let nextNum = 1;
    if (tables.length > 0) {
      const numbers = tables.map(t => parseInt(t.tableNumber, 10)).filter(n => !isNaN(n));
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

    try {
      const numTables = tables.length;
      const row = Math.floor(numTables / 3);
      const col = numTables % 3;
      
      const positionX = Math.min(10 + (col * 25), 75);
      const positionY = Math.min(10 + (row * 20), 75);

      await api.post('/tables', {
        tableNumber: formattedNum,
        size: size,
        basePricePerHour: defaultRate,
        positionX: positionX,
        positionY: positionY,
        rotation: 0,
        color: 'green'
      });
      fetchTables();
      addToast('Table added to layout', 'success');
    } catch (err) {
      addToast('Failed to place new table: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const stats = [
    { label: 'Total Tables', value: tables.length, icon: Monitor, color: 'text-primary' },
    { label: 'Active Sessions', value: liveSessions, icon: Clock, color: 'text-secondary' },
    { label: 'Maintenance', value: tables.filter(t => t.status === 'maintenance').length, icon: Settings, color: 'text-error' },
    { label: 'Avg. Rate', value: 'INR ' + (tables.length > 0 ? (tables.reduce((acc, t) => acc + t.basePricePerHour, 0) / tables.length).toFixed(0) : '0'), icon: IndianRupee, color: 'text-on-surface' },
  ];

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0">
        <Header title="Table Management" onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="p-4 md:p-xl pt-6 flex-1 flex flex-col space-y-4 md:space-y-lg">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-4 md:p-5 rounded-2xl md:rounded-3xl border border-outline-variant/20 flex justify-between items-center group hover:border-primary/40 transition-all relative overflow-hidden bg-surface-container-low/50"
              >
                <div className="relative z-10">
                  <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 opacity-70">{stat.label}</p>
                  <p className="text-xl md:text-2xl font-body font-bold text-on-surface flex items-baseline gap-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-surface-container-highest flex items-center justify-center ${stat.color} border border-outline-variant/20 shadow-sm group-hover:scale-110 transition-transform icon-glow relative z-10 shrink-0`}>
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Core Feature: Interactive Floor Plan Editor */}
          {viewMode === 'floor' ? (
            <div className="flex flex-col space-y-4 md:space-y-lg">
              {/* Toolbar */}
              <div className="glass-card p-3 md:p-4 rounded-[20px] md:rounded-[24px] border border-outline-variant/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {isEditing ? (
                    <>
                      <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mr-2 flex items-center gap-2">
                        <Grid className="w-3.5 h-3.5" />
                        Place Table:
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddTableBlueprint('9ft')}
                        className="group px-4 py-2 bg-white border border-primary/30 hover:border-primary flex items-center gap-2 rounded-xl transition-all shadow-[0_0_10px_rgba(0,163,255,0.1)] hover:shadow-[0_0_15px_rgba(0,163,255,0.3)]"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary group-hover:rotate-90 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">9ft Pro</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddTableBlueprint('8ft')}
                        className="group px-4 py-2 bg-white border border-secondary/30 hover:border-secondary flex items-center gap-2 rounded-xl transition-all shadow-[0_0_10px_rgba(100,142,208,0.1)] hover:shadow-[0_0_15px_rgba(100,142,208,0.3)]"
                      >
                        <Plus className="w-3.5 h-3.5 text-secondary group-hover:rotate-90 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary">8ft Std</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddTableBlueprint('7ft')}
                        className="group px-4 py-2 bg-white border border-on-surface-variant/30 hover:border-on-surface flex items-center gap-2 rounded-xl transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-on-surface-variant group-hover:text-on-surface group-hover:rotate-90 transition-all" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface">7ft Jr</span>
                      </motion.button>
                    </>
                  ) : (
                    <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Click any table to start a manual countdown timer
                    </div>
                  )}
                </div>

                <div className="flex gap-3 md:gap-4 items-center w-full md:w-auto">
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-1.5 bg-secondary/5 border border-secondary/20 px-4 py-2 rounded-2xl"
                      >
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsEditing(!isEditing)}
                    className={`font-h1 text-xs md:text-sm px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-2xl transition-all uppercase tracking-[0.2em] border flex-1 md:flex-none ${isEditing ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-highest/80' : 'bg-white text-primary border-primary/40 hover:bg-primary hover:text-white shadow-sm'}`}
                  >
                    {isEditing ? 'Cancel Edit' : 'Edit Layout'}
                  </motion.button>

                  {isEditing && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        handleSaveLayout();
                        setIsEditing(false);
                      }}
                      disabled={isSavingLayout}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-h1 text-xs md:text-sm px-6 md:px-8 py-3 md:py-3.5 rounded-xl md:rounded-2xl transition-all shadow-sm uppercase tracking-[0.2em] flex-1 md:flex-none"
                    >
                      {isSavingLayout ? 'Saving...' : 'Save Blueprint'}
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Blueprint Canvas */}
              <div className="w-full md:flex-1 relative">
                <TableCanvas
                  tables={tables}
                  isAdmin={true}
                  isEditing={isEditing}
                  onLayoutChange={handleLayoutChange}
                  onToggleStatus={handleToggleStatus}
                  viewMode={canvasViewMode}
                />
              </div>
            </div>
          ) : (
            /* Traditional List View */
            <div className="glass-card rounded-[28px] md:rounded-[40px] border border-outline-variant/20 overflow-hidden flex-1 flex flex-col mb-4 md:mb-xl shimmer-border">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-outline-variant/10">
                    <tr className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                      <th className="px-6 md:px-10 py-8">Table Identity</th>
                      <th className="px-6 md:px-10 py-8">Dimensions</th>
                      <th className="px-6 md:px-10 py-8">Hourly Rate</th>
                      <th className="px-6 md:px-10 py-8">Status</th>
                      <th className="px-6 md:px-10 py-8 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {tables.filter(t => t.tableNumber.toString().includes(searchQuery)).map((table, idx) => (
                      <tr 
                        key={table.id || idx} 
                        style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}
                        className="table-row-hover group animate-fade-in"
                      >
                        <td className="px-6 md:px-10 py-8">
                          <div className="flex items-center gap-4 md:gap-5">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant border border-outline-variant/20 group-hover:border-primary/30 group-hover:text-primary transition-all icon-glow">
                              <Layout className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-h1 text-base md:text-lg text-on-surface uppercase tracking-tight">
                                {table.size === '9ft' ? 'The Sapphire Pro' : table.size === '8ft' ? 'Emerald Classic' : 'Midnight Onyx'}
                              </span>
                              <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                                ID: #TB-00{table.tableNumber} • {table.size === '9ft' ? 'Main Hall' : 'VIP Lounge'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-8">
                          <span className="text-on-surface font-medium text-sm">
                            {table.size}' {table.size === '9ft' ? 'Tournament Grade' : table.size === '8ft' ? 'Standard' : 'Compact'}
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-8">
                          <div className="flex items-baseline gap-1">
                            <span className="text-on-surface font-bold text-lg">INR {table.basePricePerHour}</span>
                            <span className="text-on-surface-variant/40 text-[10px] font-bold uppercase">/ hour</span>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-8">
                          <span className={`px-5 py-2 rounded-full text-[9px] font-black tracking-[0.15em] border flex items-center gap-2 w-fit uppercase ${table.status === 'active' ? 'bg-secondary/5 text-secondary border-secondary/20' :
                              (table.status === 'maintenance' || table.status === 'maintenance_scheduled') ? 'bg-error/5 text-error border-error/20' :
                                'bg-primary/5 text-primary border-primary/20'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${table.status === 'active' ? 'bg-secondary' : 'bg-error'}`} />
                            {table.status === 'active' ? 'Available' : table.status === 'maintenance_scheduled' ? 'Maint. Sched.' : table.status === 'maintenance' ? 'Maintenance' : 'Booked'}
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-8 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleToggleStatus(table)}
                              className={`p-3 rounded-xl transition-all ${
                                table.status !== 'active' 
                                  ? 'text-secondary bg-secondary/10 hover:bg-secondary/20' 
                                  : 'text-on-surface-variant hover:text-error hover:bg-error/10'
                              }`}
                              title={table.status !== 'active' ? 'Revert to Active' : 'Maintenance Options'}
                            >
                              <Wrench className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => { setEditingTable(table); setFormData(table); setShowModal(true); }}
                              className="p-3 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                            >
                              <Edit2 className="w-5 h-5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(table.id)}
                              className="p-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-outline-variant/10">
                {tables.filter(t => t.tableNumber.toString().includes(searchQuery)).map((table, idx) => (
                  <motion.div
                    key={table.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant border border-outline-variant/20">
                          <Layout className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-h1 text-sm text-on-surface uppercase">
                            {table.size === '9ft' ? 'Sapphire Pro' : table.size === '8ft' ? 'Emerald' : 'Onyx'}
                          </p>
                          <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">#TB-00{table.tableNumber}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-[0.15em] border uppercase ${
                        table.status === 'active' ? 'bg-secondary/5 text-secondary border-secondary/20' :
                        table.status === 'maintenance' ? 'bg-error/5 text-error border-error/20' :
                        'bg-primary/5 text-primary border-primary/20'
                      }`}>
                        {table.status === 'active' ? 'Available' : table.status === 'maintenance' ? 'Maint.' : 'Booked'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span>{table.size}' • INR {table.basePricePerHour}/h</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleStatus(table)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><Wrench className="w-4 h-4" /></button>
                        <button onClick={() => { setEditingTable(table); setFormData(table); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(table.id)} className="p-1.5 rounded-lg hover:bg-error/10 text-error/60 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-auto border-t border-outline-variant/10 p-4 md:p-8 flex justify-between items-center">
                <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                  Showing {tables.length} of {tables.length} tables
                </p>
                <div className="flex gap-2">
                  <button className="p-2 border border-outline-variant/20 rounded-lg text-on-surface-variant/40 cursor-not-allowed">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button className="p-2 border border-outline-variant/20 rounded-lg text-on-surface-variant hover:border-primary hover:text-primary transition-all btn-press">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Add/Edit Slide-Over Drawer */}
        <AnimatePresence>
          {showModal && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full md:w-[440px] z-50 bg-surface-container border-l border-outline-variant/20 shadow-2xl flex flex-col"
              >
                <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
                
                <div className="p-6 md:p-8 flex-shrink-0 flex items-center justify-between border-b border-outline-variant/10">
                  <h3 className="font-h1 text-2xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                    <Settings className="w-6 h-6 text-primary" />
                    {editingTable ? 'Table Config' : 'New Station'}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-highest rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                  <form id="table-form" onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Table Number</label>
                      <input
                        required
                        value={formData.tableNumber}
                        onChange={e => setFormData({ ...formData, tableNumber: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none font-h1 focus:shadow-[0_0_12px_rgba(6,36,255,0.15)] transition-all"
                        placeholder="e.g. 05"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Station Dimensions</label>
                      <select
                        value={formData.size}
                        onChange={e => setFormData({ ...formData, size: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none appearance-none font-h1 focus:shadow-[0_0_12px_rgba(6,36,255,0.15)] transition-all"
                      >
                        <option value="7ft" className="bg-[#1a1a1a] text-on-surface">7ft Compact</option>
                        <option value="8ft" className="bg-[#1a1a1a] text-on-surface">8ft Standard</option>
                        <option value="9ft" className="bg-[#1a1a1a] text-on-surface">9ft Tournament</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Hourly Rate (INR)</label>
                      <input
                        type="number"
                        value={formData.basePricePerHour}
                        onChange={(e) => setFormData({ ...formData, basePricePerHour: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none font-h1 focus:shadow-[0_0_12px_rgba(6,36,255,0.15)] transition-all"
                        placeholder="e.g. 100"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Felt Color</label>
                      <select
                        value={formData.color || 'green'}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none appearance-none font-h1 focus:shadow-[0_0_12px_rgba(6,36,255,0.15)] transition-all"
                      >
                        <option value="green" className="bg-[#1a1a1a] text-on-surface">Classic Green</option>
                        <option value="blue" className="bg-[#1a1a1a] text-on-surface">Tournament Blue</option>
                        <option value="burgundy" className="bg-[#1a1a1a] text-on-surface">Burgundy Red</option>
                        <option value="black" className="bg-[#1a1a1a] text-on-surface">Charcoal Black</option>
                        <option value="camel" className="bg-[#1a1a1a] text-on-surface">Camel Gold</option>
                      </select>
                    </div>
                  </form>
                </div>
                
                <div className="p-6 md:p-8 border-t border-outline-variant/10 bg-surface-container-lowest">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit" 
                    form="table-form"
                    className="w-full bg-primary text-on-surface font-h1 text-base md:text-lg py-4 rounded-2xl hover:brightness-110 transition-all neon-shadow-purple uppercase tracking-widest"
                  >
                    {editingTable ? 'Confirm Changes' : 'Initialize Station'}
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
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] z-50 bg-surface-container border border-outline-variant/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
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

                <div className="space-y-4">
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
      </div>
    </div>
  );
};

export default TableManagement;
