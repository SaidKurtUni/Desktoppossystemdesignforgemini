import { TrendingUp, Banknote, CreditCard, AlertCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Table {
  id: string;
  name: string;
  type: 'round' | 'square';
  occupied: boolean;
  position: { x: number; y: number };
  guests?: number;
  currentBill?: number;
}

interface Order {
  id: string;
  tableNumber: number;
  items: string;
  orderItems: { id: string; name: string; price: number; isPaid: boolean }[];
  status: 'preparing' | 'served';
  time: string;
  timestamp: number;
  totalAmount: number;
  paymentMethod?: 'cash' | 'card' | 'split';
  cashAmount?: number;
  cardAmount?: number;
}

interface Payment {
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

interface WasteItem {
  id: string;
  name: string;
  price: number;
  tableNumber: number;
  timestamp: number;
  time: string;
  reason: string; // İptal sebebi
  type: 'waste' | 'delete'; // Yeni alan
}

interface ReportScreenProps {
  tables: Table[];
  orders: Order[];
  payments: Payment[];
  wastes: WasteItem[];
}

interface ProductSales {
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
}

export function ReportScreen({ tables, orders, payments, wastes }: ReportScreenProps) {
  // Toplam ciro hesaplama - sadece tamamlanmış ödemelerden
  const totalRevenue = payments.reduce((sum, payment) => {
    return sum + payment.totalAmount;
  }, 0);

  // Nakit ve Kart toplamları
  const cashTotal = payments.reduce((sum, payment) => {
    return sum + payment.cashAmount;
  }, 0);
  const creditCardTotal = payments.reduce((sum, payment) => {
    return sum + payment.cardAmount;
  }, 0);

  // Zayi/Fire - sadece type === 'waste' olanlar
  const totalWaste = wastes.filter(w => w.type === 'waste').reduce((sum, waste) => {
    return sum + waste.price;
  }, 0);

  // Ürün bazında satış analizi
  const productSales: { [key: string]: ProductSales } = {};

  orders.forEach(order => {
    // orderItems array'ini kullan - zayi/fire yapılan ürünler zaten buradan çıkarılmış
    order.orderItems.forEach(item => {
      const productName = item.name;
      const productPrice = item.price;
      
      // Kategori belirleme (basit string matching)
      let category = 'Diğer';
      const lowerName = productName.toLowerCase();
      if (lowerName.includes('bira') || lowerName.includes('efes') || 
          lowerName.includes('bomonti') || lowerName.includes('tuborg') ||
          lowerName.includes('corona') || lowerName.includes('heineken') ||
          lowerName.includes('carlsberg') || lowerName.includes('amsterdam') ||
          lowerName.includes('miller') || lowerName.includes('becks')) {
        category = 'Bira';
      } else if (lowerName.includes('kokteyl') || lowerName.includes('mojito') ||
                 lowerName.includes('margarita') || lowerName.includes('cosmopolitan') ||
                 lowerName.includes('long island') || lowerName.includes('piña colada') ||
                 lowerName.includes('old fashioned') || lowerName.includes('negroni') ||
                 lowerName.includes('aperol') || lowerName.includes('whiskey sour')) {
        category = 'Kokteyl';
      } else {
        category = 'Yemek';
      }

      if (!productSales[productName]) {
        productSales[productName] = {
          name: productName,
          category,
          quantitySold: 0,
          revenue: 0,
        };
      }
      
      productSales[productName].quantitySold += 1;
      productSales[productName].revenue += productPrice;
    });
  });

  // Ürünleri satış miktarına göre sırala
  const sortedProducts = Object.values(productSales).sort((a, b) => b.quantitySold - a.quantitySold);

  // Zayi/Fire ürünlerini tutara göre sırala
  const wasteProducts: { [key: string]: { name: string; quantity: number; totalPrice: number; lastTime: string; lastTableNumber: number; reasons: string[] } } = {};
  
  wastes.filter(w => w.type === 'waste').forEach(waste => {
    if (!wasteProducts[waste.name]) {
      wasteProducts[waste.name] = {
        name: waste.name,
        quantity: 0,
        totalPrice: 0,
        lastTime: waste.time,
        lastTableNumber: waste.tableNumber,
        reasons: []
      };
    }
    wasteProducts[waste.name].quantity += 1;
    wasteProducts[waste.name].totalPrice += waste.price;
    wasteProducts[waste.name].reasons.push(waste.reason);
    // En son fire edilen zaman ve masa bilgisini tut
    if (waste.timestamp > new Date(`${new Date().toDateString()} ${wasteProducts[waste.name].lastTime}`).getTime()) {
      wasteProducts[waste.name].lastTime = waste.time;
      wasteProducts[waste.name].lastTableNumber = waste.tableNumber;
    }
  });

  const sortedWastes = Object.values(wasteProducts).sort((a, b) => b.totalPrice - a.totalPrice);
  
  // Aktif sipariş iptalleri (type === 'delete') - gruplandırılmış
  const deletedProducts: { [key: string]: { name: string; quantity: number; totalPrice: number; reasons: string[] } } = {};
  
  wastes.filter(w => w.type === 'delete').forEach(waste => {
    if (!deletedProducts[waste.name]) {
      deletedProducts[waste.name] = {
        name: waste.name,
        quantity: 0,
        totalPrice: 0,
        reasons: []
      };
    }
    deletedProducts[waste.name].quantity += 1;
    deletedProducts[waste.name].totalPrice += waste.price;
    deletedProducts[waste.name].reasons.push(waste.reason);
  });

  const sortedDeletedProducts = Object.values(deletedProducts).sort((a, b) => b.totalPrice - a.totalPrice);
  
  // Sebep bazlı istatistikler - Zayi/Fire
  const wasteReasons: { [key: string]: { count: number; total: number } } = {};
  wastes.filter(w => w.type === 'waste').forEach(waste => {
    if (!wasteReasons[waste.reason]) {
      wasteReasons[waste.reason] = { count: 0, total: 0 };
    }
    wasteReasons[waste.reason].count += 1;
    wasteReasons[waste.reason].total += waste.price;
  });

  // Sebep bazlı istatistikler - İptal
  const deleteReasons: { [key: string]: { count: number; total: number } } = {};
  wastes.filter(w => w.type === 'delete').forEach(waste => {
    if (!deleteReasons[waste.reason]) {
      deleteReasons[waste.reason] = { count: 0, total: 0 };
    }
    deleteReasons[waste.reason].count += 1;
    deleteReasons[waste.reason].total += waste.price;
  });

  const deletedItems = wastes.filter(w => w.type === 'delete');

  const cashPercentage = totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 0;
  const cardPercentage = totalRevenue > 0 ? (creditCardTotal / totalRevenue) * 100 : 0;
  const wastePercentage = totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0;

  // PDF Export fonksiyonu
  const exportToPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Türkçe karakter dönüştürme helper fonksiyonu
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
      doc.text(turkishToAscii('GOA PUB - GÜN SONU RAPORU'), pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(turkishToAscii(dateStr), pageWidth / 2, 28, { align: 'center' });
      
      // Özet Bilgiler
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
      
      // Satılan Ürünler Tablosu
      if (sortedProducts.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(turkishToAscii('SATILAN ÜRÜNLER'), 14, yPos);
        yPos += 5;
        
        const tableData = sortedProducts.map((product, index) => [
          (index + 1).toString(),
          turkishToAscii(product.name),
          turkishToAscii(product.category),
          product.quantitySold.toString(),
          `${product.revenue.toFixed(0)} TL`
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [[turkishToAscii('Sıra'), turkishToAscii('Ürün Adı'), turkishToAscii('Kategori'), turkishToAscii('Satılan Adet'), turkishToAscii('Toplam Tutar')]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [44, 44, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9 },
          foot: [[
            '',
            'TOPLAM',
            '',
            sortedProducts.reduce((sum, p) => sum + p.quantitySold, 0).toString() + ' Adet',
            totalRevenue.toFixed(0) + ' TL'
          ]],
          footStyles: { fillColor: [30, 30, 30], textColor: [0, 230, 118], fontStyle: 'bold' }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Zayi/Fire Tablosu
      if (sortedWastes.length > 0) {
        // Yeni sayfa gerekirse ekle
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68); // red-500
        doc.text(turkishToAscii('ZAYİ / FİRE ÜRÜNLER'), 14, yPos);
        doc.setTextColor(0, 0, 0); // reset to black
        yPos += 5;
        
        const wasteTableData = sortedWastes.map((waste) => [
          turkishToAscii(waste.name),
          `${waste.quantity} Adet`,
          turkishToAscii(waste.reasons.join(', ')),
          `${waste.totalPrice.toFixed(0)} TL`
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [[turkishToAscii('Ürün Adı'), turkishToAscii('Fire Adet'), turkishToAscii('Sebepler'), turkishToAscii('Toplam Tutar')]],
          body: wasteTableData,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: {
            2: { cellWidth: 'auto' }
          },
          foot: [[
            'TOPLAM FIRE',
            sortedWastes.reduce((sum, w) => sum + w.quantity, 0).toString() + ' Adet',
            '',
            totalWaste.toFixed(0) + ' TL'
          ]],
          footStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // İptal Edilen Ürünler Tablosu
      if (sortedDeletedProducts.length > 0) {
        // Yeni sayfa gerekirse ekle
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 145, 0); // FF9100
        doc.text(turkishToAscii('İPTAL EDİLEN ÜRÜNLER'), 14, yPos);
        doc.setTextColor(0, 0, 0); // reset to black
        yPos += 5;
        
        const deletedTableData = sortedDeletedProducts.map((product) => [
          turkishToAscii(product.name),
          `${product.quantity} Adet`,
          turkishToAscii(product.reasons.join(', ')),
          `${product.totalPrice.toFixed(0)} TL`
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [[turkishToAscii('Ürün Adı'), turkishToAscii('İptal Adet'), turkishToAscii('Sebepler'), turkishToAscii('Toplam Tutar')]],
          body: deletedTableData,
          theme: 'grid',
          headStyles: { fillColor: [255, 145, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: {
            2: { cellWidth: 'auto' }
          },
          foot: [[
            'TOPLAM İPTAL',
            sortedDeletedProducts.reduce((sum, p) => sum + p.quantity, 0).toString() + ' Adet',
            '',
            sortedDeletedProducts.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(0) + ' TL'
          ]],
          footStyles: { fillColor: [200, 100, 0], textColor: [255, 255, 255], fontStyle: 'bold' }
        });
      }
      
      // PDF'i kaydet
      const fileName = `Goa_Pub_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF başarıyla indirildi!', {
        description: fileName
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('PDF oluşturulurken hata oluştu!');
    }
  };

  // Excel Export fonksiyonu
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      const wb = XLSX.utils.book_new();
      
      // Özet Sayfa
      const summaryData = [
        ['GOA PUB - GÜN SONU RAPORU'],
        [new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
        [],
        ['ÖZET BİLGİLER'],
        ['Toplam Ciro', `${totalRevenue.toFixed(0)} TL`],
        ['Nakit Ödeme', `${cashTotal.toFixed(0)} TL`, `${cashPercentage.toFixed(1)}%`],
        ['Kredi Kartı', `${creditCardTotal.toFixed(0)} TL`, `${cardPercentage.toFixed(1)}%`],
        ['Zayi/Fire', `${totalWaste.toFixed(0)} TL`, `${wastePercentage.toFixed(2)}%`],
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Sütun genişlikleri
      summaryWS['!cols'] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 10 }
      ];
      
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Özet');
      
      // Satılan Ürünler Sayfası - HER ZAMAN EKLE
      const productsData = [
        ['SATILAN ÜRÜNLER'],
        [],
        ['Sıra', 'Ürün Adı', 'Kategori', 'Satılan Adet', 'Toplam Tutar (TL)']
      ];
      
      if (sortedProducts.length > 0) {
        sortedProducts.forEach((product, index) => {
          productsData.push([
            index + 1,
            product.name,
            product.category,
            product.quantitySold,
            parseFloat(product.revenue.toFixed(0))
          ]);
        });
        
        productsData.push([]);
        productsData.push([
          '',
          'TOPLAM',
          '',
          sortedProducts.reduce((sum, p) => sum + p.quantitySold, 0),
          parseFloat(totalRevenue.toFixed(0))
        ]);
      } else {
        productsData.push(['Henüz satış yapılmamış']);
      }
      
      const productsWS = XLSX.utils.aoa_to_sheet(productsData);
      
      // Sütun genişlikleri
      productsWS['!cols'] = [
        { wch: 8 },
        { wch: 25 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 }
      ];
      
      XLSX.utils.book_append_sheet(wb, productsWS, 'Satılan Ürünler');
      
      // Zayi/Fire Sayfası - HER ZAMAN EKLE
      const wasteData = [
        ['ZAYİ / FİRE ÜRÜNLER'],
        [],
        ['Ürün Adı', 'Fire Adet', 'Sebepler', 'Toplam Tutar (TL)']
      ];
      
      if (sortedWastes.length > 0) {
        sortedWastes.forEach((waste) => {
          wasteData.push([
            waste.name,
            waste.quantity,
            waste.reasons.join(', '),
            parseFloat(waste.totalPrice.toFixed(0))
          ]);
        });
        
        wasteData.push([]);
        wasteData.push([
          'TOPLAM FIRE',
          sortedWastes.reduce((sum, w) => sum + w.quantity, 0),
          '',
          parseFloat(totalWaste.toFixed(0))
        ]);
      } else {
        wasteData.push(['Zayi/Fire kaydı yok']);
      }
      
      const wasteWS = XLSX.utils.aoa_to_sheet(wasteData);
      
      // Sütun genişlikleri
      wasteWS['!cols'] = [
        { wch: 25 },
        { wch: 12 },
        { wch: 40 },
        { wch: 20 }
      ];
      
      XLSX.utils.book_append_sheet(wb, wasteWS, 'Zayi Fire');
      
      // İptal Edilen Ürünler Sayfası
      if (sortedDeletedProducts.length > 0) {
        const deletedData = [
          ['İPTAL EDİLEN ÜRÜNLER'],
          [],
          ['Ürün Adı', 'İptal Adet', 'Sebepler', 'Toplam Tutar (TL)']
        ];
        
        sortedDeletedProducts.forEach((product) => {
          deletedData.push([
            product.name,
            product.quantity,
            product.reasons.join(', '),
            parseFloat(product.totalPrice.toFixed(0))
          ]);
        });
        
        deletedData.push([]);
        deletedData.push([
          'TOPLAM İPTAL',
          sortedDeletedProducts.reduce((sum, p) => sum + p.quantity, 0),
          '',
          parseFloat(sortedDeletedProducts.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(0))
        ]);
        
        const deletedWS = XLSX.utils.aoa_to_sheet(deletedData);
        
        // Sütun genişlikleri
        deletedWS['!cols'] = [
          { wch: 25 },
          { wch: 12 },
          { wch: 40 },
          { wch: 20 }
        ];
        
        XLSX.utils.book_append_sheet(wb, deletedWS, 'İptal Edilen Ürünler');
      }
      
      // Excel dosyasını kaydet
      const fileName = `Goa_Pub_Rapor_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Excel başarıyla indirildi!', {
        description: fileName
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel oluşturulurken hata oluştu!');
    }
  };

  return (
    <div className="h-full bg-[#1E1E1E] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-bold text-3xl tracking-wider mb-1">GÜN SONU RAPORU</h1>
          <p className="text-neutral-500 text-sm">
            {new Date().toLocaleDateString('tr-TR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Summary Cards - 4 Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-[#00E676]/20 to-[#00E676]/10 rounded-lg p-5 border-2 border-[#00E676]/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-[#00E676] p-2.5 rounded-lg shadow-lg shadow-[#00E676]/50">
                <TrendingUp className="w-5 h-5 text-[#121212]" />
              </div>
              <span className="text-neutral-400 text-sm">Toplam Ciro</span>
            </div>
            <div className="font-bold text-3xl text-[#00E676]">
              {totalRevenue.toFixed(0)} TL
            </div>
          </div>

          {/* Cash Total */}
          <div className="bg-gradient-to-br from-[#FF9100]/20 to-[#FF9100]/10 rounded-lg p-5 border-2 border-[#FF9100]/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-[#FF9100] p-2.5 rounded-lg shadow-lg shadow-[#FF9100]/50">
                <Banknote className="w-5 h-5 text-[#121212]" />
              </div>
              <span className="text-neutral-400 text-sm">Nakit</span>
            </div>
            <div className="font-bold text-3xl text-[#FF9100]">
              {cashTotal.toFixed(0)} TL
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {cashPercentage.toFixed(1)}% toplam
            </div>
          </div>

          {/* Credit Card Total */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg p-5 border-2 border-blue-500/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500 p-2.5 rounded-lg shadow-lg shadow-blue-500/50">
                <CreditCard className="w-5 h-5 text-[#121212]" />
              </div>
              <span className="text-neutral-400 text-sm">Kredi Kartı</span>
            </div>
            <div className="font-bold text-3xl text-blue-400">
              {creditCardTotal.toFixed(0)} TL
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {cardPercentage.toFixed(1)}% toplam
            </div>
          </div>

          {/* Total Waste/Loss */}
          <div className="bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-lg p-5 border-2 border-red-500/30 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-500 p-2.5 rounded-lg shadow-lg shadow-red-500/50">
                <AlertCircle className="w-5 h-5 text-[#121212]" />
              </div>
              <span className="text-neutral-400 text-sm">Zayi / Fire</span>
            </div>
            <div className="font-bold text-3xl text-red-500">
              {totalWaste.toFixed(0)} TL
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              {wastePercentage.toFixed(2)}% zarar
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#2C2C2C] bg-[#1E1E1E]">
            <h2 className="font-bold text-xl tracking-wide">SATILAN ÜRÜNLER</h2>
            <p className="text-neutral-500 text-xs mt-1">En çok satılandan aza doğru sıralanmış</p>
          </div>

          {sortedProducts.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-[#2C2C2C] rounded-full mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-neutral-600" />
              </div>
              <h3 className="font-bold text-xl text-neutral-500 mb-2">Henüz Satış Yok</h3>
              <p className="text-neutral-600 text-sm">Sipariş ekranından ürün ekleyip satış yapın</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#2C2C2C]">
                    <tr>
                      <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">SIRA</th>
                      <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">ÜRÜN ADI</th>
                      <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">KATEGORİ</th>
                      <th className="text-right p-4 text-neutral-400 font-bold text-sm tracking-wide">SATILAN ADET</th>
                      <th className="text-right p-4 text-neutral-400 font-bold text-sm tracking-wide">TOPLAM TUTAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((product, index) => (
                      <tr
                        key={product.name}
                        className={`border-t border-[#2C2C2C] transition-colors hover:bg-[#1E1E1E] ${
                          index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1A1A1A]'
                        }`}
                      >
                        <td className="p-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-lg ${
                            index === 0 ? 'bg-[#FFC400] text-[#121212] shadow-[#FFC400]/50' :
                            index === 1 ? 'bg-neutral-400 text-[#121212] shadow-neutral-400/50' :
                            index === 2 ? 'bg-[#FF9100] text-[#121212] shadow-[#FF9100]/50' :
                            'bg-[#2C2C2C] text-neutral-500'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-white">{product.name}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            product.category === 'Bira' ? 'bg-[#FFC400]/20 text-[#FFC400] border border-[#FFC400]/30' :
                            product.category === 'Kokteyl' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-[#FF9100]/20 text-[#FF9100] border border-[#FF9100]/30'
                          }`}>
                            {product.category}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold text-[#00E676]">{product.quantitySold}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold text-white">{product.revenue.toFixed(0)} TL</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Footer */}
              <div className="p-5 border-t-2 border-[#2C2C2C] bg-[#1E1E1E]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-bold">Toplam Satılan Ürün:</span>
                  <span className="font-bold text-2xl text-[#00E676]">
                    {sortedProducts.reduce((sum, p) => sum + p.quantitySold, 0)} Adet
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Waste/Fire Products Table */}
        {sortedWastes.length > 0 && (
          <div className="bg-[#121212] rounded-lg border-2 border-red-500/30 overflow-hidden shadow-xl mt-6">
            <div className="p-5 border-b border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5">
              <h2 className="font-bold text-xl tracking-wide text-red-400">ZAYİ / FİRE ÜRÜNLER</h2>
              <p className="text-neutral-500 text-xs mt-1">Hesaptan çıkarılan fire ürünler (sebepleriyle)</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2C2C2C]">
                  <tr>
                    <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">ÜRÜN ADI</th>
                    <th className="text-center p-4 text-neutral-400 font-bold text-sm tracking-wide">ZAYİ / FİRE ADET</th>
                    <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">SEBEPLER</th>
                    <th className="text-right p-4 text-neutral-400 font-bold text-sm tracking-wide">TOPLAM TUTAR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWastes.map((waste, index) => (
                    <tr
                      key={waste.name}
                      className={`border-t border-[#2C2C2C] transition-colors hover:bg-red-500/5 ${
                        index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1A1A1A]'
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-bold text-white">{waste.name}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-bold border border-red-500/30">
                          {waste.quantity} Adet
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {waste.reasons.map((reason, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#FF9100]/20 text-[#FF9100] rounded text-xs border border-[#FF9100]/30">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-red-400">{waste.totalPrice.toFixed(0)} TL</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Waste Summary Footer */}
            <div className="p-5 border-t-2 border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-neutral-400 font-bold">Toplam Fire:</span>
                </div>
                <span className="font-bold text-2xl text-red-400">
                  {sortedWastes.reduce((sum, w) => sum + w.quantity, 0)} Adet - {totalWaste.toFixed(0)} TL
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* İptal Edilen Ürünler Detay Tablosu - Sadece type === 'delete' olanlar */}
        {sortedDeletedProducts.length > 0 && (
          <div className="bg-[#121212] rounded-lg border-2 border-[#FF9100]/30 overflow-hidden shadow-xl mt-6">
            <div className="p-5 border-b border-[#FF9100]/30 bg-gradient-to-r from-[#FF9100]/10 to-[#FF9100]/5">
              <h2 className="font-bold text-xl tracking-wide text-[#FF9100]">İPTAL EDİLEN ÜRÜNLER DETAYI</h2>
              <p className="text-neutral-500 text-xs mt-1">Aktif siparişlerden iptal edilen ürünler</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#2C2C2C]">
                  <tr>
                    <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">ÜRÜN ADI</th>
                    <th className="text-center p-4 text-neutral-400 font-bold text-sm tracking-wide">İPTAL ADET</th>
                    <th className="text-left p-4 text-neutral-400 font-bold text-sm tracking-wide">SEBEPLER</th>
                    <th className="text-right p-4 text-neutral-400 font-bold text-sm tracking-wide">TOPLAM TUTAR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDeletedProducts.map((product, index) => (
                    <tr
                      key={product.name}
                      className={`border-t border-[#2C2C2C] transition-colors hover:bg-[#FF9100]/5 ${
                        index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1A1A1A]'
                      }`}
                    >
                      <td className="p-4">
                        <span className="font-bold text-white">{product.name}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg font-bold border border-red-500/30">
                          {product.quantity} Adet
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {product.reasons.map((reason, idx) => (
                            <span key={idx} className="px-2 py-1 bg-[#FF9100]/20 text-[#FF9100] rounded text-xs border border-[#FF9100]/30">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-red-400">{product.totalPrice.toFixed(0)} TL</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="mt-5 flex gap-3 justify-end">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-6 py-3 bg-[#2C2C2C] hover:bg-[#333333] text-white rounded-lg font-bold tracking-wide transition-all shadow-lg active:scale-95"
          >
            <FileDown className="w-5 h-5" />
            PDF Dışa Aktar
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] rounded-lg font-bold tracking-wide transition-all shadow-lg shadow-[#00E676]/40 active:scale-95"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Excel Dışa Aktar
          </button>
        </div>
      </div>
    </div>
  );
}