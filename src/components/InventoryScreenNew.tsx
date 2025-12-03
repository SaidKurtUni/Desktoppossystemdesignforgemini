import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Search, Filter, Download, Users, XCircle, FileDown, FileSpreadsheet, Flame, ShoppingCart, Settings, ClipboardList, TrendingUp } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { CategorySettings } from './CategoryManagement';
import { Ingredient } from '../types/inventory';
import { IngredientManagement } from './IngredientManagement';

export interface InventoryProduct {
  id: string;
  name: string;
  category: 'biralar' | 'kokteyller' | 'atistirmalik';
  currentStock: number;
  minStock: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
  price: number;
}

interface InventoryReport {
  timestamp: number;
  date: string;
  products: { [id: string]: number }; // productId: stock
  ingredients: { [id: string]: number }; // ingredientId: stock
}

interface InventoryScreenProps {
  products: InventoryProduct[];
  ingredients: Ingredient[];
  categories: string[];
  categorySettings: { [key: string]: CategorySettings };
  onUpdateStock: (productId: string, newStock: number) => void;
  onUpdateMinStock: (productId: string, newMinStock: number) => void;
  onUpdateIngredient: (ingredientId: string, newStock: number) => void;
  onIngredientsUpdate: (ingredients: Ingredient[]) => void;
}

