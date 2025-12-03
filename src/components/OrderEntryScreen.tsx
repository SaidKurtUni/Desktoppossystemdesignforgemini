import { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ArrowLeft, ArrowRightLeft, Clock, CheckCircle2 } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { TableTransferModal } from './TableTransferModal';
import { Order, Table, OrderItem } from '../App';
import { InventoryProduct } from './InventoryScreen';
import { CategorySettings } from './CategoryManagement';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

type Category = 'biralar' | 'kokteyller' | 'atistirmalik';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface OrderEntryScreenProps {
  tableNumber: number;
  tableId: string;
  currentBill: number;
  onAddOrder: (tableNumber: number, items: string, totalAmount: number, orderItems: { id: string; name: string; price: number; isPaid: boolean }[], orderNote?: string) => void;
  onPartialPayment: (tableId: string, paidAmount: number, cashAmount: number, cardAmount: number, selectedItemIds: string[]) => void;
  onFullPayment: (tableId: string, cashAmount: number, cardAmount: number) => void;
  orders: Order[];
  tables: Table[];
  onTableTransfer: (sourceTableId: string, targetTableId: string, selectedItemIds: string[]) => void;
  onWasteItems: (tableId: string, selectedItemIds: string[], reason: string) => void;
  onDeleteOrderItem: (tableId: string, itemId: string, reason: string) => void;
  inventory: InventoryProduct[];
}

// Varsayılan ürünler - yedek olarak kullanılacak
const defaultProducts: Product[] = [
  // Biralar
  { id: 'b1', name: 'EFES PİLSEN', price: 45, category: 'biralar' },
  { id: 'b2', name: 'BOMONTİ', price: 50, category: 'biralar' },
  { id: 'b3', name: 'TUBORG', price: 45, category: 'biralar' },
  { id: 'b4', name: 'CORONA', price: 65, category: 'biralar' },
  { id: 'b5', name: 'HEINEKEN', price: 60, category: 'biralar' },
  { id: 'b6', name: 'CARLSBERG', price: 55, category: 'biralar' },
  { id: 'b7', name: 'AMSTERDAM', price: 70, category: 'biralar' },
  { id: 'b8', name: 'MILLER', price: 58, category: 'biralar' },
  { id: 'b9', name: 'BECKs', price: 62, category: 'biralar' },
  
  // Kokteyller
  { id: 'c1', name: 'MOJİTO', price: 85, category: 'kokteyller' },
  { id: 'c2', name: 'MARGARİTA', price: 90, category: 'kokteyller' },
  { id: 'c3', name: 'COSMOPOLİTAN', price: 95, category: 'kokteyller' },
  { id: 'c4', name: 'LONG ISLAND', price: 110, category: 'kokteyller' },
  { id: 'c5', name: 'PIÑA COLADA', price: 100, category: 'kokteyller' },
  { id: 'c6', name: 'OLD FASHIONED', price: 105, category: 'kokteyller' },
  { id: 'c7', name: 'NEGRONI', price: 98, category: 'kokteyller' },
  { id: 'c8', name: 'APEROL SPRITZ', price: 88, category: 'kokteyller' },
  { id: 'c9', name: 'WHISKEY SOUR', price: 92, category: 'kokteyller' },
  
  // Atıştırmalık
  { id: 'f1', name: 'ÇITIR TAVUK KANAT', price: 75, category: 'atistirmalik' },
  { id: 'f2', name: 'NACHOS SUPREME', price: 65, category: 'atistirmalik' },
  { id: 'f3', name: 'BBQ KABURGA', price: 120, category: 'atistirmalik' },
  { id: 'f4', name: 'SEZAR SALATA', price: 55, category: 'atistirmalik' },
  { id: 'f5', name: 'MARGHERİTA PİZZA', price: 95, category: 'atistirmalik' },
  { id: 'f6', name: 'DANA BURGER', price: 85, category: 'atistirmalik' },
  { id: 'f7', name: 'PATATES KIZARTMASI', price: 40, category: 'atistirmalik' },
  { id: 'f8', name: 'SOĞAN HALKASI', price: 45, category: 'atistirmalik' },
  { id: 'f9', name: 'MEZE TABAĞI', price: 70, category: 'atistirmalik' },
];

