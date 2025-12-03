import { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, Edit, Plus, Search, Filter, Download, Users, XCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

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

interface InventoryScreenProps {
  products: InventoryProduct[];
  onUpdateStock: (productId: string, newStock: number) => void;
  onUpdateMinStock: (productId: string, newMinStock: number) => void;
}

export function InventoryScreen({ products, onUpdateStock, onUpdateMinStock }: InventoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'biralar' | 'kokteyller' | 'atistirmalik'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'low' | 'normal'>('all');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>('');
  const [editMinStock, setEditMinStock] = useState<string>('');
  const [showAddSupply, setShowAddSupply] = useState<string | null>(null);
  const [supplyAmount, setSupplyAmount] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Calculate stock status
  const getStockStatus = (product: InventoryProduct): 'critical' | 'low' | 'normal' => {
    if (product.currentStock === 0) return 'critical';
    if (product.currentStock <= product.minStock) return 'critical';
    if (product.currentStock <= product.minStock * 1.5) return 'low';
    return 'normal';
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const status = getStockStatus(product);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate statistics
  const criticalProducts = products.filter(p => getStockStatus(p) === 'critical').length;
  const lowStockProducts = products.filter(p => getStockStatus(p) === 'low').length;
  const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
  const outOfStock = products.filter(p => p.currentStock === 0).length;

  const handleSaveEdit = (productId: string) => {
    console.log('🔍 handleSaveEdit çağrıldı');
    console.log('  - productId:', productId);
    console.log('  - editStock value:', editStock);
    console.log('  - editMinStock value:', editMinStock);
    
    // Mevcut stoğu düzenle
    const stockValue = parseInt(editStock);
    if (!isNaN(stockValue) && stockValue >= 0) {
      console.log('✅ onUpdateStock çağrılıyor:', productId, stockValue);
      onUpdateStock(productId, stockValue);
    }
    
    // Minimum stoğu düzenle
    const minStockValue = parseInt(editMinStock);
    if (!isNaN(minStockValue) && minStockValue >= 0) {
      console.log('✅ onUpdateMinStock çağrılıyor:', productId, minStockValue);
      onUpdateMinStock(productId, minStockValue);
    }
    
    setEditingProduct(null);
    setEditStock('');
    setEditMinStock('');
  };

  const handleAddSupply = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && supplyAmount) {
      const newStock = product.currentStock + parseInt(supplyAmount);
      onUpdateStock(productId, newStock);
      setShowAddSupply(null);
      setSupplyAmount('');
    }
  };

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      'biralar': 'BİRALAR',
      'kokteyller': 'KOKTEYLLER',
      'atistirmalik': 'ATIŞTIRMALIK'
    };
    return names[category] || category;
  };

  const getStatusColor = (status: 'critical' | 'low' | 'normal') => {
    if (status === 'critical') return 'border-[#FF1744] bg-[#FF1744]/10';
    if (status === 'low') return 'border-[#FFD600] bg-[#FFD600]/10';
    return 'border-[#2C2C2C] bg-[#121212]';
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

  // PDF Export
  const exportToPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const turkishToAscii = (text: string): string => {
        const map: { [key: string]: string } = {
          'ı': 'i', 'İ': 'I', 'ş': 's', 'Ş': 'S',
          'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U',
          'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
        };
        return text.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (char) => map[char] || char);
      };
      
      // Başlık
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(turkishToAscii('GOA PUB - STOK RAPORU'), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(turkishToAscii(dateStr), pageWidth / 2, 28, { align: 'center' });
      
      // Özet İstatistikler
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(turkishToAscii('ÖZET İSTATİSTİKLER'), 14, 40);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 48;
      doc.text(turkishToAscii(`Toplam Ürün: ${products.length}`), 14, yPos);
      yPos += 7;
      doc.text(turkishToAscii(`Kritik Stok: ${criticalProducts}`), 14, yPos);
      yPos += 7;
      doc.text(turkishToAscii(`Düşük Stok: ${lowStockProducts}`), 14, yPos);
      yPos += 7;
      doc.text(turkishToAscii(`Stoksuz Ürün: ${outOfStock}`), 14, yPos);
      yPos += 7;
      doc.text(turkishToAscii(`Toplam Stok Değeri: ${totalValue.toLocaleString('tr-TR')} TL`), 14, yPos);
      yPos += 10;
      
      // Ürün Tablosu
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(turkishToAscii('STOK DETAYLARI'), 14, yPos);
      yPos += 5;
      
      const tableData = products.map((product) => {
        const status = getStockStatus(product);
        const statusText = status === 'critical' ? 'KRİTİK' : status === 'low' ? 'DÜŞÜK' : 'NORMAL';
        return [
          turkishToAscii(product.name),
          turkishToAscii(getCategoryName(product.category)),
          `${product.currentStock} ${product.unit}`,
          `${product.minStock} ${product.unit}`,
          turkishToAscii(statusText),
          turkishToAscii(product.supplier),
          `${(product.currentStock * product.price).toFixed(0)} TL`
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [[
          turkishToAscii('Ürün'),
          turkishToAscii('Kategori'),
          turkishToAscii('Mevcut'),
          turkishToAscii('Min.'),
          turkishToAscii('Durum'),
          turkishToAscii('Tedarikçi'),
          turkishToAscii('Değer')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 44, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 18 },
          2: { cellWidth: 16 },
          3: { cellWidth: 13 },
          4: { cellWidth: 15 },
          5: { cellWidth: 28 },
          6: { cellWidth: 18 }
        }
      });
      
      const fileName = `Goa_Pub_Stok_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF başarıyla indirildi!', {
        description: fileName
      });
      setShowExportMenu(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('PDF oluşturulurken hata oluştu!');
    }
  };

  // Excel Export
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const wb = XLSX.utils.book_new();
      
      // Özet Sayfa
      const summaryData = [
        ['GOA PUB - STOK RAPORU'],
        [new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
        [],
        ['ÖZET İSTATİSTİKLER'],
        ['Toplam Ürün', products.length],
        ['Kritik Stok', criticalProducts],
        ['Düşük Stok', lowStockProducts],
        ['Stoksuz Ürün', outOfStock],
        ['Toplam Stok Değeri', `${totalValue.toLocaleString('tr-TR')} TL`],
      ];
      
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS['!cols'] = [
        { wch: 25 },
        { wch: 20 }
      ];
      
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Özet');
      
      // Stok Detayları Sayfası
      const stockData = [
        ['STOK DETAYLARI'],
        [],
        ['Ürün Adı', 'Kategori', 'Mevcut Stok', 'Birim', 'Min. Stok', 'Durum', 'Tedarikçi', 'Birim Fiyat (TL)', 'Toplam Değer (TL)', 'Son Stok Tarihi']
      ];
      
      products.forEach((product) => {
        const status = getStockStatus(product);
        const statusText = status === 'critical' ? 'KRİTİK' : status === 'low' ? 'DÜŞÜK' : 'NORMAL';
        stockData.push([
          product.name,
          getCategoryName(product.category),
          product.currentStock,
          product.unit,
          product.minStock,
          statusText,
          product.supplier,
          product.price,
          parseFloat((product.currentStock * product.price).toFixed(0)),
          product.lastRestocked
        ]);
      });
      
      const stockWS = XLSX.utils.aoa_to_sheet(stockData);
      stockWS['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 10 },
        { wch: 20 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 }
      ];
      
      XLSX.utils.book_append_sheet(wb, stockWS, 'Stok Detayları');
      
      // Kritik Stok Sayfası
      const criticalStockProducts = products.filter(p => getStockStatus(p) === 'critical');
      if (criticalStockProducts.length > 0) {
        const criticalData = [
          ['KRİTİK STOK UYARISI'],
          [],
          ['Ürün Adı', 'Kategori', 'Mevcut Stok', 'Min. Stok', 'Tedarikçi', 'Acil Sipariş Gerek']
        ];
        
        criticalStockProducts.forEach((product) => {
          const needOrder = Math.max(product.minStock * 2 - product.currentStock, 0);
          criticalData.push([
            product.name,
            getCategoryName(product.category),
            `${product.currentStock} ${product.unit}`,
            `${product.minStock} ${product.unit}`,
            product.supplier,
            `${needOrder} ${product.unit}`
          ]);
        });
        
        const criticalWS = XLSX.utils.aoa_to_sheet(criticalData);
        criticalWS['!cols'] = [
          { wch: 25 },
          { wch: 15 },
          { wch: 15 },
          { wch: 15 },
          { wch: 20 },
          { wch: 20 }
        ];
        
        XLSX.utils.book_append_sheet(wb, criticalWS, 'Kritik Stok');
      }
      
      const fileName = `Goa_Pub_Stok_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Excel başarıyla indirildi!', {
        description: fileName
      });
      setShowExportMenu(false);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel oluşturulurken hata oluştu!');
    }
  };

  return (
    <div className="h-full bg-[#121212] p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-wide mb-1">BİRA STOK YÖNETİMİ</h1>
            <p className="text-neutral-400 text-sm">Bira stoklarını takip edin ve yönetin</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00E676] text-[#121212] rounded-lg font-bold hover:bg-[#00E676]/90 transition-all shadow-lg shadow-[#00E676]/30"
            >
              <Download className="w-4 h-4" />
              RAPOR İNDİR
            </button>
            
            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-[#1E1E1E] border-2 border-[#2C2C2C] rounded-lg shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={exportToPDF}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2C2C2C] transition-colors"
                  >
                    <FileDown className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-white">PDF İndir</span>
                  </button>
                  <div className="h-px bg-[#2C2C2C]" />
                  <button
                    onClick={exportToExcel}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2C2C2C] transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#00E676]" />
                    <span className="font-bold text-white">Excel İndir</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-neutral-400 text-sm">Toplam Ürün</span>
              <Package className="w-5 h-5 text-[#00E676]" />
            </div>
            <p className="text-3xl font-bold">{products.length}</p>
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
            <p className="text-3xl font-bold text-[#00E676]">{totalValue.toLocaleString('tr-TR')}</p>
          </div>
        </div>

        {/* Filters */}
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
                  <option value="kokteyller">Kokteyller</option>
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
      </div>

      {/* Products Table */}
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
                          onChange={(e) => {
                            console.log('📝 Mevcut Stok Input onChange:', e.target.value);
                            setEditStock(e.target.value);
                          }}
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
                            onClick={() => handleAddSupply(product.id)}
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
                            onClick={() => {
                              console.log('🔴 KAYDET BUTONUNA TIKLANDI!');
                              handleSaveEdit(product.id);
                            }}
                            className="p-2 bg-[#00E676] text-[#121212] rounded-lg hover:bg-[#00E676]/90 transition-colors font-bold text-xs"
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
    </div>
  );
}