export function InventoryScreen({ products, ingredients, categories, categorySettings, onUpdateStock, onUpdateMinStock, onUpdateIngredient, onIngredientsUpdate }: InventoryScreenProps) {
  // Tab State - Sekme kontrolü
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients'>('products');
  
  // Product States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'biralar' | 'kokteyller' | 'atistirmalik'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>('');
  const [editMinStock, setEditMinStock] = useState<string>('');
  const [showAddSupply, setShowAddSupply] = useState<string | null>(null);
  const [supplyAmount, setSupplyAmount] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Ingredient States
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState('');
  const [filterIngredientType, setFilterIngredientType] = useState<'all' | 'alcohol'>('all');
  const [filterIngredientStatus, setFilterIngredientStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editIngredientStock, setEditIngredientStock] = useState<string>('');
  const [showAddIngredientSupply, setShowAddIngredientSupply] = useState<string | null>(null);
  const [ingredientSupplyAmount, setIngredientSupplyAmount] = useState<string>('');
  const [showIngredientManagement, setShowIngredientManagement] = useState(false);

  // Report States
  const [lastReport, setLastReport] = useState<InventoryReport | null>(null);

  // Load last report from localStorage
  useEffect(() => {
    const savedReport = localStorage.getItem('inventory_last_report');
    if (savedReport) {
      try {
        setLastReport(JSON.parse(savedReport));
      } catch (e) {
        console.error('Error loading report:', e);
      }
    }
  }, []);

  // Create new inventory report
  const createReport = () => {
    const newReport: InventoryReport = {
      timestamp: Date.now(),
      date: new Date().toLocaleString('tr-TR'),
      products: {},
      ingredients: {}
    };

    // Save current product stocks
    products.forEach(product => {
      if (product.category !== 'kokteyller') {
        newReport.products[product.id] = product.currentStock;
      }
    });

    // Save current ingredient stocks
    ingredients.forEach(ingredient => {
      newReport.ingredients[ingredient.id] = ingredient.currentStock;
    });

    // Save to localStorage
    localStorage.setItem('inventory_last_report', JSON.stringify(newReport));
    setLastReport(newReport);

    toast.success('Stok raporu oluşturuldu!', {
      description: `Rapor tarihi: ${newReport.date}`
    });
  };

  // Export report as PDF
  const exportReportPDF = async () => {
    if (!lastReport || !stockChanges) {
      toast.error('Önce rapor oluşturun!');
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text('GOA PUB - STOK RAPORU', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Rapor Tarihi: ${lastReport.date}`, 105, 30, { align: 'center' });
      doc.text(`Guncel Tarih: ${new Date().toLocaleString('tr-TR')}`, 105, 37, { align: 'center' });

      let yPos = 50;

      // Summary Section
      doc.setFontSize(14);
      doc.text('OZET', 14, yPos);
      yPos += 10;

      const summaryData = [
        ['SATIS URUNLERI', '', '', ''],
        ['Baslangic', 'Satilan', 'Kalan', 'Degisim'],
        [
          `${stockChanges.productsBefore} adet`,
          `${stockChanges.productsUsed} adet`,
          `${stockChanges.productsNow} adet`,
          `${stockChanges.productsUsed > 0 ? '-' : '+'}${Math.abs(stockChanges.productsUsed)} adet`
        ],
        ['', '', '', ''],
        ['HAMMADDELER', '', '', ''],
        ['Baslangic', 'Kullanilan', 'Kalan', 'Degisim'],
        [
          `${stockChanges.ingredientsBefore} cl`,
          `${stockChanges.ingredientsUsed} cl`,
          `${stockChanges.ingredientsNow} cl`,
          `${stockChanges.ingredientsUsed > 0 ? '-' : '+'}${Math.abs(stockChanges.ingredientsUsed)} cl`
        ]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 230, 118] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Products Detail
      doc.setFontSize(14);
      doc.text('SATIS URUNLERI DETAY', 14, yPos);
      yPos += 5;

      const productRows = products
        .filter(p => p.category !== 'kokteyller')
        .map(p => {
          const before = lastReport.products[p.id] || 0;
          const now = p.currentStock;
          const used = before - now;
          return [
            p.name,
            `${before} ${p.unit}`,
            `${used} ${p.unit}`,
            `${now} ${p.unit}`,
            `${p.price} TL`
          ];
        });

      autoTable(doc, {
        startY: yPos,
        head: [['Urun', 'Baslangic', 'Satilan', 'Kalan', 'Birim Fiyat']],
        body: productRows,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 230, 118], textColor: [18, 18, 18] }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Add new page if needed
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Ingredients Detail
      doc.setFontSize(14);
      doc.text('HAMMADDELER DETAY', 14, yPos);
      yPos += 5;

      const ingredientRows = ingredients.map(ing => {
        const before = lastReport.ingredients[ing.id] || 0;
        const now = ing.currentStock;
        const used = before - now;
        return [
          ing.name,
          `${before} cl`,
          `${used} cl`,
          `${now} cl`,
          `${ing.price} TL/cl`
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Hammadde', 'Baslangic', 'Kullanilan', 'Kalan', 'Birim Fiyat']],
        body: ingredientRows,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 230, 118], textColor: [18, 18, 18] }
      });

      // Save PDF
      doc.save(`Goa_Pub_Stok_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`);
      
      toast.success('PDF raporu indirildi!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('PDF oluşturulurken hata oluştu!');
    }
  };

  // Export report as Excel
  const exportReportExcel = async () => {
    if (!lastReport || !stockChanges) {
      toast.error('Önce rapor oluşturun!');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['GOA PUB - STOK RAPORU'],
        ['Rapor Tarihi:', lastReport.date],
        ['Guncel Tarih:', new Date().toLocaleString('tr-TR')],
        [],
        ['OZET'],
        [],
        ['SATIS URUNLERI'],
        ['Baslangic', 'Satilan', 'Kalan', 'Degisim'],
        [
          `${stockChanges.productsBefore} adet`,
          `${stockChanges.productsUsed} adet`,
          `${stockChanges.productsNow} adet`,
          `${stockChanges.productsUsed > 0 ? '-' : '+'}${Math.abs(stockChanges.productsUsed)} adet`
        ],
        [],
        ['HAMMADDELER'],
        ['Baslangic', 'Kullanilan', 'Kalan', 'Degisim'],
        [
          `${stockChanges.ingredientsBefore} cl`,
          `${stockChanges.ingredientsUsed} cl`,
          `${stockChanges.ingredientsNow} cl`,
          `${stockChanges.ingredientsUsed > 0 ? '-' : '+'}${Math.abs(stockChanges.ingredientsUsed)} cl`
        ]
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Ozet');

      // Products Sheet
      const productData = [
        ['SATIS URUNLERI DETAY'],
        ['Urun', 'Kategori', 'Baslangic', 'Satilan', 'Kalan', 'Birim', 'Birim Fiyat', 'Tedarikci']
      ];

      products
        .filter(p => p.category !== 'kokteyller')
        .forEach(p => {
          const before = lastReport.products[p.id] || 0;
          const now = p.currentStock;
          const used = before - now;
          productData.push([
            p.name,
            p.category,
            before,
            used,
            now,
            p.unit,
            p.price,
            p.supplier
          ]);
        });

      const productSheet = XLSX.utils.aoa_to_sheet(productData);
      XLSX.utils.book_append_sheet(wb, productSheet, 'Satis Urunleri');

      // Ingredients Sheet
      const ingredientData = [
        ['HAMMADDELER DETAY'],
        ['Hammadde', 'Tip', 'Baslangic', 'Kullanilan', 'Kalan', 'Birim', 'Birim Fiyat', 'Tedarikci']
      ];

      ingredients.forEach(ing => {
        const before = lastReport.ingredients[ing.id] || 0;
        const now = ing.currentStock;
        const used = before - now;
        ingredientData.push([
          ing.name,
          ing.type,
          before,
          used,
          now,
          'cl',
          ing.price,
          ing.supplier
        ]);
      });

      const ingredientSheet = XLSX.utils.aoa_to_sheet(ingredientData);
      XLSX.utils.book_append_sheet(wb, ingredientSheet, 'Hammaddeler');

      // Save Excel
      XLSX.writeFile(wb, `Goa_Pub_Stok_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`);
      
      toast.success('Excel raporu indirildi!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel oluşturulurken hata oluştu!');
    }
  };

  // Calculate stock changes since last report
  const getStockChanges = () => {
    if (!lastReport) return null;

    let totalProductsBefore = 0;
    let totalProductsNow = 0;
    let totalIngredientsBefore = 0;
    let totalIngredientsNow = 0;

    // Calculate product changes
    products.forEach(product => {
      if (product.category !== 'kokteyller') {
        const before = lastReport.products[product.id] || 0;
        totalProductsBefore += before;
        totalProductsNow += product.currentStock;
      }
    });

    // Calculate ingredient changes
    ingredients.forEach(ingredient => {
      const before = lastReport.ingredients[ingredient.id] || 0;
      totalIngredientsBefore += before;
      totalIngredientsNow += ingredient.currentStock;
    });

    return {
      productsBefore: totalProductsBefore,
      productsNow: totalProductsNow,
      productsUsed: totalProductsBefore - totalProductsNow,
      ingredientsBefore: totalIngredientsBefore,
      ingredientsNow: totalIngredientsNow,
      ingredientsUsed: totalIngredientsBefore - totalIngredientsNow,
    };
  };

  const stockChanges = getStockChanges();

  // Calculate stock status for products
  const getStockStatus = (item: { currentStock: number; minStock: number }): 'critical' | 'low' | 'normal' => {
    if (item.currentStock === 0) return 'critical';
    if (item.currentStock <= item.minStock) return 'critical';
    if (item.currentStock <= item.minStock * 1.5) return 'low';
    return 'normal';
  };

  // Filter products - Kokteyller gösterilmeyecek (reçete bazlı)
  const filteredProducts = products.filter(product => {
    // Kokteyller artık burada gösterilmeyecek - hammadde bazlı takip ediliyorlar
    if (product.category === 'kokteyller') return false;
    
    // Category visibility check
    const categoryVisible = categorySettings[product.category]?.showInInventory !== false;
    if (!categoryVisible) return false;
    
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const status = getStockStatus(product);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(ingredientSearchQuery.toLowerCase()) ||
                         ingredient.supplier.toLowerCase().includes(ingredientSearchQuery.toLowerCase());
    const matchesType = filterIngredientType === 'all' || ingredient.type === filterIngredientType;
    const status = getStockStatus(ingredient);
    const matchesStatus = filterIngredientStatus === 'all' || status === filterIngredientStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate statistics for products
  const visibleProducts = products.filter(product => 
    product.category !== 'kokteyller' && categorySettings[product.category]?.showInInventory !== false
  );
  const criticalProducts = visibleProducts.filter(p => getStockStatus(p) === 'critical').length;
  const lowStockProducts = visibleProducts.filter(p => getStockStatus(p) === 'low').length;
  const totalProductValue = visibleProducts.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
  const outOfStockProducts = visibleProducts.filter(p => p.currentStock === 0).length;

  // Calculate statistics for ingredients
  const criticalIngredients = ingredients.filter(ing => getStockStatus(ing) === 'critical').length;
  const lowStockIngredients = ingredients.filter(ing => getStockStatus(ing) === 'low').length;
  const totalIngredientValue = ingredients.reduce((sum, ing) => sum + (ing.currentStock * ing.price), 0);
  const outOfStockIngredients = ingredients.filter(ing => ing.currentStock === 0).length;

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'biralar': 'BİRALAR',
      'kokteyller': 'KOKTEYLLER',
      'atistirmalik': 'ATIŞTIRMALIK'
    };
    return names[category] || category;
  };

  const getIngredientTypeName = (type: string) => {
    const names: Record<string, string> = {
      'alcohol': 'ALKOL'
    };
    return names[type] || type;
  };

  const getIngredientTypeIcon = (type: string) => {
    if (type === 'alcohol') return <Flame className="w-4 h-4" />;
    return <Flame className="w-4 h-4" />; // Varsayılan olarak alkol
  };

  const getStatusBadge = (status: 'critical' | 'low' | 'normal') => {
    if (status === 'critical') {
      return (
        <span className="px-2.5 py-1 bg-[#FF1744] text-white text-xs font-bold rounded-full inline-flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          KRİTİK
        </span>
      );
    }
    if (status === 'low') {
      return (
        <span className="px-2.5 py-1 bg-[#FFD600] text-[#121212] text-xs font-bold rounded-full inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          DÜŞÜK
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-[#00E676] text-[#121212] text-xs font-bold rounded-full">
        NORMAL
      </span>
    );
  };

  const handleSaveProductEdit = (productId: string) => {
    const stockValue = parseInt(editStock);
    if (!isNaN(stockValue) && stockValue >= 0) {
      onUpdateStock(productId, stockValue);
    }
    
    const minStockValue = parseInt(editMinStock);
    if (!isNaN(minStockValue) && minStockValue >= 0) {
      onUpdateMinStock(productId, minStockValue);
    }
    
    setEditingProduct(null);
    setEditStock('');
    setEditMinStock('');
    toast.success('Stok güncellendi!');
  };

  const handleAddProductSupply = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && supplyAmount) {
      const newStock = product.currentStock + parseInt(supplyAmount);
      onUpdateStock(productId, newStock);
      setShowAddSupply(null);
      setSupplyAmount('');
      toast.success(`${product.name} stoğu güncellendi!`);
    }
  };

  const handleSaveIngredientEdit = (ingredientId: string) => {
    const stockValue = parseInt(editIngredientStock);
    if (!isNaN(stockValue) && stockValue >= 0) {
      onUpdateIngredient(ingredientId, stockValue);
      toast.success('Hammadde stoğu güncellendi!');
    }
    
    setEditingIngredient(null);
    setEditIngredientStock('');
  };

  const handleAddIngredientSupply = (ingredientId: string) => {
    const ingredient = ingredients.find(ing => ing.id === ingredientId);
    if (ingredient && ingredientSupplyAmount) {
      const newStock = ingredient.currentStock + parseInt(ingredientSupplyAmount);
      onUpdateIngredient(ingredientId, newStock);
      setShowAddIngredientSupply(null);
      setIngredientSupplyAmount('');
      toast.success(`${ingredient.name} stoğu güncellendi!`);
    }
  };

  return (
    <div className="h-full bg-[#121212] p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-wide mb-1">STOK YÖNETİMİ</h1>
            <p className="text-neutral-400 text-sm">Ürün ve hammadde stoklarını takip edin</p>
          </div>
          <button
            onClick={createReport}
            className="bg-[#FF9100] hover:bg-[#FF9100]/90 text-[#121212] rounded-lg px-6 py-3 font-bold tracking-wide transition-all shadow-lg shadow-[#FF9100]/40 active:scale-95 flex items-center gap-2"
          >
            <ClipboardList className="w-5 h-5" />
            RAPOR OLUŞTUR
          </button>
        </div>

        {/* Report Summary */}
        {lastReport && stockChanges && (
          <div className="bg-gradient-to-r from-[#FF9100]/10 to-[#FF9100]/5 border-2 border-[#FF9100]/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#FF9100]" />
                <h3 className="font-bold text-[#FF9100]">SON RAPORDAN BERİ STOK DEĞİŞİMİ</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">Rapor Tarihi: {lastReport.date}</span>
                <button
                  onClick={exportReportPDF}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  title="PDF olarak indir"
                >
                  <FileDown className="w-4 h-4" />
                  PDF İNDİR
                </button>
                <button
                  onClick={exportReportExcel}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  title="Excel olarak indir"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  EXCEL İNDİR
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Products Summary */}
              <div className="bg-[#121212] border border-[#2C2C2C] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-[#00E676]" />
                  <span className="text-sm font-bold text-neutral-300">SATIŞ ÜRÜNLERİ</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-neutral-500 mb-1">Başlangıç</div>
                    <div className="font-bold text-white">{stockChanges.productsBefore} adet</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Satılan</div>
                    <div className="font-bold text-[#FF9100]">{stockChanges.productsUsed} adet</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Kalan</div>
                    <div className="font-bold text-[#00E676]">{stockChanges.productsNow} adet</div>
                  </div>
                </div>
              </div>
              {/* Ingredients Summary */}
              <div className="bg-[#121212] border border-[#2C2C2C] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-[#00E676]" />
                  <span className="text-sm font-bold text-neutral-300">HAMMADDELER</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-neutral-500 mb-1">Başlangıç</div>
                    <div className="font-bold text-white">{stockChanges.ingredientsBefore} cl</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Kullanılan</div>
                    <div className="font-bold text-[#FF9100]">{stockChanges.ingredientsUsed} cl</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">Kalan</div>
                    <div className="font-bold text-[#00E676]">{stockChanges.ingredientsNow} cl</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-[#00E676] text-[#121212] shadow-lg shadow-[#00E676]/30'
                : 'bg-[#1E1E1E] text-neutral-400 border border-[#2C2C2C] hover:bg-[#2C2C2C]'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            SATIŞ ÜRÜNLERİ (Bira/Atıştırmalık)
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'ingredients'
                ? 'bg-[#00E676] text-[#121212] shadow-lg shadow-[#00E676]/30'
                : 'bg-[#1E1E1E] text-neutral-400 border border-[#2C2C2C] hover:bg-[#2C2C2C]'
            }`}
          >
            <Package className="w-5 h-5" />
            HAMMADDELER (Kokteyl İçerikleri)
          </button>
        </div>

        {/* Statistics Cards */}
        {activeTab === 'products' ? (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-sm">Toplam Ürün</span>
                <Package className="w-5 h-5 text-[#00E676]" />
              </div>
              <p className="text-3xl font-bold">{visibleProducts.length}</p>
            </div>

            <div className="bg-[#FF1744]/10 border border-[#FF1744] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300 text-sm">Kritik Stok</span>
                <AlertTriangle className="w-5 h-5 text-[#FF1744]" />
              </div>
              <p className="text-3xl font-bold text-[#FF1744]">{criticalProducts}</p>
            </div>

            <div className="bg-[#FFD600]/10 border border-[#FFD600] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300 text-sm">Düşük Stok</span>
                <TrendingDown className="w-5 h-5 text-[#FFD600]" />
              </div>
              <p className="text-3xl font-bold text-[#FFD600]">{lowStockProducts}</p>
            </div>

            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-sm">Toplam Değer</span>
                <span className="text-xs text-neutral-500">TL</span>
              </div>
              <p className="text-3xl font-bold text-[#00E676]">{totalProductValue.toLocaleString('tr-TR')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-sm">Toplam Hammadde</span>
                <Package className="w-5 h-5 text-[#00E676]" />
              </div>
              <p className="text-3xl font-bold">{ingredients.length}</p>
            </div>

            <div className="bg-[#FF1744]/10 border border-[#FF1744] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300 text-sm">Kritik Stok</span>
                <AlertTriangle className="w-5 h-5 text-[#FF1744]" />
              </div>
              <p className="text-3xl font-bold text-[#FF1744]">{criticalIngredients}</p>
            </div>

            <div className="bg-[#FFD600]/10 border border-[#FFD600] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-300 text-sm">Düşük Stok</span>
                <TrendingDown className="w-5 h-5 text-[#FFD600]" />
              </div>
              <p className="text-3xl font-bold text-[#FFD600]">{lowStockIngredients}</p>
            </div>

            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-sm">Toplam Değer</span>
                <span className="text-xs text-neutral-500">TL</span>
              </div>
              <p className="text-3xl font-bold text-[#00E676]">{totalIngredientValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        {activeTab === 'products' ? (
          <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="text-neutral-400 text-xs mb-2 block">ÜRÜN ARA</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ürün veya tedarikçi ara..."
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-neutral-400 text-xs mb-2 block">KATEGORİ</label>
                <div className="relative">
                  <Filter className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                  >
                    <option value="all">Tüm Kategoriler</option>
                    <option value="biralar">Biralar</option>
                    <option value="atistirmalik">Atıştırmalık</option>
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-neutral-400 text-xs mb-2 block">STOK DURUMU</label>
                <div className="relative">
                  <AlertTriangle className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="critical">Kritik</option>
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {/* Hammadde Yönetimi Butonu */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowIngredientManagement(true)}
                className="bg-[#FF9100] hover:bg-[#FF9100]/90 text-[#121212] rounded-lg px-6 py-3 font-bold tracking-wide transition-all shadow-lg shadow-[#FF9100]/40 active:scale-95 flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                HAMMADDE YÖNETİMİ
              </button>
            </div>

            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="text-neutral-400 text-xs mb-2 block">HAMMADDE ARA</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ingredientSearchQuery}
                    onChange={(e) => setIngredientSearchQuery(e.target.value)}
                    placeholder="Hammadde veya tedarikçi ara..."
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="text-neutral-400 text-xs mb-2 block">TİP</label>
                <div className="relative">
                  <Filter className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={filterIngredientType}
                    onChange={(e) => setFilterIngredientType(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                  >
                    <option value="all">Tüm Tipler</option>
                    <option value="alcohol">Alkol</option>
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-neutral-400 text-xs mb-2 block">STOK DURUMU</label>
                <div className="relative">
                  <AlertTriangle className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={filterIngredientStatus}
                    onChange={(e) => setFilterIngredientStatus(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00E676] transition-colors appearance-none"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="critical">Kritik</option>
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Products Table */}
      {activeTab === 'products' && (
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2C2C2C] bg-[#121212]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">ÜRÜN</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">KATEGORİ</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">MEVCUT STOK</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">MİN. STOK</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">DURUM</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">TEDARİKÇİ</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">SON STOK TARİHİ</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const isEditing = editingProduct === product.id;
                  const isAddingSupply = showAddSupply === product.id;

                  return (
                    <tr 
                      key={product.id} 
                      className={`border-b border-[#2C2C2C] hover:bg-[#2C2C2C]/30 transition-colors ${
                        status === 'critical' ? 'bg-[#FF1744]/5' : status === 'low' ? 'bg-[#FFD600]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{product.name}</div>
                        <div className="text-xs text-neutral-400">{product.price} TL / {product.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-[#2C2C2C] text-neutral-300 text-xs rounded-lg">
                          {getCategoryName(product.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editStock}
                            onChange={(e) => setEditStock(e.target.value)}
                            placeholder={product.currentStock.toString()}
                            className="w-20 bg-[#121212] border border-[#00E676] rounded px-2 py-1 text-center text-sm focus:outline-none"
                          />
                        ) : (
                          <span className={`font-bold text-lg ${
                            status === 'critical' ? 'text-[#FF1744]' : 
                            status === 'low' ? 'text-[#FFD600]' : 
                            'text-white'
                          }`}>
                            {product.currentStock}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500 ml-1">{product.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editMinStock}
                            onChange={(e) => setEditMinStock(e.target.value)}
                            placeholder={product.minStock.toString()}
                            className="w-20 bg-[#121212] border border-[#00E676] rounded px-2 py-1 text-center text-sm focus:outline-none"
                          />
                        ) : (
                          <span className="text-neutral-400 font-semibold">{product.minStock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Users className="w-4 h-4 text-neutral-500" />
                          {product.supplier}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-sm">
                        {product.lastRestocked}
                      </td>
                      <td className="px-4 py-3">
                        {isAddingSupply ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="number"
                              value={supplyAmount}
                              onChange={(e) => setSupplyAmount(e.target.value)}
                              placeholder="Miktar"
                              min="1"
                              className="w-20 bg-[#121212] border border-[#00E676] rounded px-2 py-1 text-center text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddProductSupply(product.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors"
                              title="Onayla"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setShowAddSupply(null);
                                setSupplyAmount('');
                              }}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="İptal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleSaveProductEdit(product.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors font-bold text-xs px-3"
                              title="Kaydet"
                            >
                              KAYDET
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(null);
                                setEditStock('');
                                setEditMinStock('');
                              }}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="İptal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => setShowAddSupply(product.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors"
                              title="Stok Ekle"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">Filtrelere uygun ürün bulunamadı</p>
            </div>
          )}
        </div>
      )}

      {/* Ingredients Table */}
      {activeTab === 'ingredients' && (
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2C2C2C] bg-[#121212]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">HAMMADDE</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">TİP</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">MEVCUT STOK</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">MİN. STOK</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">DURUM</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">TEDARİKÇİ</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">SON STOK TARİHİ</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-neutral-400 tracking-wider">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map((ingredient) => {
                  const status = getStockStatus(ingredient);
                  const isEditing = editingIngredient === ingredient.id;
                  const isAddingSupply = showAddIngredientSupply === ingredient.id;

                  return (
                    <tr 
                      key={ingredient.id} 
                      className={`border-b border-[#2C2C2C] hover:bg-[#2C2C2C]/30 transition-colors ${
                        status === 'critical' ? 'bg-[#FF1744]/5' : status === 'low' ? 'bg-[#FFD600]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{ingredient.name}</div>
                        <div className="text-xs text-neutral-400">{ingredient.price.toFixed(2)} TL / {ingredient.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 bg-[#2C2C2C] text-neutral-300 text-xs rounded-lg inline-flex items-center gap-1.5">
                          {getIngredientTypeIcon(ingredient.type)}
                          {getIngredientTypeName(ingredient.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editIngredientStock}
                            onChange={(e) => setEditIngredientStock(e.target.value)}
                            placeholder={ingredient.currentStock.toString()}
                            className="w-24 bg-[#121212] border border-[#00E676] rounded px-2 py-1 text-center text-sm focus:outline-none"
                          />
                        ) : (
                          <span className={`font-bold text-lg ${
                            status === 'critical' ? 'text-[#FF1744]' : 
                            status === 'low' ? 'text-[#FFD600]' : 
                            'text-white'
                          }`}>
                            {ingredient.currentStock}
                          </span>
                        )}
                        <span className="text-xs text-neutral-500 ml-1">{ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-neutral-400 font-semibold">{ingredient.minStock} {ingredient.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Users className="w-4 h-4 text-neutral-500" />
                          {ingredient.supplier}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-sm">
                        {ingredient.lastRestocked}
                      </td>
                      <td className="px-4 py-3">
                        {isAddingSupply ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="number"
                              value={ingredientSupplyAmount}
                              onChange={(e) => setIngredientSupplyAmount(e.target.value)}
                              placeholder="Miktar (cl)"
                              min="1"
                              className="w-24 bg-[#121212] border border-[#00E676] rounded px-2 py-1 text-center text-sm focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddIngredientSupply(ingredient.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors"
                              title="Onayla"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setShowAddIngredientSupply(null);
                                setIngredientSupplyAmount('');
                              }}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="İptal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleSaveIngredientEdit(ingredient.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors font-bold text-xs px-3"
                              title="Kaydet"
                            >
                              KAYDET
                            </button>
                            <button
                              onClick={() => {
                                setEditingIngredient(null);
                                setEditIngredientStock('');
                              }}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="İptal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => setShowAddIngredientSupply(ingredient.id)}
                              className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors"
                              title="Stok Ekle"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredIngredients.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">Filtrelere uygun hammadde bulunamadı</p>
            </div>
          )}
        </div>
      )}

      {/* Ingredient Management Modal */}
      <IngredientManagement
        isOpen={showIngredientManagement}
        onClose={() => setShowIngredientManagement(false)}
        ingredients={ingredients}
        onIngredientsUpdate={onIngredientsUpdate}
      />
    </div>
  );
}