export function OrderEntryScreen({ 
  tableNumber, 
  tableId, 
  currentBill, 
  onAddOrder, 
  onPartialPayment, 
  onFullPayment,
  orders,
  tables,
  onTableTransfer,
  onWasteItems,
  onDeleteOrderItem,
  inventory
}: OrderEntryScreenProps) {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<{ [key: string]: string }>({});
  const [categorySettings, setCategorySettings] = useState<{ [key: string]: CategorySettings }>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; name: string; price: number } | null>(null);
  const [orderNote, setOrderNote] = useState<string>(''); // Sipariş notu state'i
  
  // Delete reason states
  const [deleteReason, setDeleteReason] = useState('');
  const [customDeleteReason, setCustomDeleteReason] = useState('');

  // Load categories from localStorage
  useEffect(() => {
    const loadCategories = () => {
      const savedCategories = localStorage.getItem('pos_categories');
      const savedCategoryNames = localStorage.getItem('pos_category_names');
      const savedCategorySettings = localStorage.getItem('pos_category_settings');

      let loadedCategories = ['biralar', 'kokteyller', 'atistirmalik'];
      let loadedCategoryNames: { [key: string]: string } = {
        'biralar': '🍺 Biralar',
        'kokteyller': '🍹 Kokteyller',
        'atistirmalik': '🍔 Atıştırmal��k'
      };
      let loadedCategorySettings: { [key: string]: CategorySettings } = {
        biralar: { showInMenu: true, showInInventory: true },
        kokteyller: { showInMenu: true, showInInventory: true },
        atistirmalik: { showInMenu: true, showInInventory: true }
      };

      if (savedCategories) {
        try {
          loadedCategories = JSON.parse(savedCategories);
        } catch (error) {
          console.error('Kategori yüklenemedi:', error);
        }
      }

      if (savedCategoryNames) {
        try {
          loadedCategoryNames = JSON.parse(savedCategoryNames);
        } catch (error) {
          console.error('Kategori isimleri yüklenemedi:', error);
        }
      }

      if (savedCategorySettings) {
        try {
          loadedCategorySettings = JSON.parse(savedCategorySettings);
        } catch (error) {
          console.error('Kategori ayarları yüklenemedi:', error);
        }
      }

      setCategories(loadedCategories);
      setCategoryNames(loadedCategoryNames);
      setCategorySettings(loadedCategorySettings);

      // İlk menüde gösterilen kategoriyi default olarak seç
      const firstMenuCategory = loadedCategories.find(cat => loadedCategorySettings[cat]?.showInMenu);
      if (firstMenuCategory && !selectedCategory) {
        setSelectedCategory(firstMenuCategory);
      }
    };

    loadCategories();

    // localStorage değişikliklerini dinle
    const handleCategoriesUpdate = () => {
      console.log('🔄 Kategoriler güncellendi, yeniden yükleniyor...');
      loadCategories();
    };

    window.addEventListener('categories-updated', handleCategoriesUpdate);

    return () => {
      window.removeEventListener('categories-updated', handleCategoriesUpdate);
    };
  }, []);

  // Load products from localStorage
  useEffect(() => {
    const loadProducts = () => {
      const savedProducts = localStorage.getItem('pos_products');
      if (savedProducts) {
        try {
          const parsed = JSON.parse(savedProducts);
          console.log('📦 Ürünler yüklendi:', parsed.length, 'ürün');
          setProducts(parsed);
        } catch (error) {
          console.error('❌ Ürünler yüklenemedi:', error);
          setProducts(defaultProducts);
        }
      } else {
        console.log('ℹ️ Varsayılan ürünler kullanılıyor');
        setProducts(defaultProducts);
      }
    };

    loadProducts();

    // localStorage değişikliklerini dinle
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos_products') {
        console.log('🔄 Ürünler güncellendi, yeniden yükleniyor...');
        loadProducts();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Aynı sekme içinde güncellemeleri dinlemek için custom event
    const handleProductsUpdate = () => {
      console.log('🔄 Ürünler güncellendi (custom event)');
      loadProducts();
    };

    window.addEventListener('products-updated', handleProductsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('products-updated', handleProductsUpdate);
    };
  }, []);

  const addToCart = (product: Product) => {
    // Stok kontrolü sadece biralar için
    if (product.category === 'biralar') {
      const inventoryItem = inventory.find(item => item.name === product.name);
      
      if (!inventoryItem) {
        toast.error(`${product.name} stok bilgisi bulunamadı`);
        return;
      }
      
      if (inventoryItem.currentStock <= 0) {
        toast.error(`${product.name} stokta yok!`, {
          description: 'Bu ürün tükendi, lütfen stok ekleyin.'
        });
        return;
      }
      
      // Sepetteki miktar ile mevcut stok kontrolü
      const existingItem = cart.find(item => item.id === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentCartQuantity >= inventoryItem.currentStock) {
        toast.warning(`${product.name} için yeterli stok yok!`, {
          description: `Stokta sadece ${inventoryItem.currentStock} adet kaldı.`
        });
        return;
      }
      
      // Kritik stok uyarısı
      if (inventoryItem.currentStock - (currentCartQuantity + 1) <= inventoryItem.minStock) {
        toast.warning(`${product.name} kritik stok seviyesinde!`, {
          description: `Kalan stok: ${inventoryItem.currentStock - (currentCartQuantity + 1)} ${inventoryItem.unit}`
        });
      }
    }
    
    // Stok yeterli ise veya bira kategorisi değilse sepete ekle
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    // Stok kontrolü sadece biralar için ve artırma işleminde
    if (delta > 0) {
      const item = cart.find(i => i.id === productId);
      if (item && item.category === 'biralar') {
        const inventoryItem = inventory.find(inv => inv.name === item.name);
        
        if (inventoryItem) {
          const currentCartQuantity = item.quantity;
          
          // Yeni miktar stok miktarını aşıyor mu?
          if (currentCartQuantity + delta > inventoryItem.currentStock) {
            toast.error(`${item.name} için yeterli stok yok!`, {
              description: `Stokta sadece ${inventoryItem.currentStock} adet var. Sepetinizde zaten ${currentCartQuantity} adet mevcut.`
            });
            return; // Miktar artırma işlemi yapılmaz
          }
        }
      }
    }
    
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotalWithCurrentBill = () => {
    return currentBill + getCartTotal();
  };

  const handleConfirmOrder = () => {
    if (cart.length > 0) {
      // Sipariş özetini oluştur
      const orderSummary = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
      
      // Her ürünü ayrı OrderItem olarak oluştur (quantity kadar)
      const orderItems = cart.flatMap(item => 
        Array.from({ length: item.quantity }, (_, index) => ({
          id: `${Date.now()}-${item.id}-${index}`,
          name: item.name,
          price: item.price,
          isPaid: false
        }))
      );
      
      // onAddOrder'ı güncellemek yerine doğrudan Order oluştur
      onAddOrder(tableNumber, orderSummary, getCartTotal(), orderItems, orderNote || undefined);
      setCart([]);
      setOrderNote(''); // Sipariş notu temizle
    }
  };

  const handleOpenPayment = () => {
    setShowPaymentModal(true);
  };

  const handlePartialPaymentComplete = (paidAmount: number, cashAmount: number, cardAmount: number, selectedItemIds: string[]) => {
    onPartialPayment(tableId, paidAmount, cashAmount, cardAmount, selectedItemIds);
    setShowPaymentModal(false);
  };

  const handleFullPaymentComplete = (cashAmount: number, cardAmount: number) => {
    onFullPayment(tableId, cashAmount, cardAmount);
    setCart([]);
    setShowPaymentModal(false);
  };

  const handleWasteComplete = (selectedItemIds: string[], reason: string) => {
    onWasteItems(tableId, selectedItemIds, reason);
    setShowPaymentModal(false);
  };

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  // Get all orders for this table
  const tableOrders = orders
    .filter(order => order.tableNumber === tableNumber)
    .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

  // Separate active and completed orders
  const activeOrders = tableOrders.filter(order => {
    const paidItemsCount = order.orderItems.filter(item => item.isPaid).length;
    const totalItemsCount = order.orderItems.length;
    return paidItemsCount < totalItemsCount; // Not fully paid
  });

  const completedOrders = tableOrders.filter(order => {
    const paidItemsCount = order.orderItems.filter(item => item.isPaid).length;
    const totalItemsCount = order.orderItems.length;
    return paidItemsCount === totalItemsCount; // Fully paid
  });

  // Group ALL items from ALL orders by name and payment status
  const groupAllOrderItems = (orderList: Order[]) => {
    const allItems = orderList.flatMap(order => order.orderItems);
    const grouped: { [key: string]: { name: string; price: number; isPaid: boolean; quantity: number; totalPrice: number } } = {};
    
    allItems.forEach(item => {
      const key = `${item.name}-${item.isPaid}`;
      if (grouped[key]) {
        grouped[key].quantity += 1;
        grouped[key].totalPrice += item.price;
      } else {
        grouped[key] = {
          name: item.name,
          price: item.price,
          isPaid: item.isPaid,
          quantity: 1,
          totalPrice: item.price
        };
      }
    });
    
    return Object.values(grouped).sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1; // Unpaid first
      return a.name.localeCompare(b.name);
    });
  };

  // Group items by name and payment status
  const groupOrderItems = (items: OrderItem[]) => {
    const grouped: { [key: string]: { name: string; price: number; isPaid: boolean; quantity: number; totalPrice: number } } = {};
    
    items.forEach(item => {
      const key = `${item.name}-${item.isPaid}`;
      if (grouped[key]) {
        grouped[key].quantity += 1;
        grouped[key].totalPrice += item.price;
      } else {
        grouped[key] = {
          name: item.name,
          price: item.price,
          isPaid: item.isPaid,
          quantity: 1,
          totalPrice: item.price
        };
      }
    });
    
    return Object.values(grouped);
  };

  return (
    <>
      <div className="h-full flex gap-1">
        {/* LEFT SIDE - New Order Section (78%) */}
        <div className="w-[78%] flex border-r border-[#2C2C2C]">
          {/* Category Sidebar - 20% of left side */}
          <div className="w-[20%] bg-[#121212] border-r border-[#2C2C2C] p-3">
            <h3 className="text-neutral-500 mb-3 text-xs tracking-widest">KATEGORİLER</h3>
            <div className="space-y-2">
              {categories
                .filter(category => categorySettings[category]?.showInMenu !== false)
                .map(category => {
                  // Emoji ve ismi ayır
                  const fullName = categoryNames[category] || category;
                  const emojiMatch = fullName.match(/^(\p{Emoji})\s+(.+)$/u);
                  const emoji = emojiMatch ? emojiMatch[1] : '📦';
                  const name = emojiMatch ? emojiMatch[2].toUpperCase() : fullName.toUpperCase();
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full py-5 px-3 rounded-lg transition-all relative overflow-hidden ${
                        selectedCategory === category
                          ? 'bg-[#2C2C2C] text-white font-bold border-l-4 border-[#00E676] shadow-lg'
                          : 'bg-[#1E1E1E] text-neutral-400 hover:bg-[#2C2C2C] border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{emoji}</span>
                        <span className="text-xs tracking-wide">{name}</span>
                      </div>
                    </button>
                  );
                })
              }
            </div>
          </div>

          {/* Products Grid - 48% of left side */}
          <div className="w-[48%] bg-[#1E1E1E] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-xl tracking-wider">MASA {tableNumber} - MENÜ</h2>
                <p className="text-xs text-neutral-500 mt-1">Ürün seçimi yapın</p>
              </div>
              <div className="flex items-center gap-3">
                {currentBill > 0 && (
                  <>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center gap-2 bg-[#9C27B0]/20 hover:bg-[#9C27B0]/30 border-2 border-[#9C27B0] rounded-lg px-4 py-2 transition-all active:scale-95 shadow-lg shadow-[#9C27B0]/20"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-[#9C27B0]" />
                      <div className="text-left">
                        <span className="text-xs text-neutral-400 block">Masa Aktar</span>
                      </div>
                    </button>
                    
                    <div className="bg-[#FF1744]/20 border-2 border-[#FF1744] rounded-lg px-4 py-2">
                      <span className="text-xs text-neutral-400">Mevcut Hesap:</span>
                      <span className="text-xl font-bold text-[#FF1744] ml-2">₺{currentBill}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 h-[calc(100%-90px)] overflow-y-auto pr-2">
              {filteredProducts.map((product) => {
                // Stok kontrolü - sadece biralar için
                const inventoryItem = product.category === 'biralar' 
                  ? inventory.find(item => item.name === product.name)
                  : null;
                const isOutOfStock = inventoryItem ? inventoryItem.currentStock <= 0 : false;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className={`border rounded-lg p-4 transition-all h-24 flex flex-col items-center justify-center shadow-lg ${
                      isOutOfStock 
                        ? 'bg-[#1E1E1E] border-[#FF1744] opacity-60 cursor-not-allowed' 
                        : 'bg-[#333333] hover:bg-[#3C3C3C] border-[#444444] hover:border-[#00E676] active:scale-95'
                    }`}
                  >
                    <span className={`font-bold tracking-wide text-center leading-tight mb-2 ${
                      isOutOfStock ? 'text-neutral-500' : 'text-white'
                    }`}>
                      {product.name}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[#FF1744] font-bold text-xs">STOKTA BİTTİ</span>
                    ) : (
                      <span className="text-[#00E676] font-bold">{product.price} TL</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Ticket Sidebar - 32% of left side */}
          <div className="w-[32%] bg-[#121212] border-l border-[#2C2C2C] flex flex-col">
            <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
              <h2 className="font-bold tracking-wider">YENİ SİPARİŞ</h2>
              <p className="text-xs text-neutral-500 mt-1">Masa {tableNumber}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center text-neutral-600 mt-16">
                  <p className="text-sm">Henüz ürün eklenmedi</p>
                  <p className="text-xs mt-2">Menüden ürün seçin</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#2C2C2C] rounded-lg p-3 border border-[#333333]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{item.name}</h3>
                        <p className="text-xs text-[#00E676]">{item.price} TL</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="bg-[#1E1E1E] hover:bg-[#333333] p-1.5 rounded-lg"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="bg-[#1E1E1E] hover:bg-[#333333] p-1.5 rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-bold">{item.price * item.quantity} TL</span>
                    </div>
                  </div>
                ))
              )}
              
              {/* Sipariş Notu Alanı - Sepette ürün varsa göster */}
              {cart.length > 0 && (
                <div className="bg-[#2C2C2C] rounded-lg p-3 border border-[#333333] mt-3">
                  <label className="block text-xs text-neutral-400 mb-2">Sipariş Notu (Opsiyonel)</label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Örn: Az buzlu, soğansız..."
                    className="w-full bg-[#1E1E1E] border border-[#444444] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#00E676] resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-right mt-1">
                    <span className="text-xs text-neutral-600">{orderNote.length}/200</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#2C2C2C] space-y-3">
              {/* Yeni Sipariş Toplamı */}
              {cart.length > 0 && (
                <div className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-lg">
                  <span className="text-neutral-400 text-sm">Yeni Sipariş:</span>
                  <span className="font-bold text-lg text-white">{getCartTotal()} TL</span>
                </div>
              )}

              {/* Toplam Tutar */}
              <div className="flex items-center justify-between bg-[#2C2C2C] p-3 rounded-lg border-2 border-[#FFD600]/30">
                <span className="text-neutral-400">Toplam:</span>
                <span className="font-bold text-2xl text-[#FFD600]">{getTotalWithCurrentBill()} TL</span>
              </div>

              {/* Butonlar */}
              <div className="space-y-2">
                <button
                  onClick={handleConfirmOrder}
                  disabled={cart.length === 0}
                  className={`w-full py-3 rounded-lg font-bold tracking-wider transition-all ${
                    cart.length === 0
                      ? 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                      : 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] active:scale-95 shadow-lg shadow-[#00E676]/40'
                  }`}
                >
                  SİPARİŞİ ONAYLA
                </button>

                <button
                  onClick={handleOpenPayment}
                  disabled={getTotalWithCurrentBill() === 0}
                  className={`w-full py-3 rounded-lg font-bold tracking-wider transition-all ${
                    getTotalWithCurrentBill() === 0
                      ? 'bg-[#2C2C2C] text-neutral-600 cursor-not-allowed'
                      : 'bg-[#FF9100] hover:bg-[#FF9100]/90 text-[#121212] active:scale-95 shadow-lg shadow-[#FF9100]/40'
                  }`}
                >
                  ÖDEME
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Order History Section (22%) */}
        <div className="w-[22%] bg-[#1E1E1E] flex flex-col">
          <div className="p-4 border-b border-[#2C2C2C] bg-[#121212]">
            <h2 className="font-bold text-lg tracking-wider">SİPARİŞ GEÇMİŞİ</h2>
            <p className="text-xs text-neutral-500 mt-1">Masa {tableNumber}</p>
            
            {/* Summary Stats */}
            {tableOrders.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-2">
                  <p className="text-xs text-neutral-500">Sipariş</p>
                  <p className="text-xl font-bold text-[#00E676] mt-0.5">{tableOrders.length}</p>
                </div>
                <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-2">
                  <p className="text-xs text-neutral-500">Toplam</p>
                  <p className="text-xl font-bold text-[#FFD600] mt-0.5">
                    ₺{tableOrders.reduce((sum, order) => sum + order.totalAmount, 0)}
                  </p>
                </div>
                <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-2">
                  <p className="text-xs text-neutral-500">Ödenen</p>
                  <p className="text-xl font-bold text-[#00E676] mt-0.5">
                    ₺{tableOrders.reduce((sum, order) => {
                      const paidTotal = order.orderItems
                        .filter(item => item.isPaid)
                        .reduce((itemSum, item) => itemSum + item.price, 0);
                      return sum + paidTotal;
                    }, 0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {tableOrders.length === 0 ? (
              <div className="text-center text-neutral-600 mt-20">
                <Clock className="w-16 h-16 mx-auto mb-4 text-neutral-700" />
                <p className="text-lg font-bold">Henüz sipariş yok</p>
                <p className="text-sm mt-2">Bu masaya ait sipariş bulunamadı</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center text-neutral-600 mt-20">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-[#00E676]" />
                <p className="text-lg font-bold text-[#00E676]">Tüm siparişler ödendi</p>
                <p className="text-sm mt-2 text-neutral-500">Aktif sipariş bulunmuyor</p>
              </div>
            ) : (
              <>
                {/* Active Orders Section - Combined View */}
                {(() => {
                  const allActiveItems = groupAllOrderItems(activeOrders);
                  const totalActiveAmount = activeOrders.reduce((sum, order) => sum + order.totalAmount, 0);
                  const totalPaidAmount = activeOrders.reduce((sum, order) => {
                    const paidTotal = order.orderItems
                      .filter(item => item.isPaid)
                      .reduce((itemSum, item) => itemSum + item.price, 0);
                    return sum + paidTotal;
                  }, 0);
                  const totalRemainingAmount = totalActiveAmount - totalPaidAmount;
                  const totalPaidItemsCount = activeOrders.reduce((sum, order) => 
                    sum + order.orderItems.filter(item => item.isPaid).length, 0
                  );
                  const totalItemsCount = activeOrders.reduce((sum, order) => 
                    sum + order.orderItems.length, 0
                  );

                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#FF9100]/30">
                        <div className="w-2 h-2 bg-[#FF9100] rounded-full animate-pulse"></div>
                        <h3 className="font-bold text-sm tracking-wider text-[#FF9100]">AKTİF SİPARİŞLER</h3>
                        <span className="text-xs text-neutral-500">({activeOrders.length})</span>
                      </div>
                      
                      <div className="bg-[#2C2C2C] rounded-lg p-3 border-2 border-[#FF9100]/30">
                        {/* Sipariş Notları - Her sipariş için göster */}
                        {activeOrders.map(order => 
                          order.orderNote ? (
                            <div key={`note-${order.id}`} className="mb-3 p-2.5 bg-[#FFD600]/10 border border-[#FFD600]/30 rounded-lg">
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-[#FFD600]">📝</span>
                                <div className="flex-1">
                                  <p className="text-xs text-[#FFD600] font-bold mb-0.5">Sipariş Notu:</p>
                                  <p className="text-xs text-white leading-relaxed">{order.orderNote}</p>
                                  <p className="text-xs text-neutral-500 mt-1">{order.time}</p>
                                </div>
                              </div>
                            </div>
                          ) : null
                        )}
                        
                        {/* All Items - Individual with Delete Button */}
                        <div className="space-y-1.5 mb-3">
                          {activeOrders.flatMap(order => 
                            order.orderItems
                              .filter(item => !item.isPaid)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-2 rounded transition-all bg-[#1E1E1E] border border-[#333333] hover:border-[#FF1744] group"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-500 flex-shrink-0" />
                                    <span className="text-xs text-white">
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-[#00E676]">
                                      ₺{item.price}
                                    </span>
                                    <button
                                      onClick={() => setDeleteConfirmItem({ id: item.id, name: item.name, price: item.price })}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#FF1744]/20 rounded"
                                      title="Ürünü Sil"
                                    >
                                      <Trash2 className="w-3 h-3 text-[#FF1744]" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                          
                          {/* Paid items - grouped */}
                          {(() => {
                            const paidItems = groupAllOrderItems(activeOrders).filter(item => item.isPaid);
                            return paidItems.map((item, idx) => (
                              <div
                                key={`paid-${item.name}-${idx}`}
                                className="flex items-center justify-between p-2 rounded transition-all bg-[#00E676]/10 border border-[#00E676]/30"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E676] flex-shrink-0" />
                                  <span className="text-xs text-neutral-400 line-through">
                                    {item.quantity > 1 && <span className="font-bold mr-1">{item.quantity}x</span>}
                                    {item.name}
                                  </span>
                                </div>
                                <span className="font-bold text-xs ml-2 text-neutral-500">
                                  ₺{item.totalPrice}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Summary Footer */}
                        <div className="pt-3 border-t border-[#333333] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-500">Toplam Tutar:</span>
                            <span className="font-bold text-sm text-white">₺{totalActiveAmount}</span>
                          </div>
                          {totalPaidAmount > 0 && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-[#00E676]">Ödenen:</span>
                                <span className="font-bold text-sm text-[#00E676]">₺{totalPaidAmount}</span>
                              </div>
                              {totalRemainingAmount > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[#FF1744]">Kalan:</span>
                                  <span className="font-bold text-sm text-[#FF1744]">₺{totalRemainingAmount}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#444444]">
                            <span className="text-xs text-neutral-400">
                              {totalPaidItemsCount}/{totalItemsCount} ürün
                            </span>
                            <div className="h-2 w-20 bg-[#1E1E1E] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#00E676] to-[#00C853] transition-all"
                                style={{ width: `${(totalPaidItemsCount / totalItemsCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          tableNumber={tableNumber}
          tableId={tableId}
          orders={orders}
          currentBill={currentBill}
          onClose={() => setShowPaymentModal(false)}
          onPartialPayment={handlePartialPaymentComplete}
          onFullPayment={handleFullPaymentComplete}
          onWasteItems={handleWasteComplete}
        />
      )}

      {showTransferModal && (() => {
        const currentTable = tables.find(t => t.id === tableId);
        const unpaidItems = orders
          .filter(order => order.tableNumber === tableNumber)
          .flatMap(order => order.orderItems.filter(item => !item.isPaid));
        
        return currentTable ? (
          <TableTransferModal
            sourceTable={currentTable}
            sourceTableNumber={tableNumber}
            allTables={tables}
            orderItems={unpaidItems}
            onClose={() => setShowTransferModal(false)}
            onTransfer={(targetTableId, selectedItemIds) => {
              // Transfer logic will be handled by App.tsx
              onTableTransfer(tableId, targetTableId, selectedItemIds);
              setShowTransferModal(false);
            }}
          />
        ) : null;
      })()}

      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[60] p-8">
          <div className="bg-[#1E1E1E] rounded-lg border-2 border-[#FF1744] w-full max-w-2xl shadow-2xl shadow-[#FF1744]/50">
            <div className="p-6">
              <h3 className="font-bold text-2xl text-[#FF1744] mb-2">ÜRÜN İPTAL SEBEBİ</h3>
              <p className="text-neutral-400 text-sm mb-2">
                <span className="font-bold text-white">{deleteConfirmItem.name}</span> ürününü iptal ediyorsunuz
              </p>
              <p className="text-neutral-500 text-xs mb-6">Lütfen iptal etme sebebini seçin veya girin</p>
              
              <div className="space-y-3">
                {[
                  'Yanlış sipariş',
                  'Müşteri iptali',
                  'Diğer'
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setDeleteReason(reason)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      deleteReason === reason
                        ? 'bg-[#FF1744]/10 border-[#FF1744] text-white'
                        : 'bg-[#2C2C2C] border-[#444444] text-neutral-300 hover:border-[#FF1744]/50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              
              {deleteReason === 'Diğer' && (
                <div className="mt-4">
                  <label className="text-neutral-400 text-sm mb-2 block">Özel Sebep:</label>
                  <input
                    type="text"
                    value={customDeleteReason}
                    onChange={(e) => setCustomDeleteReason(e.target.value)}
                    placeholder="İptal sebebini yazın..."
                    className="w-full bg-[#121212] border-2 border-[#444444] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF1744] transition-colors"
                    autoFocus
                  />
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setDeleteConfirmItem(null);
                    setDeleteReason('');
                    setCustomDeleteReason('');
                  }}
                  className="flex-1 py-3 bg-[#2C2C2C] hover:bg-[#333333] text-neutral-300 rounded-lg font-bold transition-colors"
                >
                  İPTAL
                </button>
                <button
                  onClick={() => {
                    const finalReason = deleteReason === 'Diğer' ? customDeleteReason : deleteReason;
                    if (finalReason.trim()) {
                      onDeleteOrderItem(tableId, deleteConfirmItem.id, finalReason);
                      setDeleteConfirmItem(null);
                      setDeleteReason('');
                      setCustomDeleteReason('');
                    }
                  }}
                  disabled={!deleteReason || (deleteReason === 'Diğer' && !customDeleteReason.trim())}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    deleteReason && (deleteReason !== 'Diğer' || customDeleteReason.trim())
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
    </>
  );
}