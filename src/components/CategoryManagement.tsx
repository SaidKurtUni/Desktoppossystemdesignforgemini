import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Tag, Eye, EyeOff, Beaker } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from './ui/switch';
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

export interface CategorySettings {
  showInMenu: boolean;
  showInInventory: boolean;
  requiresIngredients: boolean; // Hammadde gerektiren kategori mi?
}

interface CategoryManagementProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  categoryNames: { [key: string]: string };
  categorySettings: { [key: string]: CategorySettings };
  onCategoriesUpdate: (categories: string[], categoryNames: { [key: string]: string }, categorySettings: { [key: string]: CategorySettings }) => void;
  productsInCategories: { [key: string]: number };
}

export function CategoryManagement({
  isOpen,
  onClose,
  categories,
  categoryNames,
  categorySettings,
  onCategoriesUpdate,
  productsInCategories
}: CategoryManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');
  const [requiresIngredients, setRequiresIngredients] = useState(false);

  const handleAddCategory = () => {
    if (!newCategoryId.trim() || !newCategoryName.trim()) {
      toast.error('Lütfen tüm alanları doldurun!');
      return;
    }

    // ID kontrolü - benzersiz olmalı
    if (categories.includes(newCategoryId.toLowerCase())) {
      toast.error('Bu kategori ID\'si zaten kullanılıyor!');
      return;
    }

    const updatedCategories = [...categories, newCategoryId.toLowerCase()];
    const updatedCategoryNames = {
      ...categoryNames,
      [newCategoryId.toLowerCase()]: `${newCategoryEmoji} ${newCategoryName}`
    };
    const updatedCategorySettings: { [key: string]: CategorySettings } = {
      ...categorySettings,
      [newCategoryId.toLowerCase()]: { 
        showInMenu: true, 
        showInInventory: true,
        requiresIngredients: requiresIngredients
      }
    };

    onCategoriesUpdate(updatedCategories, updatedCategoryNames, updatedCategorySettings);

    toast.success('Kategori eklendi!', {
      description: `${newCategoryEmoji} ${newCategoryName} ${requiresIngredients ? '(Hammaddeli)' : '(Hammaddesiz)'}`
    });

    setShowAddDialog(false);
    resetForm();
  };

  const handleEditCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Kategori adı boş olamaz!');
      return;
    }

    const updatedCategoryNames = {
      ...categoryNames,
      [currentCategory]: `${newCategoryEmoji} ${newCategoryName}`
    };

    const updatedCategorySettings = {
      ...categorySettings,
      [currentCategory]: {
        ...categorySettings[currentCategory],
        requiresIngredients: requiresIngredients
      }
    };

    onCategoriesUpdate(categories, updatedCategoryNames, updatedCategorySettings);

    toast.success('Kategori güncellendi!');

    setShowEditDialog(false);
    resetForm();
  };

  const handleDeleteCategory = () => {
    // Kategoride ürün varsa silmeyi engelle
    if (productsInCategories[currentCategory] > 0) {
      toast.error('Bu kategoride ürün var!', {
        description: 'Önce kategorideki tüm ürünleri silin veya başka kategoriye taşıyın.'
      });
      return;
    }

    const updatedCategories = categories.filter(cat => cat !== currentCategory);
    const updatedCategoryNames = { ...categoryNames };
    delete updatedCategoryNames[currentCategory];
    const updatedCategorySettings = { ...categorySettings };
    delete updatedCategorySettings[currentCategory];

    onCategoriesUpdate(updatedCategories, updatedCategoryNames, updatedCategorySettings);

    toast.success('Kategori silindi!');

    setShowDeleteDialog(false);
    setCurrentCategory('');
  };

  const resetForm = () => {
    setNewCategoryId('');
    setNewCategoryName('');
    setNewCategoryEmoji('📦');
    setRequiresIngredients(false);
    setCurrentCategory('');
  };

  const openEditDialog = (category: string) => {
    setCurrentCategory(category);
    const fullName = categoryNames[category] || '';
    // Emoji ve ismi ayır
    const emojiMatch = fullName.match(/^(\p{Emoji})\s+(.+)$/u);
    if (emojiMatch) {
      setNewCategoryEmoji(emojiMatch[1]);
      setNewCategoryName(emojiMatch[2]);
    } else {
      setNewCategoryEmoji('📦');
      setNewCategoryName(fullName);
    }
    // Mevcut requiresIngredients ayarını yükle
    setRequiresIngredients(categorySettings[category]?.requiresIngredients || false);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: string) => {
    setCurrentCategory(category);
    setShowDeleteDialog(true);
  };

  const toggleCategorySetting = (category: string, setting: 'showInMenu' | 'showInInventory') => {
    const updatedSettings = {
      ...categorySettings,
      [category]: {
        ...categorySettings[category],
        [setting]: !categorySettings[category]?.[setting]
      }
    };
    onCategoriesUpdate(categories, categoryNames, updatedSettings);
    
    const settingName = setting === 'showInMenu' ? 'Menü' : 'Stok';
    const newValue = updatedSettings[category][setting];
    toast.success(`${categoryNames[category]} ${settingName}'de ${newValue ? 'gösteriliyor' : 'gizlendi'}`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop & Modal */}
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-[#1E1E1E] rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto border-2 border-[#00E676]" 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF9100] p-3 rounded-lg shadow-lg shadow-[#FF9100]/50">
                <Tag className="w-6 h-6 text-[#121212]" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-wider">KATEGORİ YÖNETİMİ</h2>
                <p className="text-neutral-500 text-sm">Kategori ekle, düzenle ve sil</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] rounded-lg px-4 py-2 font-bold tracking-wide transition-all shadow-lg shadow-[#00E676]/40 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Kategori Ekle
              </button>
              <button
                onClick={onClose}
                className="bg-[#2C2C2C] hover:bg-[#333333] text-white rounded-lg p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            {categories.map(category => (
              <div
                key={category}
                className="bg-[#121212] rounded-lg p-4 border-2 border-[#2C2C2C] hover:border-[#00E676] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xl">{categoryNames[category]}</span>
                      <span className="text-xs text-neutral-500 bg-[#2C2C2C] px-2 py-1 rounded">
                        ID: {category}
                      </span>
                      {categorySettings[category]?.requiresIngredients && (
                        <span className="text-xs bg-[#00E676] text-[#121212] px-2 py-1 rounded font-bold flex items-center gap-1">
                          <Beaker className="w-3 h-3" />
                          Hammaddeli
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-500 text-sm mt-1">
                      {productsInCategories[category] || 0} ürün
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditDialog(category)}
                      className="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(category)}
                      className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={productsInCategories[category] > 0}
                      title={productsInCategories[category] > 0 ? 'Bu kategoride ürün var, silinemez' : 'Kategoriyi sil'}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => toggleCategorySetting(category, 'showInMenu')}
                    className={`flex-1 rounded-lg px-3 py-2 font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                      categorySettings[category]?.showInMenu 
                        ? 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] shadow-[#00E676]/40' 
                        : 'bg-[#2C2C2C] hover:bg-[#333333] text-neutral-500 shadow-[#2C2C2C]/40'
                    }`}
                  >
                    {categorySettings[category]?.showInMenu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Menüde Göster
                  </button>
                  <button
                    onClick={() => toggleCategorySetting(category, 'showInInventory')}
                    className={`flex-1 rounded-lg px-3 py-2 font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                      categorySettings[category]?.showInInventory 
                        ? 'bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] shadow-[#00E676]/40' 
                        : 'bg-[#2C2C2C] hover:bg-[#333333] text-neutral-500 shadow-[#2C2C2C]/40'
                    }`}
                  >
                    {categorySettings[category]?.showInInventory ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Stokta Göster
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Category Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="w-6 h-6 text-[#00E676]" />
              Yeni Kategori Ekle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Yeni bir ürün kategorisi oluşturun. Kategori ID, ad ve emoji seçin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori ID (benzersiz)</label>
              <input
                type="text"
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="ornek: soguticecekler"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Sadece küçük harf ve rakam kullanın
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori Adı</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ör: Soğuk İçecekler"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Emoji</label>
              <input
                type="text"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                placeholder="📦"
                maxLength={2}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none text-2xl"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Öneriler: 🍺 🍹 🍔 🍕 🍰 ☕ 🥤 🍜 🍲 🥗
              </p>
            </div>

            <div className="bg-[#121212] border-2 border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Beaker className="w-5 h-5 text-[#00E676]" />
                  <div>
                    <label className="block font-bold text-white mb-1">
                      Hammaddeli Kategori
                    </label>
                    <p className="text-xs text-neutral-500">
                      Bu kategoriye ürün eklerken hammadde (alkol) seçimi zorunlu olsun mu?
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requiresIngredients}
                  onCheckedChange={setRequiresIngredients}
                />
              </div>
              {requiresIngredients && (
                <div className="mt-3 bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg p-2">
                  <p className="text-xs text-[#00E676]">
                    ✓ Bu kategorideki ürünler reçete bazlı stok takibi yapacak (örn: Kokteyller, Teqila Shotlar)
                  </p>
                </div>
              )}
              {!requiresIngredients && (
                <div className="mt-3 bg-neutral-700/20 border border-neutral-700/30 rounded-lg p-2">
                  <p className="text-xs text-neutral-400">
                    Bu kategorideki ürünler adet bazlı stok takibi yapacak (örn: Biralar, Atıştırmalıklar)
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg p-3">
              <p className="text-sm text-neutral-300">
                <strong className="text-[#00E676]">Önizleme:</strong> {newCategoryEmoji} {newCategoryName}
                {requiresIngredients && <span className="ml-2 text-xs bg-[#00E676] text-[#121212] px-2 py-1 rounded font-bold">Hammaddeli</span>}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddCategory}
              className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212]"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Edit2 className="w-6 h-6 text-blue-500" />
              Kategori Düzenle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Kategori adı ve emoji'sini güncelleyin. ID değiştirilemez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori ID (değiştirilemez)</label>
              <input
                type="text"
                value={currentCategory}
                disabled
                className="w-full bg-[#0C0C0C] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-neutral-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori Adı</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Emoji</label>
              <input
                type="text"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                maxLength={2}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none text-2xl"
              />
            </div>

            <div className="bg-[#121212] border-2 border-[#2C2C2C] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Beaker className="w-5 h-5 text-[#00E676]" />
                  <div>
                    <label className="block font-bold text-white mb-1">
                      Hammaddeli Kategori
                    </label>
                    <p className="text-xs text-neutral-500">
                      Bu kategoriye ürün eklerken hammadde (alkol) seçimi zorunlu olsun mu?
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requiresIngredients}
                  onCheckedChange={setRequiresIngredients}
                />
              </div>
              {requiresIngredients && (
                <div className="mt-3 bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg p-2">
                  <p className="text-xs text-[#00E676]">
                    ✓ Bu kategorideki ürünler reçete bazlı stok takibi yapacak (örn: Kokteyller, Teqila Shotlar)
                  </p>
                </div>
              )}
              {!requiresIngredients && (
                <div className="mt-3 bg-neutral-700/20 border border-neutral-700/30 rounded-lg p-2">
                  <p className="text-xs text-neutral-400">
                    Bu kategorideki ürünler adet bazlı stok takibi yapacak (örn: Biralar, Atıştırmalıklar)
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#00E676]/10 border border-[#00E676]/30 rounded-lg p-3">
              <p className="text-sm text-neutral-300">
                <strong className="text-[#00E676]">Önizleme:</strong> {newCategoryEmoji} {newCategoryName}
                {requiresIngredients && <span className="ml-2 text-xs bg-[#00E676] text-[#121212] px-2 py-1 rounded font-bold">Hammaddeli</span>}
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditCategory}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Güncelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-6 h-6 text-red-500" />
              Kategoriyi Sil
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="space-y-3 px-6">
            <AlertDialogDescription className="text-neutral-400 text-base">
              <strong className="text-white">{categoryNames[currentCategory]}</strong> kategorisini silmek istediğinize emin misiniz?
            </AlertDialogDescription>
            {productsInCategories[currentCategory] > 0 ? (
              <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded">
                <span className="text-red-400 text-sm">
                  ⚠️ Bu kategoride {productsInCategories[currentCategory]} ürün var! Önce ürünleri silin veya başka kategoriye taşıyın.
                </span>
              </div>
            ) : (
              <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded">
                <span className="text-red-400 text-sm">
                  ⚠️ Bu işlem geri alınamaz!
                </span>
              </div>
            )}
          </div>
          
          <AlertDialogHeader className="hidden">
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={productsInCategories[currentCategory] > 0}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}