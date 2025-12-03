import { useState, useMemo } from 'react';
import { Search, Calendar, AlertTriangle, X, Undo2, Filter } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Table, Order, Payment, WasteItem } from '../App';

interface Transaction {
  id: string;
  timestamp: number;
  time: string;
  staff: string;
  tableNumber: number | null;
  actionType: 'order_added' | 'payment_full' | 'payment_partial' | 'table_transfer' | 'order_cancelled' | 'waste_item';
  amount: number;
  status: 'success' | 'voided' | 'pending';
  details: string;
  orderId?: string;
  paymentId?: string;
  wasteId?: string;
  wasteType?: 'waste' | 'delete';
}

interface TransactionHistoryScreenProps {
  tables: Table[];
  orders: Order[];
  payments: Payment[];
  wastes: WasteItem[];
  onRevertTransaction: (transactionId: string) => void;
  onRevertWaste: (wasteId: string) => void;
}

export function TransactionHistoryScreen({ 
  tables, 
  orders, 
  payments,
  wastes,
  onRevertTransaction,
  onRevertWaste
}: TransactionHistoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // today, week, month, all
  const [statusFilter, setStatusFilter] = useState('all'); // all, success, voided
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; transactionId: string | null }>({
    show: false,
    transactionId: null,
  });

  // Generate transactions from orders and payments
  const allTransactions = useMemo(() => {
    const transactions: Transaction[] = [];

    // Add order transactions
    orders.forEach(order => {
      transactions.push({
        id: `order-${order.id}`,
        timestamp: order.timestamp,
        time: order.time,
        staff: 'Sistem', // In real app, this would come from auth
        tableNumber: order.tableNumber,
        actionType: order.isTransfer ? 'table_transfer' : 'order_added',
        amount: order.totalAmount,
        status: 'success',
        details: order.isTransfer 
          ? `Masa ${order.transferFrom} → Masa ${order.tableNumber}` 
          : order.items,
        orderId: order.id,
      });
    });

    // Add payment transactions
    payments.forEach(payment => {
      transactions.push({
        id: `payment-${payment.id}`,
        timestamp: payment.timestamp,
        time: payment.time,
        staff: 'Kasiyer',
        tableNumber: payment.tableNumber,
        actionType: payment.isPartial ? 'payment_partial' : 'payment_full',
        amount: payment.totalAmount,
        status: 'success',
        details: `${payment.cashAmount > 0 ? 'Nakit: ₺' + payment.cashAmount : ''} ${payment.cardAmount > 0 ? 'Kart: ₺' + payment.cardAmount : ''}`.trim(),
        paymentId: payment.id,
      });
    });

    // Add waste transactions
    wastes.forEach(waste => {
      const wasteTypeLabel = waste.type === 'waste' ? 'ZAYİ/FİRE' : 'AKTİF İPTAL';
      transactions.push({
        id: `waste-${waste.id}`,
        timestamp: waste.timestamp,
        time: waste.time,
        staff: 'Sistem',
        tableNumber: waste.tableNumber,
        actionType: 'waste_item',
        amount: waste.price,
        status: 'success',
        details: `${wasteTypeLabel}: ${waste.name} (${waste.reason})`,
        wasteId: waste.id,
        wasteType: waste.type,
      });
    });

    // Sort by timestamp descending (newest first)
    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, payments, wastes]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    // Date filter
    const now = Date.now();
    if (dateFilter === 'today') {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => t.timestamp >= startOfDay);
    } else if (dateFilter === 'week') {
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(t => t.timestamp >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(t => t.timestamp >= monthAgo);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.details.toLowerCase().includes(query) ||
        t.tableNumber?.toString().includes(query) ||
        t.staff.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTransactions, searchQuery, dateFilter, statusFilter]);

  const getActionTypeLabel = (type: Transaction['actionType']) => {
    const labels = {
      order_added: 'Sipariş Eklendi',
      payment_full: 'Tam Ödeme',
      payment_partial: 'Kısmi Ödeme',
      table_transfer: 'Masa Transferi',
      order_cancelled: 'Sipariş İptal',
      waste_item: 'ZAYİ / İPTAL',
    };
    return labels[type];
  };

  const getActionTypeColor = (type: Transaction['actionType']) => {
    const colors = {
      order_added: 'text-[#FFD600] bg-[#FFD600]/10',
      payment_full: 'text-[#00E676] bg-[#00E676]/10',
      payment_partial: 'text-[#FF9100] bg-[#FF9100]/10',
      table_transfer: 'text-[#9C27B0] bg-[#9C27B0]/10',
      order_cancelled: 'text-red-500 bg-red-500/10',
      waste_item: 'text-red-500 bg-red-500/10',
    };
    return colors[type];
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const styles = {
      success: 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/30',
      voided: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-[#FFD600]/20 text-[#FFD600] border-[#FFD600]/30',
    };
    const labels = {
      success: 'Başarılı',
      voided: 'İptal Edildi',
      pending: 'Beklemede',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleRevertClick = (transactionId: string) => {
    setConfirmModal({ show: true, transactionId });
  };

  const handleConfirmRevert = () => {
    if (confirmModal.transactionId) {
      const transaction = allTransactions.find(t => t.id === confirmModal.transactionId);
      if (transaction) {
        if (transaction.actionType === 'waste_item') {
          onRevertWaste(transaction.wasteId!);
        } else {
          onRevertTransaction(confirmModal.transactionId);
        }
      }
      setConfirmModal({ show: false, transactionId: null });
      toast.success('İşlem başarıyla geri alındı');
    }
  };

  const handleCancelRevert = () => {
    setConfirmModal({ show: false, transactionId: null });
  };

  // Calculate stats
  const stats = useMemo(() => {
    const todayTransactions = filteredTransactions.filter(t => {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      return t.timestamp >= startOfDay;
    });

    return {
      total: filteredTransactions.length,
      today: todayTransactions.length,
      totalAmount: filteredTransactions
        .filter(t => t.actionType.includes('payment'))
        .reduce((sum, t) => sum + t.amount, 0),
      success: filteredTransactions.filter(t => t.status === 'success').length,
    };
  }, [filteredTransactions]);

  return (
    <div className="h-full bg-[#121212] p-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl text-white tracking-wide mb-2">İŞLEM GEÇMİŞİ & DENETİM GÜNLÜĞÜ</h1>
        <p className="text-sm text-neutral-400">Tüm POS işlemlerinin detaylı kaydı ve geri alma yönetimi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Toplam İşlem</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Bugünkü İşlemler</p>
          <p className="text-2xl font-bold text-[#FFD600]">{stats.today}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Toplam Tahsilat</p>
          <p className="text-2xl font-bold text-[#00E676]">₺{stats.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Başarılı İşlem</p>
          <p className="text-2xl font-bold text-white">{stats.success}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4 mb-4 flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Masa no, personel, detay ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#2C2C2C] border border-[#333333] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#00E676] transition-colors"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-500" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-[#2C2C2C] border border-[#333333] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] cursor-pointer"
          >
            <option value="today">Bugün</option>
            <option value="week">Son 7 Gün</option>
            <option value="month">Son 30 Gün</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#2C2C2C] border border-[#333333] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E676] cursor-pointer"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="success">Başarılı</option>
            <option value="voided">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="flex-1 bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="bg-[#2C2C2C] border-b border-[#333333]">
          <div className="grid grid-cols-[140px_120px_100px_180px_120px_120px_140px] gap-4 px-4 py-3 text-xs font-bold text-neutral-400 tracking-wide">
            <div>İŞLEM ZAMANI</div>
            <div>PERSONEL</div>
            <div className="text-[#FF9100]">MASA</div>
            <div>İŞLEM TİPİ</div>
            <div className="text-right">TUTAR</div>
            <div>DURUM</div>
            <div className="text-center">AKSİYON</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-neutral-500 mb-2">İşlem bulunamadı</p>
                <p className="text-xs text-neutral-600">Farklı filtreler deneyin</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#2C2C2C]">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[140px_120px_100px_180px_120px_120px_140px] gap-4 px-4 py-4 hover:bg-[#2C2C2C]/50 transition-colors items-center"
                >
                  {/* Timestamp */}
                  <div className="text-sm text-neutral-300">
                    <div>{new Date(transaction.timestamp).toLocaleDateString('tr-TR')}</div>
                    <div className="text-xs text-neutral-500">{transaction.time}</div>
                  </div>

                  {/* Staff */}
                  <div className="text-sm text-white font-medium">{transaction.staff}</div>

                  {/* Table Number - Highlighted */}
                  <div>
                    {transaction.tableNumber !== null ? (
                      <span className="inline-block bg-[#FF9100]/20 border border-[#FF9100]/30 text-[#FF9100] px-3 py-1 rounded font-bold text-sm">
                        M-{transaction.tableNumber}
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-sm">-</span>
                    )}
                  </div>

                  {/* Action Type */}
                  <div>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${getActionTypeColor(transaction.actionType)}`}>
                      {getActionTypeLabel(transaction.actionType)}
                    </span>
                    <div className="text-xs text-neutral-500 mt-1 truncate">
                      {transaction.details}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      ₺{transaction.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Status */}
                  <div>{getStatusBadge(transaction.status)}</div>

                  {/* Action */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleRevertClick(transaction.id)}
                      disabled={transaction.status === 'voided'}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        transaction.status === 'voided'
                          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          : 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50'
                      }`}
                    >
                      <Undo2 className="w-3 h-3" />
                      Geri Al
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] border-2 border-red-500/30 rounded-xl shadow-2xl shadow-red-500/20 max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-bold text-white">Dikkat: Kritik İşlem</h3>
              </div>
              <button
                onClick={handleCancelRevert}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <p className="text-white mb-4">
                Bu işlem ve rapora etkileri geri alınacak. Emin misiniz?
              </p>
              <div className="bg-[#2C2C2C] border border-red-500/20 rounded-lg p-4 mb-4">
                <p className="text-xs text-neutral-400 mb-2">Uyarılar:</p>
                <ul className="text-sm text-red-400 space-y-1 list-disc list-inside">
                  <li>Günlük raporlar etkilenecektir</li>
                  <li>Masa durumu değişebilir</li>
                  <li>Bu işlem geri alınamaz</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#2C2C2C]/50 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={handleCancelRevert}
                className="px-5 py-2.5 bg-[#2C2C2C] border border-[#333333] text-white rounded-lg hover:bg-[#333333] transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleConfirmRevert}
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-500/30"
              >
                İşlemi Geri Al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}