import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { RotateCw, AlertTriangle, Plus, Trash2, Check, Settings, Palette, IndianRupee } from 'lucide-react';
import { playHoverSound } from '../utils/audio';
import api from '../utils/api';

const VIRTUAL_ELEMENTS = {
  counter: {
    src: '/assets/counter_transparent.png',
    width: '15%',
    height: '6.7%',
    label: 'Counter'
  },
  gate: {
    src: '/assets/gate_transparent.png',
    width: '10%',
    height: '5.5%',
    label: 'Entry Gate'
  },
  washroom: {
    src: '/assets/washroom_transparent.png',
    width: '6.7%',
    height: '8.8%',
    label: 'Washroom'
  }
};

const TableCanvas = ({ tables, onTableSelect, isAdmin = false, isEditing = false, onLayoutChange, onToggleStatus, onEditPrice, viewMode = 'standard' }) => {
  const canvasRef = useRef(null);
  const [localTables, setLocalTables] = useState(tables);
  const localTablesRef = useRef(localTables);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  useEffect(() => {
    localTablesRef.current = localTables;
  }, [localTables]);

  const [selectedTableId, setSelectedTableId] = useState(null);
  const [draggingTableId, setDraggingTableId] = useState(null);

  const [extraItems, setExtraItems] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('virtual_room_items');
    if (saved && JSON.parse(saved).length > 0) {
      setExtraItems(JSON.parse(saved));
    } else {
      setExtraItems([
        { id: 'default-counter', type: 'counter', positionX: 15, positionY: 15, rotation: 0 },
        { id: 'default-gate', type: 'gate', positionX: 50, positionY: 85, rotation: 0 },
        { id: 'default-washroom', type: 'washroom', positionX: 85, positionY: 15, rotation: 0 }
      ]);
    }
  }, []);

  // Keep track of drag starting variables in mutable ref to prevent React stale state issues during fast movement
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startTableX: 0,
    startTableY: 0,
    currentX: undefined,
    currentY: undefined
  });

  const tableNodeRefs = useRef({});

  const handleTableClick = (e, table) => {
    if (e.target.closest('.utility-btn')) return;

    if (!isAdmin) {
      if (table.status !== 'maintenance' && table.status !== 'maintenance_scheduled' && table.status !== 'occupied') {
        if (onTableSelect) onTableSelect(table);
      }
    }
  };

  const handlePointerDown = (e, table) => {
    if (!isAdmin || !isEditing) return;
    if (e.target.closest('.utility-btn')) return;

    setSelectedTableId(table.id);
    setDraggingTableId(table.id);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTableX: table.positionX || 0,
      startTableY: table.positionY || 0,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!draggingTableId || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const percentageDx = (dx / canvasRect.width) * 100;
      const percentageDy = (dy / canvasRect.height) * 100;

      let newX = dragRef.current.startTableX + percentageDx;
      let newY = dragRef.current.startTableY + percentageDy;

      const table = localTablesRef.current.find(t => t.id === draggingTableId);
      if (table) {
        let widthStr = '11', heightStr = '5.5';
        if (table.size === '8ft') { widthStr = '9.6'; heightStr = '4.8'; }
        else if (table.size === '7ft') { widthStr = '8.3'; heightStr = '4.15'; }
        
        let tW = parseFloat(widthStr);
        let tH = parseFloat(heightStr);
        
        const isRotated = ((table.rotation || 0) % 180 === 90 || (table.rotation || 0) % 180 === -90);
        if (isRotated) {
          const temp = tW;
          tW = tH;
          tH = temp;
        }

        const minX = tW / 2;
        const maxX = 100 - (tW / 2);
        const minY = tH / 2;
        const maxY = 100 - (tH / 2);

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      } else {
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
      }

      const updated = localTablesRef.current.map(t => 
        t.id === draggingTableId ? { ...t, positionX: Number(newX.toFixed(2)), positionY: Number(newY.toFixed(2)) } : t
      );
      setLocalTables(updated);
    };

    const handlePointerUp = () => {
      if (draggingTableId) {
        setDraggingTableId(null);
        onLayoutChange(localTablesRef.current);
      }
    };

    if (draggingTableId) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingTableId, onLayoutChange]);



  const handleRotate = async (e, table) => {
    e.stopPropagation();
    const updatedRotation = ((table.rotation || 0) + 90) % 360;
    const updated = localTables.map((t) => {
      if (t.id === table.id) {
        return { ...t, rotation: updatedRotation };
      }
      return t;
    });
    setLocalTables(updated);
    onLayoutChange(updated);
    if (isAdmin) {
      try {
        await api.put(`/tables/${table.id}`, { rotation: updatedRotation });
      } catch (err) {
        console.error('Failed to auto-save rotation', err);
      }
    }
  };

  const handleCycleColor = async (e, table) => {
    e.stopPropagation();
    const colors = ['green', 'blue', 'burgundy', 'black', 'camel'];
    const currentIndex = colors.indexOf(table.color || 'green');
    const nextColor = colors[(currentIndex + 1) % colors.length];
    
    const updated = localTables.map((t) => {
      if (t.id === table.id) {
        return { ...t, color: nextColor };
      }
      return t;
    });
    setLocalTables(updated);
    onLayoutChange(updated);
    if (isAdmin) {
      try {
        await api.put(`/tables/${table.id}`, { color: nextColor });
      } catch (err) {
        console.error('Failed to auto-save color', err);
      }
    }
  };

  const handleDeleteTable = (e, table) => {
    e.stopPropagation();
    if (window.confirm(`Delete Table ${table.tableNumber}?`)) {
      const updated = localTables.filter((t) => t.id !== table.id);
      setLocalTables(updated);
      onLayoutChange(updated, { type: 'delete', id: table.id });
    }
  };

  const getTableSizeStyle = (size, viewMode) => {
    if (viewMode === 'pro') return { width: '40px', height: '40px' };
    if (size === '9ft') return { width: '11%', aspectRatio: '2/1' };
    if (size === '8ft') return { width: '9.6%', aspectRatio: '2/1' };
    return { width: '8.3%', aspectRatio: '2/1' }; // 7ft
  };

  const getColorFilter = (color) => {
    switch (color) {
      case 'blue': return 'hue-rotate(90deg)';
      case 'burgundy': return 'hue-rotate(220deg) saturate(1.2)';
      case 'black': return 'grayscale(100%) brightness(0.6)';
      case 'camel': return 'hue-rotate(-70deg) brightness(1.1) saturate(0.8)';
      case 'green':
      default: return 'none';
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full h-full relative group">
      {/* Dynamic Viewport Canvas Container */}
      <div className="w-full relative overflow-auto custom-scrollbar bg-[#122216] rounded-3xl border border-outline-variant/50 shadow-2xl h-[60vh] md:h-auto md:aspect-[16/9]">


        <div
          ref={canvasRef}
          className="relative min-w-[800px] w-full h-full aspect-[16/9] select-none"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelectedTableId(null);
          }}
        >
        {/* Render Tables */}
        {localTables.map((table) => {
          const isSelected = selectedTableId === table.id;
          const tableSize = getTableSizeStyle(table.size, viewMode);
          
          // Normalize rotation to either 0 or 90 to prevent upside-down 3D shadows
          const effectiveRotation = ((table.rotation || 0) % 180 === 90 || (table.rotation || 0) % 180 === -90) ? 90 : 0;

          let statusColor = 'rgba(47,248,1,0.8)'; // Active green
          let shadowGlow = 'rgba(47,248,1,0.2)';
          if (table.status === 'maintenance') {
            statusColor = 'rgba(255,193,7,0.8)'; // Warning yellow
            shadowGlow = 'rgba(255,193,7,0.2)';
          } else if (table.status === 'maintenance_scheduled') {
            statusColor = 'rgba(255,153,0,0.8)'; // Warning orange
            shadowGlow = 'rgba(255,153,0,0.2)';
          } else if (table.status === 'occupied') {
            statusColor = 'rgba(255,60,60,0.8)'; // Occupied red
            shadowGlow = 'rgba(255,60,60,0.2)';
          }

          let borderClass = 'shadow-[0_0_15px_rgba(47,248,1,0.15)]';
          if (timers[table.id] !== undefined && timers[table.id] <= 10) {
            borderClass = 'shadow-[0_0_30px_rgba(255,0,0,1)] animate-pulse ring-4 ring-red-600 ring-offset-2 ring-offset-black';
            shadowGlow = 'rgba(255,0,0,1)';
            statusColor = 'rgba(255,0,0,1)';
          } else if (viewMode === 'standard') {
            if (table.status === 'maintenance' || table.status === 'maintenance_scheduled') {
              borderClass = 'opacity-60 grayscale';
            } else if (table.status === 'occupied') {
              borderClass = 'shadow-[0_0_15px_rgba(255,110,99,0.3)]';
            }
          }

          return (
            <motion.div
              key={table.id}
              ref={(el) => tableNodeRefs.current[table.id] = el}
              onClick={(e) => handleTableClick(e, table)}
              onPointerDown={(e) => handlePointerDown(e, table)}
              initial={{ y: -30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, rotateZ: effectiveRotation, rotateX: 0, rotateY: 0, scale: 1, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.4, type: 'spring' }}
              whileHover={{ 
                scale: 1.05, 
                zIndex: 60,
                boxShadow: isSelected ? undefined : (viewMode === 'pro' ? `0px 0px 20px ${shadowGlow}` : '0px 30px 40px rgba(0, 0, 0, 0.6)')
              }}
              onMouseEnter={() => playHoverSound()}
              className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${viewMode === 'standard' ? borderClass : ''} ${
                isSelected && isAdmin ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#2e4c34] shadow-[0_0_20px_rgba(0,163,255,0.4)] z-50' : 'opacity-95 drop-shadow-2xl z-30'
              } ${draggingTableId === table.id ? 'opacity-85 scale-[1.05] z-50 shadow-2xl' : ''}`}
              style={{
                left: `${table.positionX}%`,
                top: `${table.positionY}%`,
                ...tableSize,
                touchAction: 'none',
                borderRadius: viewMode === 'pro' ? '4px' : '12px',
                transformStyle: 'preserve-3d',
                transformOrigin: 'center',
                ...(viewMode === 'pro' && {
                  border: `2px solid ${statusColor}`,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  boxShadow: `0 0 15px ${shadowGlow}, inset 0 0 10px ${shadowGlow}`
                })
              }}
            >
              {viewMode === 'standard' ? (
                <>
                {/* Traditional 3D Mode Inner Render */}
                <div className="relative w-full h-full rounded-lg overflow-hidden shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                     style={{
                       backgroundImage: `url('/pool-table.jpg')`,
                       backgroundSize: '100% 100%',
                       backgroundPosition: 'center',
                       backgroundRepeat: 'no-repeat',
                       filter: getColorFilter(table.color)
                     }}>
                  
                  {/* Table Metadata */}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
                    style={{ transform: `rotate(-${effectiveRotation}deg)` }}
                  >
                    <span className="font-body text-sm md:text-xl font-black leading-none text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{table.tableNumber}</span>
                    <span className="text-[7.5px] md:text-[9px] font-black uppercase tracking-widest leading-none mt-1 opacity-90 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]">{table.size}</span>
                  </div>
                  
                </div>

                {/* Status Badges and Timer - Outside overflow-hidden div */}
                <div 
                  className="absolute flex flex-col items-center gap-1 z-40 pointer-events-none"
                  style={effectiveRotation === 90
                    ? { top: '50%', left: '-12px', transform: `translate(-50%, -50%) rotate(-90deg)`, transition: 'all 0.3s ease' }
                    : { top: '-12px', left: '50%', transform: `translate(-50%, -50%) rotate(0deg)`, transition: 'all 0.3s ease' }
                  }
                >
                  {isAdmin && timers[table.id] !== undefined && (
                    <div className={`text-white text-[9px] md:text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-widest leading-none border ${timers[table.id] <= 10 ? 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(255,0,0,1)] animate-pulse scale-110' : 'bg-primary border-primary/50 shadow-[0_0_10px_rgba(0,163,255,0.6)] animate-pulse-glow'}`}>
                      ⏱ {formatTime(timers[table.id])}
                    </div>
                  )}
                  {table.status === 'occupied' && (
                    <div className="bg-red-500/90 text-white text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-widest border border-red-400/50 mt-1">
                      Booked
                    </div>
                  )}
                  {table.status === 'maintenance' && (
                    <div className="bg-yellow-500/90 text-black text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-widest border border-yellow-400/50 mt-1">
                      Maint
                    </div>
                  )}
                </div>
                </>
              ) : (
                /* Pro Mode Inner Render */
                <div 
                  className="flex flex-col items-center justify-center w-full h-full relative"
                  style={{ transform: `rotate(-${effectiveRotation}deg)` }}
                >
                  <span className="font-body text-sm font-bold tracking-widest leading-none" style={{ color: statusColor, textShadow: `0 0 8px ${shadowGlow}` }}>
                    {table.tableNumber}
                  </span>
                  {isAdmin && timers[table.id] !== undefined && (
                    <span className={`font-body text-[10px] font-bold tracking-widest leading-none mt-1 ${timers[table.id] <= 10 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                      {formatTime(timers[table.id])}
                    </span>
                  )}
                  {/* Inner pulse ring if active/occupied */}
                  {table.status !== 'maintenance' && (
                    <div className="absolute inset-2 border border-white/10 rounded-sm pointer-events-none" />
                  )}
                  {/* Small corner markers */}
                  <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-white/30" />
                  <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-white/30" />
                  <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-white/30" />
                  <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-white/30" />
                </div>
              )}

              {/* Admin overlays for quick adjustments */}
              {isAdmin && isSelected && (
                <div 
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bg-surface-container border border-outline-variant/40 px-3 py-1.5 rounded-2xl flex gap-2 shadow-2xl z-50 backdrop-blur-xl transition-all"
                  style={(() => {
                    const isNearTop = (table.positionY || 0) < 22;
                    const isNearLeft = (table.positionX || 0) < 20;

                    if (effectiveRotation === 90) {
                      return isNearLeft
                        ? { top: '50%', left: 'calc(100% + 50px)', transform: `translate(-50%, -50%) rotate(-90deg)` }
                        : { top: '50%', left: '-60px', transform: `translate(-50%, -50%) rotate(-90deg)` };
                    }
                    return isNearTop
                      ? { top: 'calc(100% + 35px)', left: '50%', transform: `translate(-50%, -50%) rotate(0deg)` }
                      : { top: '-55px', left: '50%', transform: `translate(-50%, -50%) rotate(0deg)` };
                  })()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRotate(e, table); }}
                    className="utility-btn p-1.5 text-on-surface hover:text-primary transition-colors hover:bg-on-surface/5 rounded-lg"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCycleColor(e, table); }}
                    className="utility-btn p-1.5 text-on-surface hover:text-primary transition-colors hover:bg-on-surface/5 rounded-lg"
                    title="Change Color"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditPrice && onEditPrice(table); }}
                    className="utility-btn p-1.5 text-on-surface hover:text-primary transition-colors hover:bg-on-surface/5 rounded-lg flex items-center gap-1"
                    title="Set Hourly Price"
                  >
                    <IndianRupee className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleStatus && onToggleStatus(table); }}
                    className="utility-btn p-1.5 text-on-surface hover:text-secondary transition-colors hover:bg-on-surface/5 rounded-lg"
                    title="Toggle Maintenance"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTable(e, table); }}
                    className="utility-btn p-1.5 text-on-surface hover:text-error transition-colors hover:bg-on-surface/5 rounded-lg"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Render Extra Architecture Elements (Read-Only) */}
        {extraItems.map((item) => {
          const elementDef = VIRTUAL_ELEMENTS[item.type];
          if (!elementDef) return null;

          return (
            <motion.div
              key={item.id}
              className="absolute flex items-center justify-center z-40 shadow-xl"
              style={{
                left: `${item.positionX}%`,
                top: `${item.positionY}%`,
                width: item.width ? `${item.width}px` : elementDef.width,
                height: item.height ? `${item.height}px` : elementDef.height,
                transform: `rotate(${item.rotation || 0}deg)`,
                pointerEvents: 'none',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <img src={elementDef.src} alt={elementDef.label} className="w-full h-full object-contain drop-shadow-md" />
            </motion.div>
          );
        })}
        </div>
      </div>

      {/* Admin Quick Instructions */}
      {isAdmin && isEditing && (
        <p className="text-center text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest italic pt-2">
          💡 Click a table to show edit parameters. Move tables via Virtual Room.
        </p>
      )}
    </div>
  );
};

export default TableCanvas;
