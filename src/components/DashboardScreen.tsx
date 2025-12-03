import { useState, useEffect } from 'react';
import { Users, Lock, Unlock, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface Table {
  id: string;
  name: string;
  type: 'round' | 'square' | 'rectangle';
  occupied: boolean;
  reserved?: boolean;
  position: { x: number; y: number };
  guests?: number;
  currentBill?: number;
  zIndex?: number; // Masaların üst üste binme sırası
}

interface Order {
  id: string;
  tableNumber: number;
  items: string;
  status: 'preparing' | 'served';
  time: string;
  timestamp: number;
  isTransfer?: boolean;
  transferFrom?: number;
  orderItems?: { id: string; name: string; price: number; isPaid: boolean }[];
}

interface DashboardScreenProps {
  tables: Table[];
  setTables: (tables: Table[]) => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  onTableClick: (tableId: string) => void;
}

export function DashboardScreen({ tables, setTables, orders, setOrders, onTableClick }: DashboardScreenProps) {
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLocked, setIsLocked] = useState(true); // Kilit durumu (true = kilitli, masalar taşınamaz)
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableType, setNewTableType] = useState<'round' | 'square' | 'rectangle'>('round');

  // Masa boyutlarını tipine göre döndür
  const getTableSize = (type: 'round' | 'square' | 'rectangle') => {
    switch (type) {
      case 'round':
        return { width: 80, height: 80 };
      case 'square':
        return { width: 80, height: 80 };
      case 'rectangle':
        return { width: 120, height: 80 };
      default:
        return { width: 80, height: 80 };
    }
  };

  const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
    if (isLocked) return; // Kilitliyken taşıma yapılamaz
    
    e.preventDefault();
    setDraggedTable(tableId);
    
    // Tıklanan masayı en üste getir
    const maxZIndex = Math.max(...tables.map(t => t.zIndex || 0), 0);
    setTables(tables.map(t => 
      t.id === tableId ? { ...t, zIndex: maxZIndex + 1 } : t
    ));
    
    // Masanın sol üst köşesinden mouse'a olan offset'i hesapla
    const table = tables.find(t => t.id === tableId);
    if (table) {
      const container = document.getElementById('floor-map-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - table.position.x;
        const offsetY = e.clientY - rect.top - table.position.y;
        setDragOffset({ x: offsetX, y: offsetY });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedTable || isLocked) return;
    
    const container = document.getElementById('floor-map-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const draggedTableObj = tables.find(t => t.id === draggedTable);
      if (!draggedTableObj) return;
      
      const tableSize = getTableSize(draggedTableObj.type);
      
      // Mouse pozisyonunu container koordinatlarına çevir ve offset'i çıkar
      let x = e.clientX - rect.left - dragOffset.x;
      let y = e.clientY - rect.top - dragOffset.y;
      
      // STRICT BOUNDARY CONSTRAINTS - Masalar KEsinLİKLE container dışına çıkamaz
      // Container'ın iç alanını hesapla (padding dahil)
      const minX = 0;
      const minY = 0;
      const maxX = rect.width - tableSize.width;
      const maxY = rect.height - tableSize.height;
      
      // Clamp position within strict bounds - no table can escape the container
      x = Math.max(minX, Math.min(x, maxX));
      y = Math.max(minY, Math.min(y, maxY));
      
      setTables(tables.map(t => 
        t.id === draggedTable ? { ...t, position: { x, y } } : t
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggedTable(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Global mouse event listeners ekle
  useEffect(() => {
    if (draggedTable && !isLocked) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedTable, isLocked, dragOffset, tables]);

  const handleTableClick = (tableId: string, e: React.MouseEvent) => {
    // Eğer kilit açıksa ve düzenleme modundaysa, tıklamayı engelle
    if (!isLocked) {
      e.stopPropagation();
      return;
    }
    // Sol tıklama ile sipariş ekranına git
    onTableClick(tableId);
  };

  const handleContextMenu = (table: Table, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Kilit açıksa sağ tık menüsünü devre dışı bırak
    if (!isLocked) return;
    
    // Masada hesap varsa (currentBill > 0) sağ tıklamayı engelle
    if (table.currentBill && table.currentBill > 0) {
      return;
    }
    
    // Boş masa → Rezerve yap
    // Rezerve masa → Boş yap
    setTables(tables.map(t => {
      if (t.id === table.id) {
        if (t.reserved) {
          // Rezerve → Boş
          return { ...t, occupied: false, reserved: false };
        } else if (!t.occupied) {
          // Boş → Rezerve
          return { ...t, occupied: true, reserved: true };
        }
      }
      return t;
    }));
  };

  const startEditingTableName = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTableId(table.id);
    setEditingName(table.name);
  };

  const saveTableName = (tableId: string) => {
    if (editingName.trim()) {
      setTables(tables.map(t => t.id === tableId ? { ...t, name: editingName.trim() } : t));
    }
    setEditingTableId(null);
    setEditingName('');
  };

  const cancelEditingTableName = () => {
    setEditingTableId(null);
    setEditingName('');
  };

  const deleteTable = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const table = tables.find(t => t.id === tableId);
    
    // Masada hesap varsa veya rezerveyse silmeyi engelle
    if (table?.currentBill || table?.occupied) {
      return;
    }
    
    setTables(tables.filter(t => t.id !== tableId));
  };

  const addNewTable = () => {
    if (!newTableName.trim()) return;
    
    // Container boyutunu al
    const container = document.getElementById('floor-map-container');
    let initialX = 400;
    let initialY = 300;
    
    if (container) {
      const rect = container.getBoundingClientRect();
      const tableSize = getTableSize(newTableType);
      
      // Merkez pozisyonu hesapla, ancak sınırlar içinde kal
      const centerX = (rect.width - tableSize.width) / 2;
      const centerY = (rect.height - tableSize.height) / 2;
      
      // STRICT BOUNDARY CHECK - Yeni masa container sınırları içinde olmalı
      const maxX = rect.width - tableSize.width;
      const maxY = rect.height - tableSize.height;
      
      initialX = Math.max(0, Math.min(centerX, maxX));
      initialY = Math.max(0, Math.min(centerY, maxY));
    }
    
    const maxZIndex = Math.max(...tables.map(t => t.zIndex || 0), 0);
    
    const newTable: Table = {
      id: `table-${Date.now()}`,
      name: newTableName.trim(),
      type: newTableType,
      occupied: false,
      position: { x: initialX, y: initialY },
      zIndex: maxZIndex + 1 // Yeni masa en üstte
    };
    
    setTables([...tables, newTable]);
    setShowAddModal(false);
    setNewTableName('');
    setNewTableType('round');
  };

  const toggleOrderStatus = (orderId: string) => {
    setOrders(orders.map(o => 
      o.id === orderId 
        ? { ...o, status: o.status === 'preparing' ? 'served' : 'preparing' }
        : o
    ));
  };

  const occupiedCount = tables.filter(t => t.occupied && !t.reserved).length;
  const reservedCount = tables.filter(t => t.reserved && !t.currentBill).length;
  const emptyCount = tables.filter(t => !t.occupied && !t.reserved).length;
  
  // Sort orders: preparing first (by timestamp desc), then served
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.status === b.status) {
      return b.timestamp - a.timestamp; // Newest first
    }
    return a.status === 'preparing' ? -1 : 1;
  });

  return (
    <div className="h-full flex gap-6 p-6 bg-[#121212]">
      {/* Floor Plan Area - 75% */}
      <div className="w-3/4 bg-[#1E1E1E] rounded-xl p-6 flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl tracking-wide text-white">SALON HARİTASI</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {isLocked ? 'Masaları sürükleyerek düzenleyin' : 'Düzenleme Modu Açık'}
            </p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Masa Ekle Butonu */}
            {!isLocked && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#00E676] text-[#121212] px-5 py-2.5 rounded-lg font-bold hover:bg-[#00E676]/90 transition-all shadow-lg shadow-[#00E676]/30"
              >
                <Plus className="w-4 h-4" />
                Masa Ekle
              </button>
            )}
            
            {/* Kilit Butonu */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg ${
                isLocked
                  ? 'bg-[#FF9100] text-[#121212] hover:bg-[#FF9100]/90 shadow-[#FF9100]/30'
                  : 'bg-[#00E676] text-[#121212] hover:bg-[#00E676]/90 shadow-[#00E676]/30'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  Konumlar Kilitli
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Düzenleme Modu
                </>
              )}
            </button>
            
            <div className="bg-[#121212] px-5 py-3 rounded-lg border-2 border-[#00E676]/40">
              <span className="text-neutral-400 text-sm">Boş: </span>
              <span className="text-[#00E676] font-bold text-lg">{emptyCount}</span>
            </div>
            <div className="bg-[#121212] px-5 py-3 rounded-lg border-2 border-[#FF9100]/40">
              <span className="text-neutral-400 text-sm">Rezerve: </span>
              <span className="text-[#FF9100] font-bold text-lg">{reservedCount}</span>
            </div>
            <div className="bg-[#121212] px-5 py-3 rounded-lg border-2 border-[#FF1744]/40">
              <span className="text-neutral-400 text-sm">Dolu: </span>
              <span className="text-[#FF1744] font-bold text-lg">{occupiedCount}</span>
            </div>
          </div>
        </div>

        {/* Floor Map */}
        <div 
          id="floor-map-container"
          className="bg-[#121212] rounded-xl overflow-hidden p-10"
          style={{
            position: 'relative',
            display: 'block',
            width: '100%',
            height: '600px',
            backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        >
          {/* Top Row: Bar Area | Bar Counter | Entrance */}
          <div className="absolute top-10 left-10 right-10 flex items-center justify-between pointer-events-none z-0">
            {/* Bar Area - Sol taraf dikey */}
            <div className="absolute left-0 top-0 w-24 bg-[#1E1E1E] border-2 border-[#00E676]/50 rounded-lg flex items-center justify-center shadow-lg shadow-[#00E676]/20" 
                 style={{ height: '480px' }}>
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-[#00E676] font-bold tracking-wider text-lg rotate-0" style={{ writingMode: 'vertical-rl' }}>BAR ALANI</span>
              </div>
            </div>
            
            {/* GİRİŞ - Sağ üst köşe */}
            <div className="absolute right-0 top-0 bg-[#1E1E1E] px-8 py-3 rounded-lg border-2 border-[#FF9100]/50 shadow-lg shadow-[#FF9100]/20">
              <span className="text-[#FF9100] font-bold tracking-widest">GİRİŞ</span>
            </div>
          </div>

          {/* Tables */}
          {tables.map((table) => (
            <div
              key={table.id}
              onMouseDown={(e) => !isLocked && handleMouseDown(e, table.id)}
              onClick={(e) => handleTableClick(table.id, e)}
              onContextMenu={(e) => handleContextMenu(table, e)}
              style={{
                position: 'absolute',
                left: `${table.position.x}px`,
                top: `${table.position.y}px`,
                width: `${getTableSize(table.type).width}px`,
                height: `${getTableSize(table.type).height}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                zIndex: table.zIndex || 10
              }}
              className={`${isLocked ? 'cursor-pointer' : 'cursor-move'} ${
                table.type === 'round' ? 'rounded-full' : 'rounded-xl'
              } ${
                table.reserved && !table.currentBill
                  ? 'bg-[#1E1E1E] border-[3px] border-[#FF9100] shadow-[0_0_25px_rgba(255,145,0,0.5)]'
                  : table.occupied
                  ? 'bg-[#1E1E1E] border-[3px] border-[#FF1744] shadow-[0_0_25px_rgba(255,23,68,0.5)]'
                  : 'bg-[#1E1E1E] border-[3px] border-[#00E676] shadow-[0_0_25px_rgba(0,230,118,0.4)]'
              } transition-all hover:scale-105 select-none`}
            >
              {/* Düzenleme Butonları - Sadece kilit açıkken görünür */}
              {!isLocked && !table.currentBill && !table.occupied && (
                <div className="absolute -top-2 -right-2 flex gap-1 z-20">
                  <button
                    onClick={(e) => deleteTable(table.id, e)}
                    className="bg-[#FF1744] hover:bg-[#FF1744]/90 text-white p-1 rounded-full shadow-lg pointer-events-auto"
                    title="Masayı Sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {!isLocked && (
                <div className="absolute -top-2 -left-2 z-20">
                  <button
                    onClick={(e) => startEditingTableName(table, e)}
                    className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] p-1 rounded-full shadow-lg pointer-events-auto"
                    title="İsmi Değiştir"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {editingTableId === table.id ? (
                <div className="flex flex-col items-center gap-1 pointer-events-auto">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') saveTableName(table.id);
                      if (e.key === 'Escape') cancelEditingTableName();
                    }}
                    autoFocus
                    className="w-16 bg-[#121212] text-white font-bold text-center text-xs px-1 py-0.5 rounded border border-[#00E676] outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); saveTableName(table.id); }}
                      className="bg-[#00E676] text-[#121212] p-0.5 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelEditingTableName(); }}
                      className="bg-[#FF1744] text-white p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-bold text-white tracking-wider text-sm">{table.name}</span>
                  {table.occupied && table.currentBill ? (
                    <span className="text-[#FFD600] font-bold text-xs mt-1">₺{table.currentBill}</span>
                  ) : table.reserved ? (
                    <span className="text-[#FF9100] text-[10px] mt-0.5 font-bold">REZERVE</span>
                  ) : (
                    <span className="text-neutral-500 text-[10px] mt-0.5">Boş</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order Feed Sidebar - 25% */}
      <div className="w-1/4 bg-[#1E1E1E] rounded-xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#2C2C2C]">
          <h2 className="font-bold text-xl tracking-widest text-white">SİPARİŞ AKIŞI</h2>
          <p className="text-xs text-neutral-500 mt-1">Bekleyen Siparişler</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedOrders.map((order, index) => {
            const isCompleted = order.status === 'served';
            const isNewest = index === 0 && !isCompleted;
            const isTransfer = order.isTransfer;
            
            return (
              <div
                key={order.id}
                className={`bg-[#2C2C2C] rounded-lg p-4 border transition-all ${
                  isCompleted 
                    ? 'opacity-50 border-[#00E676]/20' 
                    : isTransfer
                    ? 'border-[#9C27B0] shadow-lg shadow-[#9C27B0]/20 bg-[#9C27B0]/10'
                    : isNewest
                    ? 'border-[#FFD600] shadow-lg shadow-[#FFD600]/20'
                    : 'border-[#333333]'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {isTransfer ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-[#9C27B0] text-white px-2 py-0.5 rounded font-bold">TRANSFER</span>
                        </div>
                        <h3 className="font-bold text-white">
                          Masa {order.transferFrom} → Masa {order.tableNumber}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{order.time}</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-bold text-white">Masa {order.tableNumber}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">{order.time}</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => toggleOrderStatus(order.id)}
                    className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wide transition-all ${
                      order.status === 'preparing'
                        ? 'bg-[#FFD600] text-[#121212] hover:bg-[#FFD600]/90 shadow-lg shadow-[#FFD600]/30'
                        : 'bg-[#00E676] text-[#121212] hover:bg-[#00E676]/90 shadow-lg shadow-[#00E676]/30'
                    }`}
                  >
                    {order.status === 'preparing' ? 'HAZIRLANIYOR' : 'GÖNDERİLDİ'}
                  </button>
                </div>
                <p className="text-sm text-neutral-300 font-medium">{order.items}</p>
                {isTransfer && (
                  <p className="text-xs text-[#9C27B0] mt-2 font-bold">
                    ↗ {order.orderItems.length} ürün aktarıldı
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-[#2C2C2C] bg-[#121212]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Aktif Siparişler:</span>
            <span className="text-[#FFD600] font-bold">
              {orders.filter(o => o.status === 'preparing').length}
            </span>
          </div>
        </div>
      </div>

      {/* Masa Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#1E1E1E] rounded-xl p-8 max-w-md w-full border-2 border-[#00E676]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-6">Yeni Masa Ekle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-neutral-400 text-sm mb-2">Masa Adı</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addNewTable()}
                  placeholder="örn: M-25"
                  className="w-full bg-[#121212] text-white px-4 py-3 rounded-lg border-2 border-[#2C2C2C] focus:border-[#00E676] outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-400 text-sm mb-2">Masa Tipi</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['round', 'square', 'rectangle'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewTableType(type)}
                      className={`px-4 py-3 rounded-lg font-bold text-xs transition-all ${
                        newTableType === type
                          ? 'bg-[#00E676] text-[#121212] shadow-lg shadow-[#00E676]/30'
                          : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
                      }`}
                    >
                      {type === 'round' && 'Yuvarlak'}
                      {type === 'square' && 'Kare'}
                      {type === 'rectangle' && 'Dikdörtgen'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addNewTable}
                  disabled={!newTableName.trim()}
                  className="flex-1 bg-[#00E676] text-[#121212] px-6 py-3 rounded-lg font-bold hover:bg-[#00E676]/90 transition-all shadow-lg shadow-[#00E676]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Masa Ekle
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewTableName('');
                    setNewTableType('round');
                  }}
                  className="flex-1 bg-[#2C2C2C] text-neutral-300 px-6 py-3 rounded-lg font-bold hover:bg-[#333333] transition-all"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}