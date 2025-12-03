import { useState, useEffect } from 'react';
import { DashboardScreen } from './components/DashboardScreen';
import { OrderEntryScreen } from './components/OrderEntryScreen';
import { ReportScreen } from './components/ReportScreen';
import { TransactionHistoryScreen } from './components/TransactionHistoryScreen';
import { InventoryScreen, InventoryProduct } from './components/InventoryScreenNew';
import { BackupScreen, createBackup } from './components/BackupScreen';
import { ProductManagementScreen } from './components/ProductManagementScreenV2';
import { CategorySettings } from './components/CategoryManagement';
import { Ingredient } from './types/inventory';
import { Menu, LayoutDashboard, FileText, History, Package, Shield, ShoppingBag } from 'lucide-react';
import { Toaster } from 'sonner@2.0.3';
import { toast } from 'sonner';

type Screen = 'dashboard' | 'order' | 'report' | 'history' | 'inventory' | 'backup' | 'products';

export interface Table {
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

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  isPaid: boolean;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: string; // Keep for backward compatibility display
  orderItems: OrderItem[];
  status: 'preparing' | 'served';
  time: string;
  timestamp: number;
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'split';
  cashAmount?: number;
  cardAmount?: number;
  isTransfer?: boolean;
  transferFrom?: number;
  transferTo?: number;
  orderNote?: string; // Sipariş notu
}

export interface Payment {
  id: string;
  tableNumber: number;
  tableId: string;
  totalAmount: number;
  cashAmount: number;
  cardAmount: number;
  isPartial: boolean;
  timestamp: number;
  time: string;
}

export interface WasteItem {
  id: string;
  name: string;
  price: number;
  tableNumber: number;
  timestamp: number;
  time: string;
  reason: string; // İptal sebebi
  type: 'waste' | 'delete'; // waste: ZAYİ/FİRE, delete: Aktif sipariş iptali
}

export interface Transaction {
  id: string;
  type: 'payment' | 'order' | 'waste' | 'delete';
  timestamp: number;
  time: string;
  date: string;
  description: string;
  amount: number;
  tableNumber: number;
  details: string;
  wastes?: WasteItem[];
}

