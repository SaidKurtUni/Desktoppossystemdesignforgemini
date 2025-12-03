import { Save, Upload, Download, Shield, Clock, Database, AlertTriangle, CheckCircle2, FileJson } from 'lucide-react';
import { useState, useEffect } from 'react';
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

interface BackupData {
  version: string;
  timestamp: number;
  date: string;
  data: {
    tables: any[];
    orders: any[];
    payments: any[];
    wastes: any[];
    transactions: any[];
    reservations: any[];
    inventory: any[];
    lastBackup?: number;
  };
}

interface BackupScreenProps {
  onDataRestore: () => void;
}

// Export performBackup fonksiyonunu App.tsx'te kullanmak için
export async function createBackup() {
  try {
    console.log('🔄 Yedekleme başlatılıyor...');
    
    // localStorage'dan tüm verileri al
    const tables = JSON.parse(localStorage.getItem('pos_tables') || '[]');
    const orders = JSON.parse(localStorage.getItem('pos_orders') || '[]');
    const payments = JSON.parse(localStorage.getItem('pos_payments') || '[]');
    const wastes = JSON.parse(localStorage.getItem('pos_wastes') || '[]');
    const transactions = JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    const reservations = JSON.parse(localStorage.getItem('pos_reservations') || '[]');
    const inventory = JSON.parse(localStorage.getItem('pos_inventory') || '[]');

    console.log('📊 Veri istatistikleri:', {
      tables: tables.length,
      orders: orders.length,
      payments: payments.length,
      wastes: wastes.length,
      transactions: transactions.length,
      reservations: reservations.length,
      inventory: inventory.length
    });

    const backupData = {
      version: '1.0.0',
      timestamp: Date.now(),
      date: new Date().toLocaleString('tr-TR'),
      data: {
        tables,
        orders,
        payments,
        wastes,
        transactions,
        reservations,
        inventory
      }
    };

    console.log('📦 Yedek paketi hazırlandı, boyut:', JSON.stringify(backupData).length, 'karakter');

    // JSON dosyası oluştur ve indir
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `Goa_Pub_Yedek_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}_${new Date().toLocaleTimeString('tr-TR').replace(/:/g, '-')}.json`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ JSON dosyası indirildi:', fileName);

    // PDF raporu oluştur
    console.log('📄 PDF raporu oluşturuluyor...');
    await generateReportPDFForBackup(payments, orders, wastes);

    // Son yedekleme zamanını kaydet
    localStorage.setItem('lastBackupTime', Date.now().toString());

    console.log('✅ Yedekleme tamamlandı!');
    return true;
  } catch (error) {
    console.error('❌ Backup error:', error);
    return false;
  }
}

