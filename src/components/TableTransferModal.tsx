import { useState } from 'react';
import { X, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { Table, OrderItem } from '../App';

interface TableTransferModalProps {
  sourceTable: Table;
  sourceTableNumber: number;
  allTables: Table[];
  orderItems: OrderItem[];
  onClose: () => void;
  onTransfer: (targetTableId: string, selectedItemIds: string[]) => void;
}

export function TableTransferModal({
  sourceTable,
  sourceTableNumber,
  allTables,
  orderItems,
  onClose,
  onTransfer
}: TableTransferModalProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [targetTableId, setTargetTableId] = useState<string>('');

  // Filter out source table and get available tables
  const availableTables = allTables.filter(t => t.id !== sourceTable.id);

  // Toggle individual item selection
  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Select all items
  const selectAll = () => {
    setSelectedItemIds(new Set(orderItems.map(item => item.id)));
  };

  // Deselect all items
  const deselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Check if all items are selected
  const allSelected = orderItems.length > 0 && selectedItemIds.size === orderItems.length;

  // Get selected items for preview
  const selectedItems = orderItems.filter(item => selectedItemIds.has(item.id));
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);

  // Handle transfer
  const handleTransfer = () => {
    if (targetTableId && selectedItemIds.size > 0) {
      onTransfer(targetTableId, Array.from(selectedItemIds));
      onClose();
    }
  };

  const targetTable = allTables.find(t => t.id === targetTableId);
  const targetTableNumber = targetTable ? parseInt(targetTable.name.split('-')[1]) : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-8">
      <div className="bg-[#1E1E1E] rounded-lg border-2 border-[#333333] w-full max-w-5xl shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2C2C2C] bg-[#121212]">
          <div>
            <h2 className="font-bold text-2xl tracking-wider">MASA TRANSFER</h2>
            <p className="text-xs text-neutral-500 mt-1">Ürünleri başka masaya taşıyın</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 p-6 h-full">
            {/* LEFT COLUMN - Source Table */}
            <div className="flex flex-col bg-[#121212] rounded-lg border border-[#2C2C2C] overflow-hidden">
              {/* Source Header */}
              <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
                <h3 className="font-bold tracking-wide text-lg border-l-4 border-[#FF9100] pl-3">
                  KAYNAK MASA
                </h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-[#FF9100]">MASA {sourceTableNumber}</span>
                  <button
                    onClick={allSelected ? deselectAll : selectAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#2C2C2C] hover:bg-[#333333] rounded border border-[#444444] transition-all text-sm"
                  >
                    {allSelected ? (
                      <>
                        <CheckSquare className="w-4 h-4 text-[#00E676]" />
                        <span>Seçimi Kaldır</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-4 h-4" />
                        <span>Tümünü Seç</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4">
                {orderItems.length === 0 ? (
                  <div className="text-center text-neutral-600 mt-16">
                    <p className="text-sm">Bu masada ürün yok</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedItemIds.has(item.id)
                            ? 'bg-[#00E676]/10 border-[#00E676] shadow-lg shadow-[#00E676]/20'
                            : 'bg-[#2C2C2C] border-[#333333] hover:border-[#444444]'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="flex-shrink-0">
                          {selectedItemIds.has(item.id) ? (
                            <CheckSquare className="w-5 h-5 text-[#00E676]" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-500" />
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{item.name}</h4>
                          <p className="text-xs text-neutral-500">Ürün</p>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className={`font-bold ${
                            selectedItemIds.has(item.id) ? 'text-[#00E676]' : 'text-white'
                          }`}>
                            {item.price} TL
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Footer */}
              <div className="p-4 border-t border-[#2C2C2C] bg-[#1E1E1E]">
                <div className="flex items-baseline justify-between">
                  <span className="text-neutral-400 text-sm">Seçilen Ürün:</span>
                  <span className="font-bold text-lg">{selectedItemIds.size} adet</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Target Table */}
            <div className="flex flex-col bg-[#121212] rounded-lg border border-[#2C2C2C] overflow-hidden">
              {/* Target Header */}
              <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
                <h3 className="font-bold tracking-wide text-lg border-l-4 border-[#00E676] pl-3">
                  HEDEF MASA
                </h3>
                <p className="text-xs text-neutral-500 mt-2 ml-5">Ürünlerin taşınacağı masayı seçin</p>
              </div>

              {/* Table Selector */}
              <div className="p-4 border-b border-[#2C2C2C]">
                <label className="block text-sm text-neutral-400 mb-2">Masa Seçimi</label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full bg-[#2C2C2C] border-2 border-[#444444] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none transition-colors"
                >
                  <option value="">Masa seçiniz...</option>
                  {availableTables.map(table => {
                    const tableNum = parseInt(table.name.split('-')[1]);
                    return (
                      <option key={table.id} value={table.id}>
                        MASA {tableNum} {table.occupied ? '(Dolu)' : '(Boş)'}
                      </option>
                    );
                  })}
                </select>

                {/* Transfer Arrow */}
                {targetTableId && (
                  <div className="flex items-center justify-center gap-3 mt-4 p-3 bg-[#2C2C2C] rounded-lg border border-[#444444]">
                    <span className="font-bold text-[#FF9100]">M-{sourceTableNumber}</span>
                    <ArrowRight className="w-5 h-5 text-[#00E676] animate-pulse" />
                    <span className="font-bold text-[#00E676]">M-{targetTableNumber}</span>
                  </div>
                )}
              </div>

              {/* Items Preview */}
              <div className="flex-1 overflow-y-auto p-4">
                <h4 className="text-sm text-neutral-400 mb-3">AKTARILACAK ÜRÜNLER</h4>
                
                {selectedItems.length === 0 ? (
                  <div className="text-center text-neutral-600 mt-16">
                    <p className="text-sm">Ürün seçilmedi</p>
                    <p className="text-xs mt-2">Sol taraftan ürün seçin</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-[#00E676]/5 rounded-lg border border-[#00E676]/30"
                      >
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-[#00E676]" />
                          <span className="font-bold text-sm">{item.name}</span>
                        </div>
                        <span className="text-[#00E676] font-bold">{item.price} TL</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Footer */}
              <div className="p-4 border-t border-[#2C2C2C] bg-[#1E1E1E]">
                <div className="flex items-baseline justify-between">
                  <span className="text-neutral-400 text-sm">Aktarılacak Tutar:</span>
                  <span className="text-2xl font-bold text-[#00E676]">{selectedTotal.toFixed(2)} TL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#2C2C2C] bg-[#121212] flex items-center justify-between gap-4">
          <div className="text-sm text-neutral-400">
            {selectedItemIds.size > 0 && targetTableId ? (
              <span className="text-[#00E676]">
                ✓ {selectedItemIds.size} ürün MASA {targetTableNumber}'e aktarılmaya hazır
              </span>
            ) : (
              <span>Ürün ve hedef masa seçiniz</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[#2C2C2C] hover:bg-[#333333] border border-[#444444] rounded-lg transition-all font-bold"
            >
              İPTAL
            </button>
            <button
              onClick={handleTransfer}
              disabled={selectedItemIds.size === 0 || !targetTableId}
              className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                selectedItemIds.size > 0 && targetTableId
                  ? 'bg-[#00E676] hover:bg-[#00C853] text-[#121212] shadow-lg shadow-[#00E676]/30 active:scale-95'
                  : 'bg-[#333333] text-neutral-600 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
              AKTAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
