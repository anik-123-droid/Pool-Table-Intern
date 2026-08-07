import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Sidebar from '../../components/Sidebar';
import { Menu, Plus, Trash2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

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

const VirtualRoom = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [extraItems, setExtraItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [draggingItemId, setDraggingItemId] = useState(null);
  const canvasRef = useRef(null);
  
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startItemX: 0,
    startItemY: 0,
  });
  
  const extraItemsRef = useRef(extraItems);
  useEffect(() => { extraItemsRef.current = extraItems; }, [extraItems]);
  const tablesRef = useRef(tables);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  useEffect(() => {
    fetchTables();
    const saved = localStorage.getItem('virtual_room_items');
    if (saved) {
      setExtraItems(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('virtual_room_items', JSON.stringify(extraItems));
  }, [extraItems]);

  const fetchTables = async () => {
    try {
      const { data } = await api.get('/tables');
      setTables(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePointerDown = (e, item, isTable = false) => {
    if (e.target.closest('.utility-btn')) return;

    if (!isTable) {
      setSelectedItemId(item.id);
      setDraggingItemId(item.id);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startItemX: item.positionX || 0,
        startItemY: item.positionY || 0,
      };
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!draggingItemId || !canvasRef.current) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const percentageDx = (dx / canvasRect.width) * 100;
      const percentageDy = (dy / canvasRect.height) * 100;

      let newX = dragRef.current.startItemX + percentageDx;
      let newY = dragRef.current.startItemY + percentageDy;

      const item = extraItems.find(i => i.id === draggingItemId);
      if (item) {
        const itemWidthPx = item.width || 120;
        const itemHeightPx = item.height || 60;
        
        const isRotated = ((item.rotation || 0) % 180 === 90 || (item.rotation || 0) % 180 === -90);
        const effectiveWidthPx = isRotated ? itemHeightPx : itemWidthPx;
        const effectiveHeightPx = isRotated ? itemWidthPx : itemHeightPx;

        const percentageWidth = (effectiveWidthPx / canvasRect.width) * 100;
        const percentageHeight = (effectiveHeightPx / canvasRect.height) * 100;

        const minX = 0;
        const maxX = 100 - percentageWidth;
        const minY = 0;
        const maxY = 100 - percentageHeight;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));
      } else {
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
      }

      setExtraItems(prev => prev.map(item => 
        item.id === draggingItemId ? { ...item, positionX: Number(newX.toFixed(2)), positionY: Number(newY.toFixed(2)) } : item
      ));
    };

    const handlePointerUp = async () => {
      if (draggingItemId) {
        setDraggingItemId(null);
      }
    };

    if (draggingItemId) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingItemId]);

  const handleAddItem = (type) => {
    const offset = (extraItems.length % 5) * 5; 
    const elementDef = VIRTUAL_ELEMENTS[type];
    const newItem = {
      id: Date.now(),
      type,
      positionX: 45 + offset,
      positionY: 45 + offset,
      rotation: 0,
      width: parseInt(elementDef.width),
      height: parseInt(elementDef.height)
    };
    setExtraItems([...extraItems, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleDeleteItem = () => {
    if (selectedItemId) {
      setExtraItems(extraItems.filter(i => i.id !== selectedItemId));
      setSelectedItemId(null);
    }
  };

  const handleRotateItem = () => {
    if (selectedItemId) {
      setExtraItems(extraItems.map(i => {
        if (i.id === selectedItemId) {
          return { ...i, rotation: (i.rotation + 90) % 360 };
        }
        return i;
      }));
    }
  };
  
  const getTableSizeStyle = (size) => {
    if (size === '9ft') return { width: '11%', aspectRatio: '2/1' };
    if (size === '8ft') return { width: '9.6%', aspectRatio: '2/1' };
    return { width: '8.3%', aspectRatio: '2/1' }; // 7ft
  };

  return (
    <div className="flex w-full min-h-screen bg-background text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 md:ml-[260px] flex flex-col min-w-0 transition-all duration-300">
        
        <header className="h-16 md:h-20 border-b border-outline-variant/10 bg-background/70 backdrop-blur-2xl flex items-center justify-between px-4 md:px-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 -ml-1.5 text-on-surface-variant hover:text-on-surface transition-colors btn-press">
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Virtual 2D Room Builder</p>
          </div>
        </header>

        <main className="flex-1 relative flex flex-col md:flex-row gap-4 p-4 md:p-xl">
          <div className="bg-surface-container rounded-3xl p-4 md:p-6 border border-outline-variant/30 flex-1">
            <div className="w-full relative rounded-3xl overflow-auto custom-scrollbar border border-outline-variant/50 shadow-inner bg-[#1a2d1e] h-[60vh] md:h-auto md:aspect-[16/9]">
              <div
                ref={canvasRef}
                className="relative min-w-[800px] w-full h-full aspect-[16/9] select-none"
                onClick={() => setSelectedItemId(null)}
              >

                  
                  {/* Render Tables (Interactive) */}
                  {tables.map((table) => {
                    const tableSize = getTableSizeStyle(table.size);
                    return (
                      <div
                        key={table.id}
                        className="absolute flex flex-col items-center justify-center transition-transform opacity-95 drop-shadow-2xl z-30"
                        style={{
                          left: `${table.positionX}%`,
                          top: `${table.positionY}%`,
                          ...tableSize,
                          transform: `translate(-50%, -50%) rotate(${table.rotation || 0}deg)`,
                          transformOrigin: 'center',
                          touchAction: 'none'
                        }}
                      >
                        <div className="relative w-full h-full rounded-lg overflow-hidden shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
                             style={{
                               backgroundImage: `url('/pool-table.jpg')`,
                               backgroundSize: '100% 100%',
                               backgroundPosition: 'center',
                               backgroundRepeat: 'no-repeat',
                               filter: table.color === 'blue' ? 'hue-rotate(90deg)' : table.color === 'burgundy' ? 'hue-rotate(220deg) saturate(1.2)' : table.color === 'black' ? 'grayscale(100%) brightness(0.6)' : table.color === 'camel' ? 'hue-rotate(-70deg) brightness(1.1) saturate(0.8)' : 'none'
                             }}>
                           
                           <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                             <span className="font-h1 text-sm md:text-lg font-black leading-none text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{table.tableNumber}</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Render Extra Architecture Elements */}
                  {extraItems.map((item) => {
                    const isSelected = selectedItemId === item.id;
                    const isDragging = draggingItemId === item.id;
                    const elementDef = VIRTUAL_ELEMENTS[item.type];
                    if (!elementDef) return null;

                    return (
                      <motion.div
                        key={item.id}
                        onPointerDown={(e) => handlePointerDown(e, item)}
                        onClick={(e) => { e.stopPropagation(); setSelectedItemId(item.id); }}
                        className={`absolute cursor-pointer flex items-center justify-center ${isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-[#2e4c34] shadow-2xl z-50' : 'z-40 shadow-xl'} ${isDragging ? 'opacity-85 scale-[1.03] z-50' : ''}`}
                        style={{
                          left: `${item.positionX}%`,
                          top: `${item.positionY}%`,
                          width: item.width ? `${item.width}px` : elementDef.width,
                          height: item.height ? `${item.height}px` : elementDef.height,
                          transform: `rotate(${item.rotation || 0}deg)`,
                          touchAction: 'none',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}
                      >
                        <img src={elementDef.src} alt={elementDef.label} className="w-full h-full object-contain pointer-events-none drop-shadow-md" />
                      </motion.div>
                    );
                  })}

                </div>
            </div>
          </div>

          <div className="w-full md:w-64 bg-surface-container border border-outline-variant/30 rounded-3xl p-4 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Add Elements</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
              <button onClick={() => handleAddItem('counter')} className="py-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Reception Counter
              </button>
              <button onClick={() => handleAddItem('gate')} className="py-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Entry Gate
              </button>
              <button onClick={() => handleAddItem('washroom')} className="py-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Washroom
              </button>
            </div>

            <AnimatePresence>
              {selectedItemId && (() => {
                const selectedData = extraItems.find(i => i.id === selectedItemId);
                if (!selectedData) return null;
                const def = VIRTUAL_ELEMENTS[selectedData.type];
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-outline-variant/20 pt-4 mt-2 space-y-3 overflow-hidden"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Selected Item</h3>
                    <p className="text-[10px] text-on-surface-variant opacity-70 mb-2">
                      Drag the item on the floor to move it.
                    </p>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-on-surface-variant font-bold mb-1 block">Width</label>
                        <input 
                          type="number" 
                          className="w-full bg-surface-container rounded-lg px-2 py-1.5 text-xs border border-outline-variant/20 focus:border-primary outline-none text-on-surface"
                          value={selectedData.width || parseInt(def.width)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtraItems(extraItems.map(i => i.id === selectedItemId ? { ...i, width: val } : i));
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-on-surface-variant font-bold mb-1 block">Height</label>
                        <input 
                          type="number" 
                          className="w-full bg-surface-container rounded-lg px-2 py-1.5 text-xs border border-outline-variant/20 focus:border-primary outline-none text-on-surface"
                          value={selectedData.height || parseInt(def.height)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExtraItems(extraItems.map(i => i.id === selectedItemId ? { ...i, height: val } : i));
                          }}
                        />
                      </div>
                    </div>
                    
                    <button onClick={handleRotateItem} className="w-full py-3 bg-secondary/10 text-secondary rounded-xl text-xs font-bold hover:bg-secondary/20 transition-colors flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Rotate 90°
                    </button>

                    <button onClick={handleDeleteItem} className="w-full py-3 bg-error/10 text-error rounded-xl text-xs font-bold hover:bg-error/20 transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Delete Item
                    </button>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

        </main>
      </div>
    </div>
  );
};

export default VirtualRoom;