async function generateReportPDFForBackup(payments: any[], orders: any[], wastes: any[]) {
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

    const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const cashTotal = payments.reduce((sum, p) => sum + (p.cashAmount || 0), 0);
    const creditCardTotal = payments.reduce((sum, p) => sum + (p.cardAmount || 0), 0);
    const totalWaste = wastes.reduce((sum, w) => sum + w.price, 0);
    
    const cashPercentage = totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 0;
    const cardPercentage = totalRevenue > 0 ? (creditCardTotal / totalRevenue) * 100 : 0;
    const wastePercentage = totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0;

    const productStats: { [key: string]: { name: string; category: string; quantity: number; revenue: number } } = {};
    orders.forEach((order) => {
      order.orderItems?.forEach((item: any) => {
        if (item.isPaid) {
          if (!productStats[item.name]) {
            productStats[item.name] = { name: item.name, category: 'Genel', quantity: 0, revenue: 0 };
          }
          productStats[item.name].quantity += 1;
          productStats[item.name].revenue += item.price;
        }
      });
    });

    const sortedProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

    const wasteStats: { [key: string]: { name: string; quantity: number; totalPrice: number } } = {};
    wastes.forEach((waste) => {
      if (!wasteStats[waste.name]) {
        wasteStats[waste.name] = { name: waste.name, quantity: 0, totalPrice: 0 };
      }
      wasteStats[waste.name].quantity += 1;
      wasteStats[waste.name].totalPrice += waste.price;
    });
    const sortedWastes = Object.values(wasteStats);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(turkishToAscii('GOA PUB - GÜN SONU RAPORU'), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(turkishToAscii(dateStr), pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(turkishToAscii('ÖZET BİLGİLER'), 14, 40);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 48;
    doc.text(turkishToAscii(`Toplam Ciro: ${totalRevenue.toFixed(0)} TL`), 14, yPos);
    yPos += 7;
    doc.text(turkishToAscii(`Nakit Ödeme: ${cashTotal.toFixed(0)} TL (${cashPercentage.toFixed(1)}%)`), 14, yPos);
    yPos += 7;
    doc.text(turkishToAscii(`Kredi Kartı: ${creditCardTotal.toFixed(0)} TL (${cardPercentage.toFixed(1)}%)`), 14, yPos);
    yPos += 7;
    doc.text(turkishToAscii(`Zayi/Fire: ${totalWaste.toFixed(0)} TL (${wastePercentage.toFixed(2)}%)`), 14, yPos);
    yPos += 10;
    
    if (sortedProducts.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(turkishToAscii('SATILAN ÜRÜNLER'), 14, yPos);
      yPos += 5;
      
      const tableData = sortedProducts.map((product, index) => [
        (index + 1).toString(),
        turkishToAscii(product.name),
        turkishToAscii(product.category),
        product.quantity.toString(),
        `${product.revenue.toFixed(0)} TL`
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[turkishToAscii('Sıra'), turkishToAscii('Ürün Adı'), turkishToAscii('Kategori'), turkishToAscii('Satılan Adet'), turkishToAscii('Toplam Tutar')]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 44, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        foot: [['', 'TOPLAM', '', sortedProducts.reduce((sum, p) => sum + p.quantity, 0).toString() + ' Adet', totalRevenue.toFixed(0) + ' TL']],
        footStyles: { fillColor: [30, 30, 30], textColor: [0, 230, 118], fontStyle: 'bold' }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (sortedWastes.length > 0) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text(turkishToAscii('ZAYİ / FİRE ÜRÜNLER'), 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
      
      const wasteTableData = sortedWastes.map((waste) => [turkishToAscii(waste.name), `${waste.quantity} Adet`, `${waste.totalPrice.toFixed(0)} TL`]);
      
      autoTable(doc, {
        startY: yPos,
        head: [[turkishToAscii('Ürün Adı'), turkishToAscii('Zayi/Fire Adet'), turkishToAscii('Toplam Tutar')]],
        body: wasteTableData,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        foot: [['TOPLAM FIRE', sortedWastes.reduce((sum, w) => sum + w.quantity, 0).toString() + ' Adet', totalWaste.toFixed(0) + ' TL']],
        footStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
    }
    
    const pdfFileName = `Goa_Pub_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
    doc.save(pdfFileName);
    
    console.log('✅ PDF raporu indirildi:', pdfFileName);
    return pdfFileName;
  } catch (error) {
    console.error('PDF generation error:', error);
    return null;
  }
}

export function BackupScreen({ onDataRestore }: BackupScreenProps) {
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<BackupData | null>(null);
  const [dataStats, setDataStats] = useState({
    tables: 0,
    orders: 0,
    payments: 0,
    wastes: 0,
    transactions: 0,
    reservations: 0,
    inventory: 0
  });

  // Load last backup time from localStorage
  useEffect(() => {
    const lastBackup = localStorage.getItem('lastBackupTime');
    if (lastBackup) {
      setLastBackupTime(parseInt(lastBackup));
    }

    // Load auto backup setting
    const autoBackup = localStorage.getItem('autoBackupEnabled');
    if (autoBackup !== null) {
      setAutoBackupEnabled(autoBackup === 'true');
    }

    // Calculate data stats
    updateDataStats();
  }, []);

  // ❌ REMOVED: Otomatik günlük yedekleme kontrolü (sayfa açılınca tetiklenmesin)

  const updateDataStats = () => {
    const tables = JSON.parse(localStorage.getItem('pos_tables') || '[]');
    const orders = JSON.parse(localStorage.getItem('pos_orders') || '[]');
    const payments = JSON.parse(localStorage.getItem('pos_payments') || '[]');
    const wastes = JSON.parse(localStorage.getItem('pos_wastes') || '[]');
    const transactions = JSON.parse(localStorage.getItem('pos_transactions') || '[]');
    const reservations = JSON.parse(localStorage.getItem('pos_reservations') || '[]');
    const inventory = JSON.parse(localStorage.getItem('pos_inventory') || '[]');

    setDataStats({
      tables: tables.length,
      orders: orders.length,
      payments: payments.length,
      wastes: wastes.length,
      transactions: transactions.length,
      reservations: reservations.length || 0,
      inventory: inventory.length
    });
  };

  // performBackup fonksiyonu - UI'dan çağrılır
  const performBackup = async () => {
    try {
      toast.loading('Yedekleme hazırlanıyor...', { id: 'backup-loading' });
      
      const success = await createBackup();
      
      if (success) {
        setLastBackupTime(Date.now());
        updateDataStats();
        
        toast.success('Yedekleme başarılı!', {
          id: 'backup-loading',
          description: 'JSON yedek + PDF rapor indirildi'
        });
      } else {
        toast.error('Yedekleme sırasında hata oluştu!', {
          id: 'backup-loading'
        });
      }
    } catch (error) {
      console.error('Backup button error:', error);
      toast.error('Yedekleme başlatılamadı!', {
        id: 'backup-loading'
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string) as BackupData;
        
        // Validate backup data structure
        if (!backupData.version || !backupData.data) {
          throw new Error('Geçersiz yedekleme dosyası');
        }

        // Show confirmation dialog
        setPendingBackupData(backupData);
        setShowRestoreDialog(true);
      } catch (error) {
        console.error('File parse error:', error);
        toast.error('Geçersiz yedekleme dosyası!', {
          description: 'Lütfen geçerli bir JSON yedekleme dosyası seçin'
        });
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingBackupData) return;

    try {
      // Restore all data
      localStorage.setItem('pos_tables', JSON.stringify(pendingBackupData.data.tables || []));
      localStorage.setItem('pos_orders', JSON.stringify(pendingBackupData.data.orders || []));
      localStorage.setItem('pos_payments', JSON.stringify(pendingBackupData.data.payments || []));
      localStorage.setItem('pos_wastes', JSON.stringify(pendingBackupData.data.wastes || []));
      localStorage.setItem('pos_transactions', JSON.stringify(pendingBackupData.data.transactions || []));
      localStorage.setItem('pos_reservations', JSON.stringify(pendingBackupData.data.reservations || []));
      localStorage.setItem('pos_inventory', JSON.stringify(pendingBackupData.data.inventory || []));

      toast.success('Veriler başarıyla geri yüklendi!', {
        description: 'Sayfa yeniden yükleniyor...'
      });

      // Reload page to reflect changes
      setTimeout(() => {
        onDataRestore();
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Veri geri yükleme sırasında hata oluştu!');
    }

    setShowRestoreDialog(false);
    setPendingBackupData(null);
  };

  const toggleAutoBackup = () => {
    const newValue = !autoBackupEnabled;
    setAutoBackupEnabled(newValue);
    localStorage.setItem('autoBackupEnabled', newValue.toString());
    
    toast.success(newValue ? 'Otomatik yedekleme açıldı' : 'Otomatik yedekleme kapatıldı', {
      description: newValue ? 'Günlük otomatik yedekleme aktif' : 'Manuel yedekleme yapmanız gerekecek'
    });
  };

  const getTimeSinceLastBackup = () => {
    if (!lastBackupTime) return 'Henüz yedekleme yapılmadı';
    
    const now = Date.now();
    const diff = now - lastBackupTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    return 'Az önce';
  };

  return (
    <div className="h-full bg-[#1E1E1E] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-500 p-3 rounded-lg shadow-lg shadow-blue-500/50">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-3xl tracking-wider">YEDEKLEME & VERİ GÜVENLİĞİ</h1>
          </div>
          <p className="text-neutral-500 text-sm">
            Verilerinizi yedekleyin ve geri yükleyin
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Last Backup */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg p-5 border-2 border-blue-500/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500 p-2.5 rounded-lg shadow-lg shadow-blue-500/50">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-neutral-400 text-sm">Son Yedekleme</span>
            </div>
            <div className="font-bold text-2xl text-blue-400">
              {getTimeSinceLastBackup()}
            </div>
            {lastBackupTime && (
              <div className="text-xs text-neutral-500 mt-2">
                {new Date(lastBackupTime).toLocaleString('tr-TR')}
              </div>
            )}
          </div>

          {/* Auto Backup Status */}
          <div className={`bg-gradient-to-br rounded-lg p-5 border-2 shadow-lg ${
            autoBackupEnabled 
              ? 'from-[#00E676]/20 to-[#00E676]/10 border-[#00E676]/30' 
              : 'from-neutral-500/20 to-neutral-500/10 border-neutral-500/30'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-lg shadow-lg ${
                autoBackupEnabled 
                  ? 'bg-[#00E676] shadow-[#00E676]/50' 
                  : 'bg-neutral-500 shadow-neutral-500/50'
              }`}>
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-neutral-400 text-sm">Otomatik Yedekleme</span>
            </div>
            <div className={`font-bold text-2xl ${autoBackupEnabled ? 'text-[#00E676]' : 'text-neutral-400'}`}>
              {autoBackupEnabled ? 'Aktif' : 'Kapalı'}
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {autoBackupEnabled ? 'Günlük otomatik yedekleme' : 'Manuel yedekleme gerekli'}
            </div>
          </div>

          {/* Total Data */}
          <div className="bg-gradient-to-br from-[#FF9100]/20 to-[#FF9100]/10 rounded-lg p-5 border-2 border-[#FF9100]/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-[#FF9100] p-2.5 rounded-lg shadow-lg shadow-[#FF9100]/50">
                <FileJson className="w-5 h-5 text-white" />
              </div>
              <span className="text-neutral-400 text-sm">Toplam Veri</span>
            </div>
            <div className="font-bold text-2xl text-[#FF9100]">
              {dataStats.orders + dataStats.payments + dataStats.transactions} Kayıt
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {dataStats.orders} sipariş, {dataStats.payments} ödeme
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Manual Backup */}
          <button
            onClick={performBackup}
            className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] rounded-lg p-6 font-bold tracking-wide transition-all shadow-lg shadow-[#00E676]/40 active:scale-95 group"
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <Save className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-2xl">MANUEL YEDEKLEME</span>
            </div>
            <p className="text-sm opacity-80">Tüm verileri şimdi yedekle</p>
          </button>

          {/* Restore Backup */}
          <label className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 font-bold tracking-wide transition-all shadow-lg shadow-blue-500/40 active:scale-95 cursor-pointer group">
            <input
              id="backup-file-input"
              name="backupFile"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-3 mb-2">
              <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-2xl">VERİ GERİ YÜKLE</span>
            </div>
            <p className="text-sm opacity-80">Yedekleme dosyasından geri yükle</p>
          </label>
        </div>

        {/* Data Statistics */}
        <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl mb-6">
          <div className="p-5 border-b border-[#2C2C2C] bg-[#1E1E1E]">
            <h2 className="font-bold text-xl tracking-wide">VERİ İSTATİSTİKLERİ</h2>
            <p className="text-neutral-500 text-xs mt-1">Sistemdeki mevcut veri miktarları</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Masalar</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.tables}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Siparişler</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.orders}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Ödemeler</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.payments}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Zayi/Fire</span>
                <span className="font-bold text-xl text-red-400">{dataStats.wastes}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">İşlem Geçmişi</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.transactions}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Rezervasyonlar</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.reservations}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Stok Takibi</span>
                <span className="font-bold text-xl text-[#00E676]">{dataStats.inventory}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
                <span className="text-neutral-400">Toplam Kayıt</span>
                <span className="font-bold text-xl text-[#FF9100]">
                  {Object.values(dataStats).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#2C2C2C] bg-[#1E1E1E]">
            <h2 className="font-bold text-xl tracking-wide">YEDEKLEME AYARLARI</h2>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between p-5 bg-[#1E1E1E] rounded-lg border border-[#2C2C2C]">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${autoBackupEnabled ? 'bg-[#00E676]' : 'bg-neutral-600'}`}>
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Otomatik Günlük Yedekleme</h3>
                  <p className="text-neutral-500 text-sm">Her 24 saatte bir otomatik yedekleme yapılır</p>
                </div>
              </div>
              <button
                onClick={toggleAutoBackup}
                className={`relative w-16 h-8 rounded-full transition-colors ${
                  autoBackupEnabled ? 'bg-[#00E676]' : 'bg-neutral-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    autoBackupEnabled ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Warning */}
            <div className="mt-4 flex items-start gap-3 p-4 bg-[#FF9100]/10 border-2 border-[#FF9100]/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-[#FF9100] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#FF9100] mb-1">Önemli Uyarı</h4>
                <p className="text-neutral-400 text-sm">
                  Yedekleme dosyalarını güvenli bir yerde saklayın. Veri kaybı durumunda yedekten geri yükleme yapabilirsiniz.
                  Yedekleme dosyaları tüm POS verilerinizi içerir (siparişler, ödemeler, stok, rezervasyonlar).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-[#FF9100]" />
              Veri Geri Yükleme Onayı
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {pendingBackupData && (
                <div className="space-y-3 mt-3">
                  <p className="text-base">
                    <strong className="text-white">Yedekleme Tarihi:</strong>{' '}
                    {pendingBackupData.date}
                  </p>
                  <p className="text-base">
                    <strong className="text-white">İçerik:</strong>
                  </p>
                  <div className="bg-[#121212] p-3 rounded border border-[#2C2C2C] text-sm">
                    <div>• {pendingBackupData.data.tables?.length || 0} Masa</div>
                    <div>• {pendingBackupData.data.orders?.length || 0} Sipariş</div>
                    <div>• {pendingBackupData.data.payments?.length || 0} Ödeme</div>
                    <div>• {pendingBackupData.data.transactions?.length || 0} İşlem Kaydı</div>
                    <div>• {pendingBackupData.data.reservations?.length || 0} Rezervasyon</div>
                  </div>
                  <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded mt-3">
                    <p className="text-red-400 font-bold text-sm">
                      ⚠️ DİKKAT: Mevcut tüm veriler silinecek ve yedekten geri yüklenecektir!
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Geri Yükle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}