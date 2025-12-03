import { useState } from 'react';
import { X, CreditCard, Banknote, Percent, Users } from 'lucide-react';
import { Order } from '../App';

interface PaymentModalProps {
  tableNumber: number;
  tableId: string;
  orders: Order[];
  currentBill: number;
  onClose: () => void;
  onPartialPayment: (paidAmount: number, cashAmount: number, cardAmount: number, selectedItemIds: string[]) => void;
  onFullPayment: (cashAmount: number, cardAmount: number) => void;
  onWasteItems: (selectedItemIds: string[], reason: string) => void;
}

type PaymentTab = 'standard' | 'split';

export function PaymentModal({ 
  tableNumber, 
  tableId, 
  orders, 
  currentBill,
  onClose, 
  onPartialPayment, 
  onFullPayment,
  onWasteItems
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('standard');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  
  // Waste reason modal states
  const [showWasteReasonModal, setShowWasteReasonModal] = useState(false);
  const [wasteReason, setWasteReason] = useState('');
  const [customWasteReason, setCustomWasteReason] = useState('');
  
  // Split bill states
  const [splitCount, setSplitCount] = useState<number>(2);
  const [splitPayments, setSplitPayments] = useState<{[key: number]: {cash: string, card: string}}>({}); 
  const [currentSplitPerson, setCurrentSplitPerson] = useState<number>(1);
  const [completedSplitPayments, setCompletedSplitPayments] = useState<Set<number>>(new Set());

  // Filter orders for this table and get all unpaid items
  const tableOrders = orders.filter(order => order.tableNumber === tableNumber);
  const allUnpaidItems = tableOrders.flatMap(order => 
    order.orderItems.filter(item => !item.isPaid)
  );

  // Calculate total amount from unpaid items
  const totalAmount = allUnpaidItems.reduce((sum, item) => sum + item.price, 0);
  
  // Split bill calculations
  const splitPerPerson = currentBill / splitCount;
  const totalSplitCollected = Array.from(completedSplitPayments).reduce((sum, personNum) => {
    const payment = splitPayments[personNum];
    if (payment) {
      const cash = parseFloat(payment.cash) || 0;
      const card = parseFloat(payment.card) || 0;
      return sum + cash + card;
    }
    return sum;
  }, 0);
  
  const handleCompleteSplitPayment = () => {
    const payment = splitPayments[currentSplitPerson] || { cash: '', card: '' };
    const cash = parseFloat(payment.cash) || 0;
    const card = parseFloat(payment.card) || 0;
    const personTotal = cash + card;
    
    // Son kişi kontrolü
    const isLastPerson = completedSplitPayments.size + 1 === splitCount;
    const remainingBill = currentBill - totalSplitCollected;
    
    // Son kişi ise kalan tutarı ödemeli, değilse herhangi bir tutar girebilir
    const isValidPayment = isLastPerson 
      ? personTotal >= remainingBill 
      : personTotal > 0;
    
    if (isValidPayment) {
      // Mark this person as paid
      setCompletedSplitPayments(prev => new Set([...prev, currentSplitPerson]));
      
      // Check if all people have paid
      if (isLastPerson) {
        // Final payment - complete the full payment
        const totalCash = Array.from([...completedSplitPayments, currentSplitPerson]).reduce((sum, personNum) => {
          const payment = splitPayments[personNum];
          return sum + (payment ? parseFloat(payment.cash) || 0 : 0);
        }, 0);
        
        const totalCard = Array.from([...completedSplitPayments, currentSplitPerson]).reduce((sum, personNum) => {
          const payment = splitPayments[personNum];
          return sum + (payment ? parseFloat(payment.card) || 0 : 0);
        }, 0);
        
        setSuccessMessage('HESAP TAMAMLANDI');
        setShowSuccess(true);
        setTimeout(() => {
          onFullPayment(totalCash, totalCard);
        }, 1500);
      } else {
        // Move to next person
        setCurrentSplitPerson(prev => prev + 1);
      }
    }
  };
  
  const updateSplitPayment = (personNum: number, field: 'cash' | 'card', value: string) => {
    setSplitPayments(prev => ({
      ...prev,
      [personNum]: {
        ...prev[personNum],
        [field]: value
      }
    }));
  };
  
  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
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

  // Calculate total of selected items
  const selectedTotal = allUnpaidItems
    .filter(item => selectedItemIds.has(item.id))
    .reduce((sum, item) => sum + item.price, 0);

  // Use selected total if items are selected, otherwise use full totalAmount
  // BUT: Cannot exceed currentBill
  const effectiveTotalAmount = selectedItemIds.size > 0 
    ? Math.min(selectedTotal, currentBill) 
    : Math.min(totalAmount, currentBill);

  const calculateTotal = () => {
    const discount = discountPercent ? parseFloat(discountPercent) : 0;
    // Her ürünün fiyatı üzerinden indirim uygula: fiyat * (1 - indirim%)
    // Toplam = Σ(ürün_fiyatı) * (1 - indirim/100)
    return effectiveTotalAmount * (1 - discount / 100);
  };

  const finalTotal = calculateTotal();
  const cashValue = cashAmount ? parseFloat(cashAmount) : 0;
  const cardValue = cardAmount ? parseFloat(cardAmount) : 0;
  const paidTotal = cashValue + cardValue;
  const remaining = finalTotal - paidTotal;
  
  // Validation: Payment cannot exceed currentBill
  const isExceeded = paidTotal > currentBill;

  const handlePartialPayment = () => {
    // Seim yapılmışsa: seçilen ürünler için ödeme alınabilir
    // Seçim yapılmamışsa: geleneksel ara ödeme
    if (selectedItemIds.size > 0) {
      // Seçilen ürünler için ödeme - tutardan FAZLA ödeyebilir ama AZ ödeyemez
      if (paidTotal >= finalTotal) {
        setSuccessMessage('SEÇİLEN ÜRÜNLER ÖDENDİ');
        setShowSuccess(true);
        setTimeout(() => {
          onPartialPayment(paidTotal, cashValue, cardValue, Array.from(selectedItemIds));
        }, 1500);
      }
    } else {
      // Geleneksel ara ödeme (tutar bazlı)
      if (paidTotal > 0 && remaining > 0) {
        setSuccessMessage('ARA ÖDEME ALINDI');
        setShowSuccess(true);
        setTimeout(() => {
          onPartialPayment(paidTotal, cashValue, cardValue, []);
        }, 1500);
      }
    }
  };

  const handleFullPayment = () => {
    if (paidTotal >= finalTotal) {
      setSuccessMessage('ÖDEME TAMAMLANDI');
      setShowSuccess(true);
      setTimeout(() => {
        onFullPayment(cashValue, cardValue);
      }, 1500);
    }
  };

  const handleWasteItems = () => {
    if (selectedItemIds.size > 0) {
      setShowWasteReasonModal(true); // Sebep modal'ını aç
    }
  };
  
  const handleConfirmWaste = () => {
    const finalReason = wasteReason === 'Diğer' ? customWasteReason : wasteReason;
    
    if (!finalReason.trim()) {
      return; // Sebep girilmemişse işlem yapma
    }
    
    setShowWasteReasonModal(false);
    setSuccessMessage('SEÇİLEN ÜRÜNLER İPTAL EDİLDİ');
    setShowSuccess(true);
    setTimeout(() => {
      onWasteItems(Array.from(selectedItemIds), finalReason);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-8">
      {/* Waste Reason Modal */}
      {showWasteReasonModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-8">
          <div className="bg-[#1E1E1E] rounded-lg border-2 border-[#FF1744] w-full max-w-2xl shadow-2xl shadow-[#FF1744]/50">
            <div className="p-6">
              <h3 className="font-bold text-2xl text-[#FF1744] mb-2">İPTAL SEBEBİ</h3>
              <p className="text-neutral-400 text-sm mb-6">Lütfen iptal etme sebebini seçin veya girin</p>
              
              <div className="space-y-3">
                {[
                  'Döküldü / Kırıldı',
                  'Bozuk / Bayat',
                  'Diğer'
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setWasteReason(reason)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      wasteReason === reason
                        ? 'bg-[#FF1744]/10 border-[#FF1744] text-white'
                        : 'bg-[#2C2C2C] border-[#444444] text-neutral-300 hover:border-[#FF1744]/50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              
              {wasteReason === 'Diğer' && (
                <div className="mt-4">
                  <label className="text-neutral-400 text-sm mb-2 block">Özel Sebep:</label>
                  <input
                    type="text"
                    value={customWasteReason}
                    onChange={(e) => setCustomWasteReason(e.target.value)}
                    placeholder="İptal sebebini yazın..."
                    className="w-full bg-[#121212] border-2 border-[#444444] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF1744] transition-colors"
                    autoFocus
                  />
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowWasteReasonModal(false);
                    setWasteReason('');
                    setCustomWasteReason('');
                  }}
                  className="flex-1 py-3 bg-[#2C2C2C] hover:bg-[#333333] text-neutral-300 rounded-lg font-bold transition-colors"
                >
                  İPTAL
                </button>
                <button
                  onClick={handleConfirmWaste}
                  disabled={!wasteReason || (wasteReason === 'Diğer' && !customWasteReason.trim())}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    wasteReason && (wasteReason !== 'Diğer' || customWasteReason.trim())
                      ? 'bg-[#FF1744] hover:bg-[#FF1744]/90 text-white shadow-lg shadow-[#FF1744]/40'
                      : 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  ONAYLA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-[#1E1E1E] rounded-lg border-2 border-[#333333] w-full max-w-6xl shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2C2C2C] bg-[#121212]">
          <div>
            <h2 className="font-bold text-2xl tracking-wider">ÖDEME - MASA {tableNumber}</h2>
            <p className="text-xs text-neutral-500 mt-1">Ödeme işlemini tamamlayın</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-5 border-b border-[#2C2C2C] bg-[#121212]">
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'standard'
                ? 'bg-[#00E676] text-[#121212] shadow-lg shadow-[#00E676]/40'
                : 'bg-[#2C2C2C] text-neutral-400 hover:bg-[#333333]'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            STANDART ÖDEME
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`flex-1 py-3 rounded-lg font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'split'
                ? 'bg-[#FF9100] text-[#121212] shadow-lg shadow-[#FF9100]/40'
                : 'bg-[#2C2C2C] text-neutral-400 hover:bg-[#333333]'
            }`}
          >
            <Users className="w-5 h-5" />
            HESAP BÖL
          </button>
        </div>

        {showSuccess ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 bg-[#00E676] rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#00E676]/50">
              <svg className="w-12 h-12 text-[#121212]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-2xl mb-2">{successMessage}</h3>
            <p className="text-neutral-400">İşlem başarılı</p>
          </div>
        ) : (
          <>
            {/* 2 Column Layout */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'standard' ? (
              <div className="grid grid-cols-2 gap-6 p-6">
                {/* LEFT COLUMN - Order Info & Total */}
                <div className="space-y-5">
                  {/* Table Orders History */}
                  {allUnpaidItems.length > 0 && (
                    <div className="bg-[#121212] rounded-lg p-4 border border-[#2C2C2C]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold tracking-wide border-l-4 border-[#FFD600] pl-3">ÖDENMEMIŞ ÜRÜNLER</h3>
                        <button
                          onClick={() => {
                            if (selectedItemIds.size === allUnpaidItems.length) {
                              setSelectedItemIds(new Set());
                            } else {
                              setSelectedItemIds(new Set(allUnpaidItems.map(item => item.id)));
                            }
                          }}
                          className="text-xs bg-[#2C2C2C] hover:bg-[#333333] px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {selectedItemIds.size === allUnpaidItems.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {allUnpaidItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => toggleItemSelection(item.id)}
                            className={`w-full text-left rounded-lg p-2.5 border transition-all ${
                              selectedItemIds.has(item.id)
                                ? 'bg-[#00E676]/10 border-[#00E676] shadow-md shadow-[#00E676]/20'
                                : 'bg-[#2C2C2C] border-[#333333] hover:bg-[#333333]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5 flex-1">
                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  selectedItemIds.has(item.id)
                                    ? 'bg-[#00E676] border-[#00E676]'
                                    : 'bg-transparent border-neutral-500'
                                }`}>
                                  {selectedItemIds.has(item.id) && (
                                    <svg className="w-3.5 h-3.5 text-[#121212]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm ${selectedItemIds.has(item.id) ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                                    {item.name}
                                  </p>
                                </div>
                              </div>
                              <p className={`text-sm font-bold ${selectedItemIds.has(item.id) ? 'text-[#00E676]' : 'text-neutral-400'}`}>
                                {item.price.toFixed(2)} TL
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Selected Items Summary */}
                      {selectedItemIds.size > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#333333]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-400">Seçilen Ürünler ({selectedItemIds.size}):</span>
                            <span className="font-bold text-lg text-[#FFD600]">{selectedTotal.toFixed(2)} TL</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Amount Display */}
                  <div className="bg-[#121212] rounded-lg p-5 border border-[#2C2C2C]">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-neutral-400">Toplam Hesap:</span>
                      <span className="text-2xl font-bold text-white">{currentBill.toFixed(2)} TL</span>
                    </div>
                    
                    {selectedItemIds.size > 0 && (
                      <div className="bg-[#FFD600]/10 border border-[#FFD600] rounded-lg p-3 mt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-neutral-300 text-sm">Seçilen Ürünler:</span>
                          <span className="text-xl font-bold text-[#FFD600]">{selectedTotal.toFixed(2)} TL</span>
                        </div>
                      </div>
                    )}
                    
                    {discountPercent && parseFloat(discountPercent) > 0 && (
                      <>
                        <div className="flex items-baseline justify-between text-[#FF9100] text-sm mt-3">
                          <span>İndirim ({discountPercent}%):</span>
                          <span>-{((effectiveTotalAmount * parseFloat(discountPercent)) / 100).toFixed(2)} TL</span>
                        </div>
                      </>
                    )}
                    
                    <div className="border-t border-[#333333] mt-3 pt-3 flex items-baseline justify-between">
                      <span className="text-neutral-400 font-bold">Ödenecek:</span>
                      <span className="text-3xl font-bold text-[#00E676]">{finalTotal.toFixed(2)} TL</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN - Payment Methods */}
                <div className="space-y-5">
                  {/* Quick Discount Buttons */}
                  <div>
                    <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                      <Percent className="w-4 h-4" />
                      Hızlı İndirim
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setDiscountPercent('5')}
                        className={`py-3 rounded-lg font-bold transition-all border-2 ${
                          discountPercent === '5'
                            ? 'bg-[#FF9100] border-[#FF9100] text-[#121212] shadow-lg shadow-[#FF9100]/40'
                            : 'bg-[#121212] border-[#2C2C2C] text-[#FF9100] hover:border-[#FF9100]/50'
                        }`}
                      >
                        %5
                      </button>
                      <button
                        onClick={() => setDiscountPercent('10')}
                        className={`py-3 rounded-lg font-bold transition-all border-2 ${
                          discountPercent === '10'
                            ? 'bg-[#FF9100] border-[#FF9100] text-[#121212] shadow-lg shadow-[#FF9100]/40'
                            : 'bg-[#121212] border-[#2C2C2C] text-[#FF9100] hover:border-[#FF9100]/50'
                        }`}
                      >
                        %10
                      </button>
                      <button
                        onClick={() => setDiscountPercent('20')}
                        className={`py-3 rounded-lg font-bold transition-all border-2 ${
                          discountPercent === '20'
                            ? 'bg-[#FF9100] border-[#FF9100] text-[#121212] shadow-lg shadow-[#FF9100]/40'
                            : 'bg-[#121212] border-[#2C2C2C] text-[#FF9100] hover:border-[#FF9100]/50'
                        }`}
                      >
                        %20
                      </button>
                    </div>
                  </div>

                  {/* Discount Input */}
                  <div>
                    <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                      <Percent className="w-4 h-4" />
                      Özel İndirim Yüzdesi
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        placeholder="% Giriniz"
                        min="0"
                        max="100"
                        className="flex-1 bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF9100] transition-colors"
                      />
                      {discountPercent && parseFloat(discountPercent) > 0 && (
                        <button
                          onClick={() => {
                            setDiscountPercent('');
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 rounded-lg transition-all"
                        >
                          TEMİZLE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Split Payment */}
                  <div className="space-y-4">
                    <h3 className="font-bold tracking-wide border-l-4 border-[#00E676] pl-3">BÖLÜNMÜŞ ÖDEME</h3>
                    
                    <div>
                      <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                        <Banknote className="w-4 h-4" />
                        Nakit (Cash)
                      </label>
                      <input
                        type="number"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0.00 TL"
                        min="0"
                        step="0.01"
                        className={`w-full bg-[#121212] border-2 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${
                          isExceeded 
                            ? 'border-[#FF1744] focus:border-[#FF1744] shadow-lg shadow-[#FF1744]/30' 
                            : 'border-[#2C2C2C] focus:border-[#00E676]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4" />
                        Kredi Kartı (Card)
                      </label>
                      <input
                        type="number"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="0.00 TL"
                        min="0"
                        step="0.01"
                        className={`w-full bg-[#121212] border-2 rounded-lg px-4 py-3 text-white focus:outline-none transition-colors ${
                          isExceeded 
                            ? 'border-[#FF1744] focus:border-[#FF1744] shadow-lg shadow-[#FF1744]/30' 
                            : 'border-[#2C2C2C] focus:border-[#00E676]'
                        }`}
                      />
                    </div>
                    
                    {/* Limit Exceeded Warning */}
                    {isExceeded && (
                      <div className="bg-[#FF1744]/10 border-2 border-[#FF1744] rounded-lg p-4 flex items-center gap-3 animate-pulse">
                        <div className="flex-shrink-0 w-10 h-10 bg-[#FF1744] rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#FF1744] tracking-wide">LİMİT AŞILDI!</h4>
                          <p className="text-sm text-[#FF1744]/80 mt-0.5">
                            Ödeme tutarı toplam hesabı aşamaz. Fazla: {(paidTotal - finalTotal).toFixed(2)} TL
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-[#121212] rounded-lg p-4 border border-[#2C2C2C] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Nakit:</span>
                      <span className="text-white font-semibold">{cashValue.toFixed(2)} TL</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Kredi Kartı:</span>
                      <span className="text-white font-semibold">{cardValue.toFixed(2)} TL</span>
                    </div>
                    <div className="border-t border-[#333333] pt-2 flex justify-between">
                      <span className="text-neutral-400 font-bold">Kalan:</span>
                      <span className={`font-bold text-xl ${remaining > 0 ? 'text-[#FF1744]' : 'text-[#00E676]'}`}>
                        {remaining.toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              ) : (
                /* HESAP BÖL TAB CONTENT */
                <div className="p-6 space-y-6">
                  {/* Split Setup */}
                  <div className="bg-[#121212] rounded-lg p-6 border-2 border-[#FF9100]">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="w-6 h-6 text-[#FF9100]" />
                      <h3 className="font-bold text-xl tracking-wider text-[#FF9100]">HESAP BÖLME</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      {/* Kişi Sayısı */}
                      <div>
                        <label className="text-neutral-400 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Kaç Kişi?
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[2, 3, 4, 5, 6].map(count => (
                            <button
                              key={count}
                              onClick={() => {
                                setSplitCount(count);
                                setCurrentSplitPerson(1);
                                setCompletedSplitPayments(new Set());
                                setSplitPayments({});
                              }}
                              className={`py-4 rounded-lg font-bold text-lg transition-all border-2 ${
                                splitCount === count
                                  ? 'bg-[#FF9100] border-[#FF9100] text-[#121212] shadow-lg shadow-[#FF9100]/40 scale-105'
                                  : 'bg-[#2C2C2C] border-[#444444] text-white hover:bg-[#333333]'
                              }`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Kişi Başı Tutar */}
                      <div className="bg-[#2C2C2C] rounded-lg p-4 border border-[#444444]">
                        <p className="text-neutral-400 text-sm mb-2">Toplam Hesap:</p>
                        <p className="text-3xl font-bold text-white mb-3">{currentBill.toFixed(2)} TL</p>
                        <div className="border-t border-[#444444] pt-3">
                          <p className="text-neutral-400 text-sm mb-1">Kişi Başı Tutar:</p>
                          <p className="text-2xl font-bold text-[#FF9100]">{splitPerPerson.toFixed(2)} TL</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Current Person Payment */}
                  <div className="bg-[#121212] rounded-lg p-6 border-2 border-[#00E676]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#00E676] rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-[#121212]">{currentSplitPerson}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl tracking-wider text-[#00E676]">{currentSplitPerson}. KİŞİ ÖDEME</h3>
                          <p className="text-sm text-neutral-400">Ödemesi gereken: {splitPerPerson.toFixed(2)} TL</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">Tamamlanan</p>
                        <p className="text-2xl font-bold text-[#00E676]">{completedSplitPayments.size}/{splitCount}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                          <Banknote className="w-4 h-4" />
                          Nakit
                        </label>
                        <input
                          type="number"
                          value={splitPayments[currentSplitPerson]?.cash || ''}
                          onChange={(e) => updateSplitPayment(currentSplitPerson, 'cash', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0.00 TL"
                          min="0"
                          step="0.01"
                          className="w-full bg-[#2C2C2C] border-2 border-[#444444] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-colors text-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="text-neutral-400 mb-2 flex items-center gap-2 text-sm">
                          <CreditCard className="w-4 h-4" />
                          Kredi Kartı
                        </label>
                        <input
                          type="number"
                          value={splitPayments[currentSplitPerson]?.card || ''}
                          onChange={(e) => updateSplitPayment(currentSplitPerson, 'card', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0.00 TL"
                          min="0"
                          step="0.01"
                          className="w-full bg-[#2C2C2C] border-2 border-[#444444] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00E676] transition-colors text-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Current Person Summary */}
                    <div className="mt-4 bg-[#2C2C2C] rounded-lg p-4 border border-[#444444]">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-400">Nakit:</span>
                        <span className="text-white font-semibold">{(parseFloat(splitPayments[currentSplitPerson]?.cash || '0') || 0).toFixed(2)} TL</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-neutral-400">Kredi Kartı:</span>
                        <span className="text-white font-semibold">{(parseFloat(splitPayments[currentSplitPerson]?.card || '0') || 0).toFixed(2)} TL</span>
                      </div>
                      <div className="border-t border-[#444444] pt-2 flex justify-between">
                        <span className="text-neutral-400 font-bold">Toplam Ödenen:</span>
                        <span className="font-bold text-xl text-[#00E676]">
                          {((parseFloat(splitPayments[currentSplitPerson]?.cash || '0') || 0) + (parseFloat(splitPayments[currentSplitPerson]?.card || '0') || 0)).toFixed(2)} TL
                        </span>
                      </div>
                      {(() => {
                        const personTotal = (parseFloat(splitPayments[currentSplitPerson]?.cash || '0') || 0) + (parseFloat(splitPayments[currentSplitPerson]?.card || '0') || 0);
                        const isLastPerson = completedSplitPayments.size + 1 === splitCount;
                        const remainingBill = currentBill - totalSplitCollected;
                        
                        // Son kişi ise kalan tutarı göster, değilse kişi başı tutardan kalanı göster
                        const requiredAmount = isLastPerson ? remainingBill : splitPerPerson;
                        const remaining = requiredAmount - personTotal;
                        
                        return remaining > 0 && (
                          <div className="mt-2 pt-2 border-t border-[#444444]">
                            <div className="flex justify-between">
                              <span className="text-neutral-400">
                                {isLastPerson ? 'Kalan Hesap:' : 'Kalan (Önerilen):'}
                              </span>
                              <span className={`font-bold ${isLastPerson ? 'text-[#FF1744]' : 'text-[#FF9100]'}`}>
                                {remaining.toFixed(2)} TL
                              </span>
                            </div>
                            {isLastPerson && (
                              <p className="text-xs text-[#FF1744] mt-1 text-center">
                                ⚠️ Son kişi kalan tutarı kapatmalıdır
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <button
                      onClick={handleCompleteSplitPayment}
                      disabled={(() => {
                        const personTotal = (parseFloat(splitPayments[currentSplitPerson]?.cash || '0') || 0) + (parseFloat(splitPayments[currentSplitPerson]?.card || '0') || 0);
                        const isLastPerson = completedSplitPayments.size + 1 === splitCount;
                        const remainingBill = currentBill - totalSplitCollected;
                        
                        // Son kişi ise kalan tutarı ödemeli, değilse herhangi bir tutar yeterli
                        return isLastPerson ? personTotal < remainingBill : personTotal <= 0;
                      })()}
                      className={`w-full mt-4 py-4 rounded-lg font-bold tracking-wider transition-all ${
                        (() => {
                          const personTotal = (parseFloat(splitPayments[currentSplitPerson]?.cash || '0') || 0) + (parseFloat(splitPayments[currentSplitPerson]?.card || '0') || 0);
                          const isLastPerson = completedSplitPayments.size + 1 === splitCount;
                          const remainingBill = currentBill - totalSplitCollected;
                          
                          const isValid = isLastPerson ? personTotal >= remainingBill : personTotal > 0;
                          return isValid
                            ? 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] active:scale-95 shadow-lg shadow-[#00E676]/40'
                            : 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed';
                        })()
                      }`}
                    >
                      {completedSplitPayments.size + 1 === splitCount ? 'ÖDEMEYI TAMAMLA' : 'SONRAKİ KİŞİ'}
                    </button>
                  </div>
                  
                  {/* Completed Payments */}
                  {completedSplitPayments.size > 0 && (
                    <div className="bg-[#121212] rounded-lg p-6 border border-[#2C2C2C]">
                      <h3 className="font-bold tracking-wide border-l-4 border-[#00E676] pl-3 mb-4">TAMAMLANAN ÖDEMELER</h3>
                      <div className="space-y-2">
                        {Array.from(completedSplitPayments).map(personNum => {
                          const payment = splitPayments[personNum] || { cash: '0', card: '0' };
                          const cash = parseFloat(payment.cash) || 0;
                          const card = parseFloat(payment.card) || 0;
                          const total = cash + card;
                          
                          return (
                            <div key={personNum} className="bg-[#00E676]/10 border border-[#00E676] rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-[#00E676] rounded-full flex items-center justify-center">
                                    <span className="font-bold text-[#121212]">{personNum}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm text-white font-semibold">{personNum}. Kişi</p>
                                    <p className="text-xs text-neutral-400">Nakit: {cash.toFixed(2)} TL • Kart: {card.toFixed(2)} TL</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-[#00E676]">{total.toFixed(2)} TL</p>
                                  <p className="text-xs text-[#00E676]">✓ Ödendi</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-[#333333]">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Toplanan Tutar:</span>
                          <span className="text-2xl font-bold text-[#00E676]">{totalSplitCollected.toFixed(2)} TL</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-neutral-400 text-sm">Kalan Tutar:</span>
                          <span className="text-lg font-bold text-[#FF9100]">{(currentBill - totalSplitCollected).toFixed(2)} TL</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-[#2C2C2C] bg-[#121212] flex gap-3">
              {activeTab === 'standard' ? (
                <>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-[#2C2C2C] hover:bg-[#333333] text-neutral-300 rounded-lg font-bold tracking-wide transition-colors"
                  >
                    İPTAL
                  </button>
                  
                  <button
                    onClick={handlePartialPayment}
                    disabled={
                      paidTotal <= 0 || 
                      isExceeded || 
                      (selectedItemIds.size > 0 ? paidTotal < finalTotal : remaining <= 0)
                    }
                    className={`flex-1 py-4 rounded-lg font-bold tracking-wider transition-all ${
                      paidTotal > 0 && 
                      !isExceeded && 
                      (selectedItemIds.size > 0 ? paidTotal >= finalTotal : remaining > 0)
                        ? 'bg-[#FFD600] hover:bg-[#FFD600]/90 text-[#121212] active:scale-95 shadow-lg shadow-[#FFD600]/40'
                        : 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    {selectedItemIds.size > 0 ? 'SEÇİLENLERİ ÖDEN' : 'ARA ÖDEME'}
                  </button>

                  <button
                    onClick={handleWasteItems}
                    disabled={selectedItemIds.size === 0}
                    className={`flex-1 py-4 rounded-lg font-bold tracking-wider transition-all ${
                      selectedItemIds.size > 0
                        ? 'bg-[#FF1744] hover:bg-[#FF1744]/90 text-white active:scale-95 shadow-lg shadow-[#FF1744]/40'
                        : 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    ZAYİ/FİRE
                  </button>

                  <button
                    onClick={handleFullPayment}
                    disabled={paidTotal < finalTotal || isExceeded}
                    className={`flex-1 py-4 rounded-lg font-bold tracking-wider transition-all ${
                      paidTotal >= finalTotal && !isExceeded
                        ? 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] active:scale-95 shadow-lg shadow-[#00E676]/40'
                        : 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    TAM ÖDEME
                  </button>
                </>
              ) : (
                /* Hesap Bölme Sekmesi - Sadece İptal Butonu */
                <button
                  onClick={onClose}
                  className="w-full py-4 bg-[#2C2C2C] hover:bg-[#333333] text-neutral-300 rounded-lg font-bold tracking-wide transition-colors"
                >
                  KAPAT
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}