// Varsayılan ürünler
const defaultProducts = [
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

// Varsayılan Hammaddeler (İçerikler) - Kokteyller için (SADECE ALKOL)
const defaultIngredients: Ingredient[] = [
  // Alkol Bazlı İçerikler
  { id: 'ing-vodka', name: 'ABSOLUT VOTKA', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Pernod Ricard', lastRestocked: '01.12.2024', price: 2.5, type: 'alcohol' },
  { id: 'ing-rum', name: 'BACARDI ROM', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Bacardi', lastRestocked: '01.12.2024', price: 2.2, type: 'alcohol' },
  { id: 'ing-gin', name: 'GORDONS GIN', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Diageo', lastRestocked: '01.12.2024', price: 2.4, type: 'alcohol' },
  { id: 'ing-tequila', name: 'JOSE CUERVO TEKİLA', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Jose Cuervo', lastRestocked: '01.12.2024', price: 2.8, type: 'alcohol' },
  { id: 'ing-whiskey', name: 'JACK DANIELS WHISKEY', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Brown-Forman', lastRestocked: '01.12.2024', price: 3.5, type: 'alcohol' },
  { id: 'ing-aperol', name: 'APEROL', currentStock: 700, minStock: 350, unit: 'cl', supplier: 'Campari Group', lastRestocked: '01.12.2024', price: 2.0, type: 'alcohol' },
  { id: 'ing-campari', name: 'CAMPARI', currentStock: 350, minStock: 175, unit: 'cl', supplier: 'Campari Group', lastRestocked: '01.12.2024', price: 2.3, type: 'alcohol' },
  { id: 'ing-triple-sec', name: 'TRIPLE SEC', currentStock: 350, minStock: 175, unit: 'cl', supplier: 'Bols', lastRestocked: '30.11.2024', price: 1.8, type: 'alcohol' },
  { id: 'ing-coconut-rum', name: 'MALIBU (HİNDİSTAN CEVİZİ ROM)', currentStock: 350, minStock: 175, unit: 'cl', supplier: 'Pernod Ricard', lastRestocked: '30.11.2024', price: 2.1, type: 'alcohol' },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([
    // 1. Bar Tables - 4 circular tables arranged vertically (immediately to the right of 'Bar Alanı')
    { id: 'bar1', name: 'Bar 1', type: 'round', occupied: false, position: { x: 146, y: 40 } },
    { id: 'bar2', name: 'Bar 2', type: 'round', occupied: false, position: { x: 146, y: 155 } },
    { id: 'bar3', name: 'Bar 3', type: 'round', occupied: false, position: { x: 146, y: 270 } },
    { id: 'bar4', name: 'Bar 4', type: 'round', occupied: false, position: { x: 146, y: 385 } },
    
    // 2. Bistro Tables - 4 square tables arranged horizontally (top row, to the right of Bar tables)
    { id: 'bistro1', name: 'Bistro 1', type: 'square', occupied: false, position: { x: 286, y: 40 } },
    { id: 'bistro2', name: 'Bistro 2', type: 'square', occupied: false, position: { x: 401, y: 40 } },
    { id: 'bistro3', name: 'Bistro 3', type: 'square', occupied: false, position: { x: 516, y: 40 } },
    { id: 'bistro4', name: 'Bistro 4', type: 'square', occupied: false, position: { x: 631, y: 40 } },
    
    // 3. Middle Tables - 4 rectangular tables arranged horizontally (middle row, below Bistro row)
    { id: 'orta1', name: 'Orta 1', type: 'rectangle', occupied: false, position: { x: 286, y: 170 } },
    { id: 'orta2', name: 'Orta 2', type: 'rectangle', occupied: false, position: { x: 441, y: 170 } },
    { id: 'orta3', name: 'Orta 3', type: 'rectangle', occupied: false, position: { x: 596, y: 170 } },
    { id: 'orta4', name: 'Orta 4', type: 'rectangle', occupied: false, position: { x: 751, y: 170 } },
    
    // 4. Wall Tables - 3 rectangular tables arranged horizontally (bottom row, below Middle row)
    { id: 'duvar1', name: 'Duvar 1', type: 'rectangle', occupied: false, position: { x: 286, y: 300 } },
    { id: 'duvar2', name: 'Duvar 2', type: 'rectangle', occupied: false, position: { x: 441, y: 300 } },
    { id: 'duvar3', name: 'Duvar 3', type: 'rectangle', occupied: false, position: { x: 596, y: 300 } },
  ]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wastes, setWastes] = useState<WasteItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Products State - Ürün Yönetimi için
  const [products, setProducts] = useState<any[]>(defaultProducts);
  
  // Categories State
  const [categories, setCategories] = useState<string[]>(['biralar', 'kokteyller', 'atistirmalik']);
  
  // Category Settings State
  const [categorySettings, setCategorySettings] = useState<{ [key: string]: CategorySettings }>({
    biralar: { showInMenu: true, showInInventory: true, requiresIngredients: false },
    kokteyller: { showInMenu: true, showInInventory: true, requiresIngredients: true },
    atistirmalik: { showInMenu: true, showInInventory: true, requiresIngredients: false }
  });
  
  // Inventory State - TÜM KATEGORİLER
  const [inventory, setInventory] = useState<InventoryProduct[]>([
    // Biralar
    { id: 'b1', name: 'EFES PİLSEN', category: 'biralar', currentStock: 48, minStock: 24, unit: 'adet', supplier: 'Anadolu Efes', lastRestocked: '01.12.2024', price: 45 },
    { id: 'b2', name: 'BOMONTİ', category: 'biralar', currentStock: 36, minStock: 24, unit: 'adet', supplier: 'Anadolu Efes', lastRestocked: '01.12.2024', price: 50 },
    { id: 'b3', name: 'TUBORG', category: 'biralar', currentStock: 42, minStock: 24, unit: 'adet', supplier: 'Anadolu Efes', lastRestocked: '01.12.2024', price: 45 },
    { id: 'b4', name: 'CORONA', category: 'biralar', currentStock: 18, minStock: 12, unit: 'adet', supplier: 'AB InBev', lastRestocked: '30.11.2024', price: 65 },
    { id: 'b5', name: 'HEINEKEN', category: 'biralar', currentStock: 24, minStock: 18, unit: 'adet', supplier: 'Heineken Turkey', lastRestocked: '01.12.2024', price: 60 },
    { id: 'b6', name: 'CARLSBERG', category: 'biralar', currentStock: 30, minStock: 18, unit: 'adet', supplier: 'Carlsberg Turkey', lastRestocked: '29.11.2024', price: 55 },
    { id: 'b7', name: 'AMSTERDAM', category: 'biralar', currentStock: 12, minStock: 12, unit: 'adet', supplier: 'AB InBev', lastRestocked: '28.11.2024', price: 70 },
    { id: 'b8', name: 'MILLER', category: 'biralar', currentStock: 15, minStock: 12, unit: 'adet', supplier: 'Molson Coors', lastRestocked: '30.11.2024', price: 58 },
    { id: 'b9', name: 'BECKs', category: 'biralar', currentStock: 20, minStock: 12, unit: 'adet', supplier: 'AB InBev', lastRestocked: '01.12.2024', price: 62 },
    
    // Kokteyller
    { id: 'c1', name: 'MOJİTO', category: 'kokteyller', currentStock: 15, minStock: 8, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '01.12.2024', price: 85 },
    { id: 'c2', name: 'MARGARİTA', category: 'kokteyller', currentStock: 12, minStock: 8, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '01.12.2024', price: 90 },
    { id: 'c3', name: 'COSMOPOLİTAN', category: 'kokteyller', currentStock: 10, minStock: 6, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '30.11.2024', price: 95 },
    { id: 'c4', name: 'LONG ISLAND', category: 'kokteyller', currentStock: 8, minStock: 5, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '01.12.2024', price: 110 },
    { id: 'c5', name: 'PIÑA COLADA', category: 'kokteyller', currentStock: 14, minStock: 8, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '01.12.2024', price: 100 },
    { id: 'c6', name: 'OLD FASHIONED', category: 'kokteyller', currentStock: 11, minStock: 6, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '30.11.2024', price: 105 },
    { id: 'c7', name: 'NEGRONI', category: 'kokteyller', currentStock: 9, minStock: 5, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '29.11.2024', price: 98 },
    { id: 'c8', name: 'APEROL SPRITZ', category: 'kokteyller', currentStock: 13, minStock: 8, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '01.12.2024', price: 88 },
    { id: 'c9', name: 'WHISKEY SOUR', category: 'kokteyller', currentStock: 10, minStock: 6, unit: 'porsiyon', supplier: 'Bar Stok', lastRestocked: '30.11.2024', price: 92 },
    
    // Atıştırmalıklar
    { id: 'f1', name: 'ÇITIR TAVUK KANAT', category: 'atistirmalik', currentStock: 25, minStock: 12, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '02.12.2024', price: 75 },
    { id: 'f2', name: 'NACHOS SUPREME', category: 'atistirmalik', currentStock: 20, minStock: 10, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '02.12.2024', price: 65 },
    { id: 'f3', name: 'BBQ KABURGA', category: 'atistirmalik', currentStock: 15, minStock: 8, unit: 'porsiyon', supplier: 'Et Tedarikçisi', lastRestocked: '02.12.2024', price: 120 },
    { id: 'f4', name: 'SEZAR SALATA', category: 'atistirmalik', currentStock: 18, minStock: 10, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '03.12.2024', price: 55 },
    { id: 'f5', name: 'MARGHERİTA PİZZA', category: 'atistirmalik', currentStock: 22, minStock: 12, unit: 'adet', supplier: 'Hamur Tedarik', lastRestocked: '02.12.2024', price: 95 },
    { id: 'f6', name: 'DANA BURGER', category: 'atistirmalik', currentStock: 20, minStock: 10, unit: 'adet', supplier: 'Et Tedarikçisi', lastRestocked: '02.12.2024', price: 85 },
    { id: 'f7', name: 'PATATES KIZARTMASI', category: 'atistirmalik', currentStock: 30, minStock: 15, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '03.12.2024', price: 40 },
    { id: 'f8', name: 'SOĞAN HALKASI', category: 'atistirmalik', currentStock: 25, minStock: 12, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '03.12.2024', price: 45 },
    { id: 'f9', name: 'MEZE TABAĞI', category: 'atistirmalik', currentStock: 18, minStock: 10, unit: 'porsiyon', supplier: 'Mutfak Tedarik', lastRestocked: '02.12.2024', price: 70 },
  ]);

  // Ingredients State - Hammaddeler (Kokteyller için)
  const [ingredients, setIngredients] = useState<Ingredient[]>(defaultIngredients);

  // Yeni ürünler eklendiğinde inventory'ye ekle (TÜM KATEGORİLER)
  useEffect(() => {
    const handleProductsUpdate = () => {
      const storedProducts = localStorage.getItem('pos_products');
      if (storedProducts) {
        try {
          const products = JSON.parse(storedProducts);
          
          // Products state'ini güncelle (Menü ve Ürün Yönetimi için)
          setProducts(products);
          console.log('🔍 Tüm ürünler state\'e kaydedildi:', products);
          
          // TÜM KATEGORİLERİ al
          const allCategoryProducts = products.filter((p: any) => 
            p.category === 'biralar' || p.category === 'kokteyller' || p.category === 'atistirmalik'
          );
          
          console.log('📦 Tüm kategori ürünleri:', allCategoryProducts);
          
          // Inventory'deki mevcut ürünleri güncelle (stok, fiyat, tedarikçi vb.)
          const updatedInventory = inventory.map(invItem => {
            const matchingProduct = allCategoryProducts.find((p: any) => p.id === invItem.id);
            if (matchingProduct) {
              console.log(`🔄 Güncelleniyor: ${invItem.name}`, {
                eskiStok: invItem.currentStock,
                yeniStok: matchingProduct.currentStock,
                eskiMinStok: invItem.minStock,
                yeniMinStok: matchingProduct.minStock,
                eskiFiyat: invItem.price,
                yeniFiyat: matchingProduct.price,
                eskiTedarikçi: invItem.supplier,
                yeniTedarikçi: matchingProduct.supplier
              });
              
              return {
                ...invItem,
                // Ürün yönetiminden gelen değerler varsa kullan, yoksa mevcut değeri koru
                currentStock: matchingProduct.currentStock !== undefined ? matchingProduct.currentStock : invItem.currentStock,
                minStock: matchingProduct.minStock !== undefined ? matchingProduct.minStock : invItem.minStock,
                price: matchingProduct.price !== undefined ? matchingProduct.price : invItem.price,
                supplier: matchingProduct.supplier || invItem.supplier,
                unit: matchingProduct.unit || invItem.unit
              };
            }
            return invItem;
          });
          
          // Inventory'de olmayan yeni ürünleri bul (TÜM KATEGORİLER)
          const newProducts = allCategoryProducts.filter((product: any) => 
            !inventory.find(inv => inv.id === product.id)
          );
          
          if (newProducts.length > 0 || JSON.stringify(updatedInventory) !== JSON.stringify(inventory)) {
            console.log('📦 Yeni ürünler ekleniyor inventory\'ye:', newProducts);
            
            // Yeni ürünleri inventory formatına dönüştür
            const newInventoryItems: InventoryProduct[] = newProducts.map((product: any) => {
              // Kategoriye göre varsayılan değerler
              let defaultStock = 20;
              let defaultMinStock = 10;
              let defaultUnit = 'adet';
              let defaultSupplier = 'Tedarikçi Belirlenmedi';
              
              if (product.category === 'biralar') {
                defaultStock = 24;
                defaultMinStock = 12;
                defaultUnit = 'adet';
                defaultSupplier = 'Bira Tedarikçisi';
              } else if (product.category === 'kokteyller') {
                defaultStock = 12;
                defaultMinStock = 6;
                defaultUnit = 'porsiyon';
                defaultSupplier = 'Bar Stok';
              } else if (product.category === 'atistirmalik') {
                defaultStock = 20;
                defaultMinStock = 10;
                defaultUnit = 'porsiyon';
                defaultSupplier = 'Mutfak Tedarik';
              }
              
              return {
                id: product.id,
                name: product.name,
                category: product.category as 'biralar' | 'kokteyller' | 'atistirmalik',
                currentStock: product.currentStock || defaultStock,
                minStock: product.minStock || defaultMinStock,
                unit: product.unit || defaultUnit,
                supplier: product.supplier || defaultSupplier,
                lastRestocked: new Date().toLocaleDateString('tr-TR'),
                price: product.price
              };
            });
            
            // Inventory'yi güncelle - hem mevcut ürünleri güncelle hem yeni ürünleri ekle
            setInventory([...updatedInventory, ...newInventoryItems]);
            
            if (newProducts.length > 0) {
              toast.success('Yeni ürünler stok takibine eklendi!', {
                description: `${newProducts.map((p: any) => p.name).join(', ')}`
              });
            }
          }
        } catch (error) {
          console.error('Ürünler yüklenirken hata:', error);
        }
      }
    };
    
    // Event listener ekle
    window.addEventListener('products-updated', handleProductsUpdate);
    
    // İlk yüklemede de kontrol et
    handleProductsUpdate();
    
    // Cleanup
    return () => {
      window.removeEventListener('products-updated', handleProductsUpdate);
    };
  }, [inventory]); // inventory dependency olarak eklendi

  const handleUpdateStock = (productId: string, newStock: number) => {
    console.log('📦 handleUpdateStock çağrıldı (App.tsx)');
    console.log('  - productId:', productId);
    console.log('  - newStock:', newStock);
    console.log('  - Mevcut inventory:', inventory.map(p => ({ id: p.id, name: p.name, stock: p.currentStock })));
    
    // Inventory'yi güncelle
    setInventory(inventory.map(product =>
      product.id === productId
        ? { ...product, currentStock: newStock, lastRestocked: new Date().toLocaleDateString('tr-TR') }
        : product
    ));
    
    // Products state'ini de güncelle (Ürün Yönetimi için)
    const updatedProducts = products.map(product =>
      product.id === productId
        ? { ...product, currentStock: newStock }
        : product
    );
    setProducts(updatedProducts);
    
    // localStorage'a kaydet
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));
    
    console.log('✅ Inventory ve Products güncellendi');
  };

  const handleUpdateMinStock = (productId: string, newMinStock: number) => {
    setInventory(inventory.map(product =>
      product.id === productId
        ? { ...product, minStock: newMinStock }
        : product
    ));
  };

  const handleTableClick = (tableId: string) => {
    setSelectedTableId(tableId);
    setCurrentScreen('order');
  };

  const handleAddOrder = (tableNumber: number, items: string, totalAmount: number, orderItems: OrderItem[], orderNote?: string) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      tableNumber,
      items,
      orderItems,
      status: 'preparing',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      totalAmount,
      orderNote: orderNote || undefined, // Sipariş notunu ekle
    };
    setOrders([...orders, newOrder]);

    // Update table bill
    setTables(tables.map(t => 
      t.id === selectedTableId 
        ? { ...t, occupied: true, reserved: false, currentBill: (t.currentBill || 0) + totalAmount }
        : t
    ));

    // STOK DÜŞÜRME: Sipariş verilen ürünleri stoktan düş
    const updatedInventory = [...inventory];
    const updatedIngredients = [...ingredients];
    let stockError = '';
    
    orderItems.forEach(orderItem => {
      // Ürünü products'tan bul
      const product = products.find(p => p.name === orderItem.name);
      
      if (product && product.isCocktail && product.recipe) {
        // KOKTEYL: Reçete bazlı stok düşümü
        console.log(`🍹 Kokteyl sipariş: ${product.name}`);
        
        product.recipe.forEach(recipeItem => {
          const ingredientIndex = updatedIngredients.findIndex(ing => ing.id === recipeItem.ingredientId);
          
          if (ingredientIndex !== -1) {
            const ingredient = updatedIngredients[ingredientIndex];
            const requiredAmount = recipeItem.amount;
            
            console.log(`  - ${ingredient.name}: ${requiredAmount}${ingredient.unit} kullanılacak (Mevcut: ${ingredient.currentStock}${ingredient.unit})`);
            
            // Stok kontrolü
            if (ingredient.currentStock < requiredAmount) {
              stockError = `${ingredient.name} stoğu yetersiz! (Gerekli: ${requiredAmount}${ingredient.unit}, Mevcut: ${ingredient.currentStock}${ingredient.unit})`;
              return;
            }
            
            // Stoğu düş
            updatedIngredients[ingredientIndex] = {
              ...ingredient,
              currentStock: Math.max(0, ingredient.currentStock - requiredAmount)
            };
            
            console.log(`  ✅ ${ingredient.name} stok güncellendi: ${ingredient.currentStock}${ingredient.unit} -> ${updatedIngredients[ingredientIndex].currentStock}${ingredient.unit}`);
          } else {
            console.warn(`  ⚠️ İçerik bulunamadı: ${recipeItem.ingredientId}`);
          }
        });
      } else {
        // BİRA/ATIŞTIRMALIK: Adet bazlı stok düşümü
        const productIndex = updatedInventory.findIndex(p => p.name === orderItem.name);
        if (productIndex !== -1) {
          const currentProduct = updatedInventory[productIndex];
          console.log(`🍺 Adet bazlı sipariş: ${currentProduct.name} (Mevcut: ${currentProduct.currentStock} ${currentProduct.unit})`);
          
          // Stok kontrolü
          if (currentProduct.currentStock < 1) {
            stockError = `${currentProduct.name} stoğu yetersiz!`;
            return;
          }
          
          updatedInventory[productIndex] = {
            ...currentProduct,
            currentStock: Math.max(0, currentProduct.currentStock - 1)
          };
          
          console.log(`  ✅ ${currentProduct.name} stok güncellendi: ${currentProduct.currentStock} -> ${updatedInventory[productIndex].currentStock}`);
        }
      }
    });
    
    // Eğer stok hatası varsa siparişi engelle
    if (stockError) {
      toast.error('Stok Yetersiz!', {
        description: stockError
      });
      return;
    }
    
    setInventory(updatedInventory);
    setIngredients(updatedIngredients);
  };

  const handlePartialPayment = (tableId: string, paidAmount: number, cashAmount: number, cardAmount: number, selectedItemIds: string[]) => {
    const table = tables.find(t => t.id === tableId);
    if (table) {
      let newBillAmount = table.currentBill || 0;
      
      // If specific items are selected, mark them as paid
      if (selectedItemIds.length > 0) {
        const updatedOrders = orders.map(order => {
          if (order.tableNumber === tableNumber) {
            return {
              ...order,
              orderItems: order.orderItems.map(item => 
                selectedItemIds.includes(item.id) ? { ...item, isPaid: true } : item
              )
            };
          }
          return order;
        });
        
        setOrders(updatedOrders);

        // Update table bill - subtract the full paid amount
        newBillAmount = Math.max(0, (table.currentBill || 0) - paidAmount);
        
        // Check if there are any unpaid items left
        const remainingUnpaidItems = updatedOrders
          .filter(order => order.tableNumber === tableNumber)
          .flatMap(order => order.orderItems)
          .filter(item => !item.isPaid);
        
        // If no unpaid items remain, close the table
        if (remainingUnpaidItems.length === 0) {
          newBillAmount = 0;
        }
      } else {
        // Traditional partial payment - just reduce the bill amount
        if (table.currentBill) {
          newBillAmount = table.currentBill - paidAmount;
          newBillAmount = newBillAmount > 0 ? newBillAmount : 0;
        }
      }

      // If bill is 0, mark all unpaid items as paid
      if (newBillAmount === 0) {
        setOrders(orders.map(order => {
          if (order.tableNumber === tableNumber) {
            return {
              ...order,
              orderItems: order.orderItems.map(item => ({ ...item, isPaid: true }))
            };
          }
          return order;
        }));
      }

      // Update table - if bill is 0, mark as unoccupied
      setTables(tables.map(t => 
        t.id === tableId 
          ? { 
              ...t, 
              currentBill: newBillAmount,
              occupied: newBillAmount > 0 ? t.occupied : false,
              guests: newBillAmount > 0 ? t.guests : undefined
            }
          : t
      ));

      const newPayment: Payment = {
        id: Date.now().toString(),
        tableNumber: tableNumber,
        tableId: tableId,
        totalAmount: paidAmount,
        cashAmount: cashAmount,
        cardAmount: cardAmount,
        isPartial: true,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setPayments([...payments, newPayment]);
    }
  };

  const handleFullPayment = (tableId: string, cashAmount: number, cardAmount: number) => {
    const table = tables.find(t => t.id === tableId);
    if (table && table.currentBill) {
      const totalAmount = table.currentBill;
      
      // Mark all unpaid items for this table as paid
      setOrders(orders.map(order => {
        if (order.tableNumber === tableNumber) {
          return {
            ...order,
            orderItems: order.orderItems.map(item => ({ ...item, isPaid: true }))
          };
        }
        return order;
      }));
      
      setTables(tables.map(t => 
        t.id === tableId 
          ? { ...t, occupied: false, currentBill: 0, guests: undefined }
          : t
      ));

      const newPayment: Payment = {
        id: Date.now().toString(),
        tableNumber: tableNumber,
        tableId: tableId,
        totalAmount: totalAmount,
        cashAmount: cashAmount,
        cardAmount: cardAmount,
        isPartial: false,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };
      setPayments([...payments, newPayment]);
    }
  };

  const handleTableTransfer = (sourceTableId: string, targetTableId: string, selectedItemIds: string[]) => {
    const sourceTable = tables.find(t => t.id === sourceTableId);
    const targetTable = tables.find(t => t.id === targetTableId);
    
    if (!sourceTable || !targetTable || selectedItemIds.length === 0) return;

    const sourceTableNumber = getTableNumber(sourceTable.id);
    const targetTableNumber = getTableNumber(targetTable.id);

    // Count total unpaid items in source table
    const totalUnpaidItems = orders
      .filter(order => order.tableNumber === sourceTableNumber)
      .flatMap(order => order.orderItems)
      .filter(item => !item.isPaid);

    const isFullTransfer = selectedItemIds.length === totalUnpaidItems.length;

    if (isFullTransfer) {
      // FULL TRANSFER: Just change the tableNumber of all orders from source to target
      const updatedOrders = orders.map(order => {
        if (order.tableNumber === sourceTableNumber) {
          return {
            ...order,
            tableNumber: targetTableNumber,
            isTransfer: true,
            transferFrom: sourceTableNumber,
            transferTo: targetTableNumber,
            timestamp: Date.now(), // Update timestamp to show as new in feed
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          };
        }
        return order;
      });

      setOrders(updatedOrders);

      // Update tables
      setTables(tables.map(t => {
        if (t.id === sourceTableId) {
          return {
            ...t,
            currentBill: 0,
            occupied: false,
            guests: undefined
          };
        }
        if (t.id === targetTableId) {
          return {
            ...t,
            currentBill: (t.currentBill || 0) + (sourceTable.currentBill || 0),
            occupied: true
          };
        }
        return t;
      }));
    } else {
      // PARTIAL TRANSFER: Create new order with selected items
      let transferredItems: OrderItem[] = [];
      let transferredAmount = 0;

      // Update orders: remove items from source table
      const updatedOrders = orders.map(order => {
        if (order.tableNumber === sourceTableNumber) {
          const remainingItems = order.orderItems.filter(item => {
            if (selectedItemIds.includes(item.id) && !item.isPaid) {
              transferredItems.push({ ...item });
              transferredAmount += item.price;
              return false; // Remove from source
            }
            return true; // Keep in source
          });

          return {
            ...order,
            orderItems: remainingItems,
            totalAmount: remainingItems.reduce((sum, item) => sum + item.price, 0)
          };
        }
        return order;
      });

      // Create new order for target table with transferred items
      if (transferredItems.length > 0) {
        const newOrder: Order = {
          id: Date.now().toString(),
          tableNumber: targetTableNumber,
          items: transferredItems.map(item => item.name).join(', '),
          orderItems: transferredItems,
          status: 'preparing',
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          totalAmount: transferredAmount,
          isTransfer: true,
          transferFrom: sourceTableNumber,
          transferTo: targetTableNumber
        };

        setOrders([...updatedOrders, newOrder]);

        // Update both tables' bills
        setTables(tables.map(t => {
          if (t.id === sourceTableId) {
            const newBill = Math.max(0, (t.currentBill || 0) - transferredAmount);
            return {
              ...t,
              currentBill: newBill,
              occupied: newBill > 0,
              guests: newBill > 0 ? t.guests : undefined
            };
          }
          if (t.id === targetTableId) {
            return {
              ...t,
              currentBill: (t.currentBill || 0) + transferredAmount,
              occupied: true
            };
          }
          return t;
        }));
      }
    }
  };

  const handleRevertTransaction = (transactionId: string) => {
    console.log('Reverting transaction:', transactionId);
    
    // Parse transaction ID to get type and ID
    const [type, id] = transactionId.split('-');
    
    if (type === 'payment') {
      // Find the payment to revert
      const payment = payments.find(p => p.id === id);
      if (!payment) {
        console.error('Payment not found:', id);
        return;
      }

      // Remove payment from payments array
      setPayments(payments.filter(p => p.id !== id));

      // Restore table bill and status
      const targetTableId = getTableId(payment.tableNumber);
      setTables(tables.map(table => {
        if (table.id === targetTableId) {
          const newBill = (table.currentBill || 0) + payment.totalAmount;
          
          // If this was a full payment (table was closed), reopen the table
          if (!payment.isPartial && !table.occupied) {
            // Find orders for this table that were marked as paid
            const tableOrders = orders.filter(o => o.tableNumber === payment.tableNumber);
            
            return {
              ...table,
              occupied: true,
              currentBill: newBill,
            };
          }
          
          // For partial payment, just add back the amount
          return {
            ...table,
            currentBill: newBill,
            occupied: true, // Make sure table stays occupied
          };
        }
        return table;
      }));

      // Unmark items as paid if this was a full payment
      if (!payment.isPartial) {
        setOrders(orders.map(order => {
          if (order.tableNumber === payment.tableNumber) {
            return {
              ...order,
              orderItems: order.orderItems.map(item => ({ ...item, isPaid: false }))
            };
          }
          return order;
        }));
      }
      
      console.log('Payment reverted successfully');
    } else if (type === 'order') {
      // Find the order to revert
      const order = orders.find(o => o.id === id);
      if (!order) {
        console.error('Order not found:', id);
        return;
      }

      // Remove order from orders array
      setOrders(orders.filter(o => o.id !== id));

      // Update table bill
      const targetTableId = getTableId(order.tableNumber);
      setTables(tables.map(table => {
        if (table.id === targetTableId) {
          const newBill = Math.max(0, (table.currentBill || 0) - order.totalAmount);
          
          return {
            ...table,
            currentBill: newBill,
            occupied: newBill > 0,
            guests: newBill > 0 ? table.guests : undefined,
          };
        }
        return table;
      }));
      
      console.log('Order reverted successfully');
    } else if (type === 'waste') {
      // Find the waste transaction to revert
      const wasteTransaction = transactions.find(t => t.id === id) as Transaction;
      if (!wasteTransaction) {
        console.error('Waste transaction not found:', id);
        return;
      }

      // Add back the waste items to orders
      const updatedOrders = orders.map(order => {
        if (order.tableNumber === wasteTransaction.tableNumber) {
          const remainingItems = order.orderItems.filter(
            item => !wasteTransaction.wastes?.some(waste => waste.name === item.name)
          );
          
          // If no items remain, return null to filter out this order
          if (remainingItems.length === 0) return null;
          
          return {
            ...order,
            orderItems: remainingItems,
            totalAmount: remainingItems.reduce((sum, item) => sum + item.price, 0),
            items: remainingItems.map(item => item.name).join(', ')
          };
        }
        return order;
      }).filter(order => order !== null) as Order[];

      setOrders(updatedOrders);

      // Remove waste items from wastes array
      setWastes(wastes.filter(waste => !wasteTransaction.wastes?.some(w => w.id === waste.id)));

      // Update table bill
      setTables(tables.map(t => {
        if (t.id === selectedTableId) {
          const newBill = Math.max(0, (t.currentBill || 0) + wasteTransaction.amount);
          return {
            ...t,
            currentBill: newBill,
            occupied: newBill > 0,
            guests: newBill > 0 ? t.guests : undefined
          };
        }
        return t;
      }));

      // Remove transaction from transactions array
      setTransactions(transactions.filter(t => t.id !== id));

      toast.success('Ürünler geri yüklendi', {
        description: `${wasteTransaction.wastes?.length} ürün geri yüklendi - Toplam: ₺${wasteTransaction.amount}`
      });
    } else if (type === 'delete') {
      // Find the delete transaction to revert
      const deleteTransaction = transactions.find(t => t.id === id) as Transaction;
      if (!deleteTransaction) {
        console.error('Delete transaction not found:', id);
        return;
      }

      // Add back the deleted item to orders
      const updatedOrders = orders.map(order => {
        if (order.tableNumber === deleteTransaction.tableNumber) {
          const remainingItems = order.orderItems.filter(
            item => item.name !== deleteTransaction.details.split(' ')[0]
          );
          
          // If no items remain, return null to filter out this order
          if (remainingItems.length === 0) return null;
          
          return {
            ...order,
            orderItems: remainingItems,
            totalAmount: remainingItems.reduce((sum, item) => sum + item.price, 0),
            items: remainingItems.map(item => item.name).join(', ')
          };
        }
        return order;
      }).filter(order => order !== null) as Order[];

      setOrders(updatedOrders);

      // Update table bill
      setTables(tables.map(t => {
        if (t.id === selectedTableId) {
          const newBill = Math.max(0, (t.currentBill || 0) + deleteTransaction.amount);
          return {
            ...t,
            currentBill: newBill,
            occupied: newBill > 0,
            reserved: newBill > 0 ? false : t.reserved,
            guests: newBill > 0 ? t.guests : undefined
          };
        }
        return t;
      }));

      // Stok geri ver (TÜM KATEGORİLER)
      if (deleteTransaction.details) {
        const deletedItemName = deleteTransaction.details.split(' ')[0];
        // Inventory'de bu ürün varsa stok geri ver
        const productExists = inventory.find(item => item.name === deletedItemName);
        if (productExists) {
          setInventory(inventory.map(item => {
            if (item.name === deletedItemName) {
              return {
                ...item,
                currentStock: item.currentStock + 1
              };
            }
            return item;
          }));
        }
      }

      // Remove transaction from transactions array
      setTransactions(transactions.filter(t => t.id !== id));

      toast.success('Ürün geri yüklendi', {
        description: `${deleteTransaction.details.split(' ')[0]} siparişine eklendi`
      });
    }
  };

  const handleRevertWaste = (wasteId: string) => {
    console.log('Reverting waste:', wasteId);
    
    // Find the waste item to revert
    const wasteItem = wastes.find(w => w.id === wasteId);
    if (!wasteItem) {
      console.error('Waste item not found:', wasteId);
      return;
    }

    // If it's a 'delete' type (active order cancellation), restore to orders
    if (wasteItem.type === 'delete') {
      // Find the table
      const targetTableId = getTableId(wasteItem.tableNumber);
      const table = tables.find(t => t.id === targetTableId);
      if (!table) {
        toast.error('Masa bulunamadı');
        return;
      }

      // Create a new order with the reverted item
      const newOrderItem = {
        id: `restored-${Date.now()}-${Math.random()}`,
        name: wasteItem.name,
        price: wasteItem.price,
        isPaid: false
      };

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        tableNumber: wasteItem.tableNumber,
        items: wasteItem.name,
        totalAmount: wasteItem.price,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        orderItems: [newOrderItem]
      };

      setOrders([...orders, newOrder]);

      // Update table bill
      const targetTableId2 = getTableId(wasteItem.tableNumber);
      setTables(tables.map(t => {
        if (t.id === targetTableId2) {
          const newBill = (t.currentBill || 0) + wasteItem.price;
          return {
            ...t,
            currentBill: newBill,
            occupied: true
          };
        }
        return t;
      }));

      // Restore stock (TÜM KATEGORİLER)
      const productExists = inventory.find(item => item.name === wasteItem.name);
      if (productExists) {
        setInventory(inventory.map(item => {
          if (item.name === wasteItem.name) {
            return {
              ...item,
              currentStock: item.currentStock + 1
            };
          }
          return item;
        }));
      }

      toast.success('İptal edilen ürün geri yüklendi', {
        description: `${wasteItem.name} Masa ${wasteItem.tableNumber}'e eklendi`
      });
    } else {
      // If it's a 'waste' type (zayi/fire), just restore to orders without changing stock
      const targetTableId3 = getTableId(wasteItem.tableNumber);
      const table = tables.find(t => t.id === targetTableId3);
      if (!table) {
        toast.error('Masa bulunamadı');
        return;
      }

      // Create a new order with the reverted item
      const newOrderItem = {
        id: `restored-${Date.now()}-${Math.random()}`,
        name: wasteItem.name,
        price: wasteItem.price,
        isPaid: false
      };

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        tableNumber: wasteItem.tableNumber,
        items: wasteItem.name,
        totalAmount: wasteItem.price,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        orderItems: [newOrderItem]
      };

      setOrders([...orders, newOrder]);

      // Update table bill
      const targetTableId4 = getTableId(wasteItem.tableNumber);
      setTables(tables.map(t => {
        if (t.id === targetTableId4) {
          const newBill = (t.currentBill || 0) + wasteItem.price;
          return {
            ...t,
            currentBill: newBill,
            occupied: true
          };
        }
        return t;
      }));

      toast.success('Zayi/Fire işlemi geri alındı', {
        description: `${wasteItem.name} Masa ${wasteItem.tableNumber}'e eklendi`
      });
    }

    // Remove the waste item
    setWastes(wastes.filter(w => w.id !== wasteId));
  };

  const handleWasteItems = (tableId: string, selectedItemIds: string[], reason: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || selectedItemIds.length === 0) return;

    let wasteAmount = 0;
    const newWasteItems: WasteItem[] = [];

    // Find and collect waste items
    const tableOrders = orders.filter(order => order.tableNumber === tableNumber);
    tableOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (selectedItemIds.includes(item.id) && !item.isPaid) {
          newWasteItems.push({
            id: `waste-${Date.now()}-${item.id}`,
            name: item.name,
            price: item.price,
            tableNumber: tableNumber,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            reason: reason, // İptal sebebi parametreden alınıyor
            type: 'waste' // ZAYİ/FİRE
          });
          wasteAmount += item.price;
        }
      });
    });

    // Remove waste items from orders
    const updatedOrders = orders.map(order => {
      if (order.tableNumber === tableNumber) {
        const remainingItems = order.orderItems.filter(
          item => !selectedItemIds.includes(item.id) || item.isPaid
        );
        
        // If no items remain, filter out this order
        if (remainingItems.length === 0) return null;
        
        return {
          ...order,
          orderItems: remainingItems,
          totalAmount: remainingItems.reduce((sum, item) => sum + item.price, 0),
          items: remainingItems.map(item => item.name).join(', ')
        };
      }
      return order;
    }).filter(order => order !== null) as Order[];

    setOrders(updatedOrders);
    setWastes([...wastes, ...newWasteItems]);

    // Update table bill
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newBill = Math.max(0, (t.currentBill || 0) - wasteAmount);
        return {
          ...t,
          currentBill: newBill,
          occupied: newBill > 0,
          guests: newBill > 0 ? t.guests : undefined
        };
      }
      return t;
    }));

    // Log transaction
    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      type: 'waste',
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('tr-TR'),
      description: `İptal - Masa ${tableNumber}`,
      amount: wasteAmount,
      tableNumber: tableNumber,
      details: newWasteItems.map(item => `${item.name} (₺${item.price}) - ${item.reason}`).join(', '),
      wastes: newWasteItems
    };
    setTransactions([transaction, ...transactions]);

    toast.success('Ürünler iptal edildi', {
      description: `${newWasteItems.length} ürün iptal edildi - Toplam: ₺${wasteAmount}`
    });
  };

  const handleDeleteOrderItem = (tableId: string, itemId: string, reason: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    let deletedItemPrice = 0;
    let deletedItemName = '';

    // Remove item from orders
    const updatedOrders = orders.map(order => {
      if (order.tableNumber === tableNumber) {
        const itemToDelete = order.orderItems.find(item => item.id === itemId);
        if (itemToDelete && !itemToDelete.isPaid) {
          deletedItemPrice = itemToDelete.price;
          deletedItemName = itemToDelete.name;
          
          const remainingItems = order.orderItems.filter(item => item.id !== itemId);
          
          // If no items remain, return null to filter out this order
          if (remainingItems.length === 0) return null;
          
          return {
            ...order,
            orderItems: remainingItems,
            totalAmount: remainingItems.reduce((sum, item) => sum + item.price, 0),
            items: remainingItems.map(item => item.name).join(', ')
          };
        }
      }
      return order;
    }).filter(order => order !== null) as Order[];

    setOrders(updatedOrders);
    
    // Add to wastes with reason
    if (deletedItemName && deletedItemPrice > 0) {
      const wasteItem: WasteItem = {
        id: `waste-${Date.now()}-${itemId}`,
        name: deletedItemName,
        price: deletedItemPrice,
        tableNumber: tableNumber,
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        reason: reason,
        type: 'delete' // Aktif sipariş iptali
      };
      setWastes([...wastes, wasteItem]);
    }

    // Update table bill
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newBill = Math.max(0, (t.currentBill || 0) - deletedItemPrice);
        return {
          ...t,
          currentBill: newBill,
          occupied: newBill > 0,
          reserved: newBill > 0 ? false : t.reserved,
          guests: newBill > 0 ? t.guests : undefined
        };
      }
      return t;
    }));

    // Stok geri ver (TÜM KATEGORİLER)
    if (deletedItemName) {
      // Inventory'de bu ürün varsa stok geri ver
      const productExists = inventory.find(item => item.name === deletedItemName);
      if (productExists) {
        setInventory(inventory.map(item => {
          if (item.name === deletedItemName) {
            return {
              ...item,
              currentStock: item.currentStock + 1
            };
          }
          return item;
        }));
      }
    }

    // Log transaction
    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      type: 'delete',
      timestamp: Date.now(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('tr-TR'),
      description: `Ürün Silme - Masa ${tableNumber}`,
      amount: deletedItemPrice,
      tableNumber: tableNumber,
      details: `${deletedItemName} (₺${deletedItemPrice}) - ${reason}`
    };
    setTransactions([transaction, ...transactions]);

    toast.success('Ürün silindi', {
      description: `${deletedItemName} siparişten çıkarıldı`
    });
  };

  // Helper: Convert table ID to unique table number
  const getTableNumber = (tableId: string): number => {
    const tableMap: Record<string, number> = {
      'bar1': 1, 'bar2': 2, 'bar3': 3, 'bar4': 4,
      'bistro1': 5, 'bistro2': 6, 'bistro3': 7, 'bistro4': 8,
      'orta1': 9, 'orta2': 10, 'orta3': 11, 'orta4': 12,
      'duvar1': 13, 'duvar2': 14, 'duvar3': 15
    };
    return tableMap[tableId] || 1;
  };

  // Helper: Convert table number back to table ID
  const getTableId = (tableNumber: number): string | null => {
    const reverseMap: Record<number, string> = {
      1: 'bar1', 2: 'bar2', 3: 'bar3', 4: 'bar4',
      5: 'bistro1', 6: 'bistro2', 7: 'bistro3', 8: 'bistro4',
      9: 'orta1', 10: 'orta2', 11: 'orta3', 12: 'orta4',
      13: 'duvar1', 14: 'duvar2', 15: 'duvar3'
    };
    return reverseMap[tableNumber] || null;
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const tableNumber = selectedTable ? getTableNumber(selectedTable.id) : 1;

  useEffect(() => {
    // Load data from localStorage on component mount
    const storedTables = localStorage.getItem('pos_tables');
    const storedOrders = localStorage.getItem('pos_orders');
    const storedPayments = localStorage.getItem('pos_payments');
    const storedWastes = localStorage.getItem('pos_wastes');
    const storedTransactions = localStorage.getItem('pos_transactions');
    const storedInventory = localStorage.getItem('pos_inventory');
    const storedIngredients = localStorage.getItem('pos_ingredients');
    const storedProducts = localStorage.getItem('pos_products');
    const storedCategories = localStorage.getItem('pos_categories');
    
    // ESKİ KEY'İ TEMİZLE - Artık kullanılmıyor
    const oldCategorySettings = localStorage.getItem('pos_categorySettings');
    if (oldCategorySettings) {
      console.log('🧹 Eski categorySettings key temizleniyor...');
      localStorage.removeItem('pos_categorySettings');
    }
    
    const storedCategorySettings = localStorage.getItem('pos_category_settings');
    
    if (storedTables) setTables(JSON.parse(storedTables));
    if (storedOrders) setOrders(JSON.parse(storedOrders));
    if (storedPayments) setPayments(JSON.parse(storedPayments));
    if (storedWastes) setWastes(JSON.parse(storedWastes));
    if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
    if (storedInventory) setInventory(JSON.parse(storedInventory));
    if (storedIngredients) {
      setIngredients(JSON.parse(storedIngredients));
    } else {
      // İlk yüklemede localStorage boşsa defaultIngredients'ı kaydet
      localStorage.setItem('pos_ingredients', JSON.stringify(defaultIngredients));
      setIngredients(defaultIngredients);
      console.log('✅ Varsayılan hammaddeler localStorage\'a kaydedildi');
    }
    if (storedCategories) setCategories(JSON.parse(storedCategories));
    
    // CategorySettings yükleme - Default değerler ile
    if (storedCategorySettings) {
      const loadedSettings = JSON.parse(storedCategorySettings);
      console.log('📂 CategorySettings localStorage\'dan yüklendi:', loadedSettings);
      setCategorySettings(loadedSettings);
    } else {
      // Default değerler - tüm kategoriler görünür
      const defaultSettings = {
        biralar: { showInMenu: true, showInInventory: true },
        kokteyller: { showInMenu: true, showInInventory: true },
        atistirmalik: { showInMenu: true, showInInventory: true }
      };
      console.log('✅ Default categorySettings ayarlandı:', defaultSettings);
      setCategorySettings(defaultSettings);
      localStorage.setItem('pos_category_settings', JSON.stringify(defaultSettings));
    }
    
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      // İlk yüklemede localStorage boşsa defaultProducts'ı kaydet
      localStorage.setItem('pos_products', JSON.stringify(defaultProducts));
      setProducts(defaultProducts);
      console.log('✅ Varsayılan ürünler localStorage\'a kaydedildi');
    }
  }, []);

  useEffect(() => {
    // Save data to localStorage whenever state changes
    localStorage.setItem('pos_tables', JSON.stringify(tables));
    localStorage.setItem('pos_orders', JSON.stringify(orders));
    localStorage.setItem('pos_payments', JSON.stringify(payments));
    localStorage.setItem('pos_wastes', JSON.stringify(wastes));
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_inventory', JSON.stringify(inventory));
    localStorage.setItem('pos_ingredients', JSON.stringify(ingredients)); // Hammadde stoğu
    localStorage.setItem('pos_categories', JSON.stringify(categories));
    localStorage.setItem('pos_category_settings', JSON.stringify(categorySettings));
    // Sadece products boş değilse kaydet
    if (products.length > 0) {
      localStorage.setItem('pos_products', JSON.stringify(products));
    }
  }, [tables, orders, payments, wastes, transactions, inventory, ingredients, products, categories, categorySettings]);

  // Categories güncelleme event'ini dinle
  useEffect(() => {
    const handleCategoriesUpdate = () => {
      const storedCategorySettings = localStorage.getItem('pos_category_settings');
      if (storedCategorySettings) {
        const loadedSettings = JSON.parse(storedCategorySettings);
        console.log('🔄 CategorySettings güncellendi (event):', loadedSettings);
        setCategorySettings(loadedSettings);
      }
    };
    
    window.addEventListener('categories-updated', handleCategoriesUpdate);
    
    return () => {
      window.removeEventListener('categories-updated', handleCategoriesUpdate);
    };
  }, []);

  // Uygulama kapatılırken otomatik yedekleme yap
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const autoBackupEnabled = localStorage.getItem('autoBackupEnabled');
      
      // Eğer otomatik yedekleme açıksa, yedekleme yap
      if (autoBackupEnabled === 'true') {
        e.preventDefault();
        
        // Modern tarayıcılarda zorunlu
        e.returnValue = '';
        
        // Yedekleme işlemini tetikle (arka planda)
        try {
          await createBackup();
        } catch (error) {
          console.error('Backup on close error:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-[#121212] text-white overflow-hidden flex flex-col font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      {/* Top Navigation Bar */}
      <nav className="bg-[#1E1E1E] border-b border-[#333333] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-lg flex items-center justify-center">
            <span className="font-bold text-[#121212]">GP</span>
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide">GOA PUB POS</h1>
            <p className="text-xs text-neutral-400">Profesyonel Kasa Sistemi</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setCurrentScreen('order')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'order'
                ? 'bg-[#FF9100] text-[#121212] font-bold shadow-lg shadow-[#FF9100]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <Menu className="w-4 h-4" />
            Sipariş
          </button>
          <button
            onClick={() => setCurrentScreen('report')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'report'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Raporlar
          </button>
          <button
            onClick={() => setCurrentScreen('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'history'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <History className="w-4 h-4" />
            İşlem Geçmişi
          </button>
          <button
            onClick={() => setCurrentScreen('inventory')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'inventory'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <Package className="w-4 h-4" />
            Stok
          </button>
          <button
            onClick={() => setCurrentScreen('backup')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'backup'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <Shield className="w-4 h-4" />
            Yedekleme
          </button>
          <button
            onClick={() => setCurrentScreen('products')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${
              currentScreen === 'products'
                ? 'bg-[#00E676] text-[#121212] font-bold shadow-lg shadow-[#00E676]/30'
                : 'bg-[#2C2C2C] text-neutral-300 hover:bg-[#333333]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Ürün Yönetimi
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        {currentScreen === 'dashboard' && (
          <DashboardScreen 
            tables={tables}
            setTables={setTables}
            orders={orders}
            setOrders={setOrders}
            onTableClick={handleTableClick}
          />
        )}
        {currentScreen === 'order' && (
          selectedTable ? (
            <OrderEntryScreen
              tableId={selectedTable.id}
              tableNumber={tableNumber}
              currentBill={selectedTable?.currentBill || 0}
              onAddOrder={handleAddOrder}
              onPartialPayment={handlePartialPayment}
              onFullPayment={handleFullPayment}
              orders={orders}
              tables={tables}
              onTableTransfer={handleTableTransfer}
              onWasteItems={handleWasteItems}
              onDeleteOrderItem={handleDeleteOrderItem}
              inventory={inventory}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-neutral-400 mb-2">Lütfen bir masa seçin</p>
                <button
                  onClick={() => setCurrentScreen('dashboard')}
                  className="px-5 py-2.5 bg-[#00E676] text-[#121212] rounded-lg font-bold hover:bg-[#00E676]/90 transition-colors"
                >
                  Dashboard'a Dön
                </button>
              </div>
            </div>
          )
        )}
        {currentScreen === 'report' && <ReportScreen tables={tables} orders={orders} payments={payments} wastes={wastes} />}
        {currentScreen === 'history' && (
          <TransactionHistoryScreen 
            tables={tables}
            orders={orders}
            payments={payments}
            wastes={wastes}
            onRevertTransaction={handleRevertTransaction}
            onRevertWaste={handleRevertWaste}
          />
        )}
        {currentScreen === 'inventory' && <InventoryScreen products={inventory} ingredients={ingredients} categories={categories} categorySettings={categorySettings} onUpdateStock={handleUpdateStock} onUpdateMinStock={handleUpdateMinStock} onUpdateIngredient={(ingredientId, newStock) => {
          const updatedIngredients = ingredients.map(ing => 
            ing.id === ingredientId ? { ...ing, currentStock: newStock, lastRestocked: new Date().toLocaleDateString('tr-TR') } : ing
          );
          setIngredients(updatedIngredients);
          localStorage.setItem('pos_ingredients', JSON.stringify(updatedIngredients));
        }} onIngredientsUpdate={(newIngredients) => {
          setIngredients(newIngredients);
          localStorage.setItem('pos_ingredients', JSON.stringify(newIngredients));
        }} />}
        {currentScreen === 'backup' && <BackupScreen onDataRestore={() => {
          // Reload data from localStorage after restore
          const storedTables = localStorage.getItem('pos_tables');
          const storedOrders = localStorage.getItem('pos_orders');
          const storedPayments = localStorage.getItem('pos_payments');
          const storedWastes = localStorage.getItem('pos_wastes');
          const storedTransactions = localStorage.getItem('pos_transactions');
          const storedInventory = localStorage.getItem('pos_inventory');
          const storedIngredients = localStorage.getItem('pos_ingredients');
          const storedProducts = localStorage.getItem('pos_products');
          
          if (storedTables) setTables(JSON.parse(storedTables));
          if (storedOrders) setOrders(JSON.parse(storedOrders));
          if (storedPayments) setPayments(JSON.parse(storedPayments));
          if (storedWastes) setWastes(JSON.parse(storedWastes));
          if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
          if (storedInventory) setInventory(JSON.parse(storedInventory));
          if (storedIngredients) setIngredients(JSON.parse(storedIngredients));
          if (storedProducts) setProducts(JSON.parse(storedProducts));
        }} />}
        {currentScreen === 'products' && <ProductManagementScreen ingredients={ingredients} onProductsUpdate={() => {
          // Products güncellendiğinde localStorage'dan yükle
          const storedProducts = localStorage.getItem('pos_products');
          if (storedProducts) {
            console.log('Ürünler güncellendi:', JSON.parse(storedProducts).length, 'ürün');
          }
        }} />}
      </main>
    </div>
  );
}