import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Save, X, Search, Tag, FolderPlus } from 'lucide-react';
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
import { CategoryManagement, CategorySettings } from './CategoryManagement';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  category: string;
  // Bira ürünleri için stok yönetimi alanları
  supplier?: string;
  currentStock?: number;
  minStock?: number;
  unit?: string;
}

interface ProductManagementScreenProps {
  onProductsUpdate: () => void;
}

// Varsayılan ürünler
const defaultProducts: ProductItem[] = [
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
];

// Kategori adları Türkçe
const categoryNames: { [key: string]: string } = {
  'biralar': '🍺 Biralar',
  'kokteyller': '🍹 Kokteyller',
  'atistirmalik': '🍔 Atıştırmalık'
};

export function ProductManagementScreen({ onProductsUpdate }: ProductManagementScreenProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['biralar', 'kokteyller', 'atistirmalik']);
  const [categoryNamesLocal, setCategoryNamesLocal] = useState<{ [key: string]: string }>(categoryNames);
  const [categorySettings, setCategorySettings] = useState<{ [key: string]: CategorySettings }>({
    biralar: { showInMenu: true, showInInventory: true },
    kokteyller: { showInMenu: true, showInInventory: true },
    atistirmalik: { showInMenu: true, showInInventory: true }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Form states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductItem | null>(null);
  
  // Category management states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'biralar',
    // Bira için stok yönetimi alanları
    supplier: '',
    currentStock: '',
    minStock: '',
    unit: 'adet'
  });

  // Load products from localStorage
  useEffect(() => {
    const savedProducts = localStorage.getItem('pos_products');
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch {
        setProducts(defaultProducts);
        localStorage.setItem('pos_products', JSON.stringify(defaultProducts));
      }
    } else {
      setProducts(defaultProducts);
      localStorage.setItem('pos_products', JSON.stringify(defaultProducts));
    }

    // Load categories from localStorage
    const savedCategories = localStorage.getItem('pos_categories');
    const savedCategoryNames = localStorage.getItem('pos_category_names');
    const savedCategorySettings = localStorage.getItem('pos_category_settings');
    
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch {
        // Varsayılan kategorileri kullan
      }
    }

    if (savedCategoryNames) {
      try {
        setCategoryNamesLocal(JSON.parse(savedCategoryNames));
      } catch {
        // Varsayılan kategori isimlerini kullan
      }
    }

    if (savedCategorySettings) {
      try {
        setCategorySettings(JSON.parse(savedCategorySettings));
      } catch {
        // Varsayılan kategori ayarlarını kullan
      }
    }
  }, []);

  // Save products to localStorage
  const saveProducts = (updatedProducts: ProductItem[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('pos_products', JSON.stringify(updatedProducts));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('products-updated'));
    
    onProductsUpdate();
  };

  // Add new product
  const handleAddProduct = () => {
    if (!formData.name.trim() || !formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Lütfen tüm alanları doldurun!');
      return;
    }

    // Generate ID based on category
    const categoryPrefix = formData.category.charAt(0);
    const existingIds = products
      .filter(p => p.category === formData.category)
      .map(p => parseInt(p.id.substring(1)))
      .filter(n => !isNaN(n));
    const newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newId = `${categoryPrefix}${newIdNumber}`;

    const newProduct: ProductItem = {
      id: newId,
      name: formData.name.toUpperCase().trim(),
      price: parseFloat(formData.price),
      category: formData.category,
      // Bira için stok yönetimi alanları
      supplier: formData.supplier,
      currentStock: formData.currentStock ? parseInt(formData.currentStock) : undefined,
      minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
      unit: formData.unit
    };

    const updatedProducts = [...products, newProduct];
    saveProducts(updatedProducts);

    toast.success('Ürün eklendi!', {
      description: `${newProduct.name} - ${newProduct.price} TL`
    });

    setShowAddDialog(false);
    resetForm();
  };

  // Edit product
  const handleEditProduct = () => {
    if (!currentProduct) return;

    if (!formData.name.trim() || !formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Lütfen tüm alanları doldurun!');
      return;
    }

    const updatedProducts = products.map(p => 
      p.id === currentProduct.id 
        ? { ...p, name: formData.name.toUpperCase().trim(), price: parseFloat(formData.price), category: formData.category,
            // Bira için stok yönetimi alanları
            supplier: formData.supplier,
            currentStock: formData.currentStock ? parseInt(formData.currentStock) : undefined,
            minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
            unit: formData.unit
          }
        : p
    );

    saveProducts(updatedProducts);

    toast.success('Ürün güncellendi!', {
      description: `${formData.name} - ${formData.price} TL`
    });

    setShowEditDialog(false);
    setCurrentProduct(null);
    resetForm();
  };

  // Delete product
  const handleDeleteProduct = () => {
    if (!currentProduct) return;

    const updatedProducts = products.filter(p => p.id !== currentProduct.id);
    saveProducts(updatedProducts);

    toast.success('Ürün silindi!', {
      description: currentProduct.name
    });

    setShowDeleteDialog(false);
    setCurrentProduct(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      category: 'biralar',
      // Bira için stok yönetimi alanları
      supplier: '',
      currentStock: '',
      minStock: '',
      unit: 'adet'
    });
  };

  const openEditDialog = (product: ProductItem) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      // Bira için stok yönetimi alanları
      supplier: product.supplier || '',
      currentStock: product.currentStock ? product.currentStock.toString() : '',
      minStock: product.minStock ? product.minStock.toString() : '',
      unit: product.unit || 'adet'
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (product: ProductItem) => {
    setCurrentProduct(product);
    setShowDeleteDialog(true);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const productsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = filteredProducts.filter(p => p.category === cat);
    return acc;
  }, {} as { [key: string]: ProductItem[] });

  // Statistics
  const totalProducts = products.length;
  const productsByCategories = categories.map(cat => ({
    name: categoryNamesLocal[cat],
    count: products.filter(p => p.category === cat).length
  }));

  return (
    <div className="h-full bg-[#1E1E1E] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#00E676] p-3 rounded-lg shadow-lg shadow-[#00E676]/50">
                <Package className="w-6 h-6 text-[#121212]" />
              </div>
              <div>
                <h1 className="font-bold text-3xl tracking-wider">ÜRÜN YÖNETİMİ</h1>
                <p className="text-neutral-500 text-sm">Ürün ekle, düzenle ve sil</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-[#FF9100] hover:bg-[#FF9100]/90 text-[#121212] rounded-lg px-6 py-3 font-bold tracking-wide transition-all shadow-lg shadow-[#FF9100]/40 active:scale-95 flex items-center gap-2"
              >
                <Tag className="w-5 h-5" />
                KATEGORİ YÖNETİMİ
              </button>
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] rounded-lg px-6 py-3 font-bold tracking-wide transition-all shadow-lg shadow-[#00E676]/40 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                YENİ ÜRÜN EKLE
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#00E676]/20 to-[#00E676]/10 rounded-lg p-4 border-2 border-[#00E676]/30">
              <div className="text-neutral-400 text-sm mb-1">Toplam Ürün</div>
              <div className="font-bold text-3xl text-[#00E676]">{totalProducts}</div>
            </div>
            {productsByCategories.map((cat, idx) => (
              <div key={idx} className="bg-[#121212] rounded-lg p-4 border-2 border-[#2C2C2C]">
                <div className="text-neutral-400 text-sm mb-1">{cat.name}</div>
                <div className="font-bold text-3xl text-white">{cat.count}</div>
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg pl-12 pr-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{categoryNamesLocal[cat]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products List by Category */}
        {selectedCategory === 'all' ? (
          categories.map(category => (
            <div key={category} className="mb-6">
              <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
                  <h2 className="font-bold text-xl tracking-wide">{categoryNamesLocal[category]}</h2>
                  <p className="text-neutral-500 text-xs mt-1">
                    {productsByCategory[category].length} ürün
                  </p>
                </div>

                <div className="p-4">
                  {productsByCategory[category].length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      Bu kategoride ürün bulunmuyor
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productsByCategory[category].map(product => (
                        <div
                          key={product.id}
                          className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2C2C2C] hover:border-[#00E676] transition-all group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-white mb-1">{product.name}</h3>
                              <p className="text-[#00E676] font-bold text-xl">{product.price} TL</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditDialog(product)}
                                className="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={() => openDeleteDialog(product)}
                                className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-neutral-500">ID: {product.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
              <h2 className="font-bold text-xl tracking-wide">{categoryNamesLocal[selectedCategory]}</h2>
              <p className="text-neutral-500 text-xs mt-1">
                {filteredProducts.length} ürün
              </p>
            </div>

            <div className="p-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Ürün bulunamadı
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2C2C2C] hover:border-[#00E676] transition-all group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-1">{product.name}</h3>
                          <p className="text-[#00E676] font-bold text-xl">{product.price} TL</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditDialog(product)}
                            className="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(product)}
                            className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500">ID: {product.id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Product Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="w-6 h-6 text-[#00E676]" />
              Yeni Ürün Ekle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Menüye yeni bir ürün ekleyin. Ürün adı, fiyat ve kategori bilgilerini girin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Ürün Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ör: EFES PİLSEN"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Fiyat (TL)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="45"
                min="0"
                step="0.01"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryNamesLocal[cat]}</option>
                ))}
              </select>
            </div>

            {/* Bira için stok yönetimi alanları - Sadece biralar kategorisinde göster */}
            {formData.category === 'biralar' && (
              <div className="space-y-4 p-4 bg-[#00E676]/5 border border-[#00E676]/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[#00E676]" />
                  <span className="text-sm font-bold text-[#00E676]">STOK YÖNETİMİ BİLGİLERİ</span>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Tedarikçi</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Ör: Anadolu Efes"
                    className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-2">Mevcut Stok</label>
                    <input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      placeholder="24"
                      min="0"
                      className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-2">Min. Stok</label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      placeholder="12"
                      min="0"
                      className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Birim</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="adet"
                    className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddProduct}
              className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212]"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Product Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Edit2 className="w-6 h-6 text-blue-500" />
              Ürün Düzenle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Seçili ürünün bilgilerini güncelleyin. İsim, fiyat ve kategori değiştirebilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Ürün Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Fiyat (TL)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                min="0"
                step="0.01"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{categoryNamesLocal[cat]}</option>
                ))}
              </select>
            </div>

            {/* Bira için stok yönetimi alanları - Sadece biralar kategorisinde göster */}
            {formData.category === 'biralar' && (
              <div className="space-y-4 p-4 bg-[#00E676]/5 border border-[#00E676]/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[#00E676]" />
                  <span className="text-sm font-bold text-[#00E676]">STOK YÖNETİMİ BİLGİLERİ</span>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Tedarikçi</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-2">Mevcut Stok</label>
                    <input
                      type="number"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      min="0"
                      className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-2">Min. Stok</label>
                    <input
                      type="number"
                      value={formData.minStock}
                      onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                      min="0"
                      className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">Birim</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditProduct}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Güncelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-6 h-6 text-red-500" />
              Ürünü Sil
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {currentProduct && (
                <div className="space-y-3 mt-3">
                  <p className="text-base">
                    <strong className="text-white">{currentProduct.name}</strong> ürününü silmek istediğinize emin misiniz?
                  </p>
                  <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded">
                    <p className="text-red-400 text-sm">
                      ⚠️ Bu işlem geri alınamaz!
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
              onClick={handleDeleteProduct}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Management Modal */}
      <CategoryManagement
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        categoryNames={categoryNamesLocal}
        categorySettings={categorySettings}
        onCategoriesUpdate={(newCategories, newCategoryNames, newCategorySettings) => {
          setCategories(newCategories);
          setCategoryNamesLocal(newCategoryNames);
          setCategorySettings(newCategorySettings);
          // Save to localStorage
          localStorage.setItem('pos_categories', JSON.stringify(newCategories));
          localStorage.setItem('pos_category_names', JSON.stringify(newCategoryNames));
          localStorage.setItem('pos_category_settings', JSON.stringify(newCategorySettings));
          // Notify other components
          window.dispatchEvent(new Event('categories-updated'));
          window.dispatchEvent(new Event('products-updated'));
          onProductsUpdate();
        }}
        productsInCategories={categories.reduce((acc, cat) => {
          acc[cat] = products.filter(p => p.category === cat).length;
          return acc;
        }, {} as { [key: string]: number })}
      />
    </div>
  );
}