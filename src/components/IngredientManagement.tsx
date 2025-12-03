import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Flame } from 'lucide-react';
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
import { Ingredient } from '../types/inventory';

interface IngredientManagementProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onIngredientsUpdate: (ingredients: Ingredient[]) => void;
}

// Hammadde kategorileri - SADECE ALKOL
const ingredientCategories = {
  'alcohol': { name: '🔥 Alkol', icon: Flame }
};

export function IngredientManagement({ isOpen, onClose, ingredients, onIngredientsUpdate }: IngredientManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'alcohol' as 'alcohol',
    currentStock: '',
    minStock: '',
    unit: 'cl',
    price: '',
    supplier: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'alcohol',
      currentStock: '',
      minStock: '',
      unit: 'cl',
      price: '',
      supplier: ''
    });
  };

  // Add ingredient
  const handleAddIngredient = () => {
    if (!formData.name.trim() || !formData.currentStock || !formData.minStock) {
      toast.error('Lütfen zorunlu alanları doldurun!');
      return;
    }

    // Generate ID
    const existingIds = ingredients.map(ing => {
      const match = ing.id.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    });
    const newIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const newId = formData.name.toLowerCase().replace(/\s+/g, '_') + '_' + newIdNumber;

    const newIngredient: Ingredient = {
      id: newId,
      name: formData.name.toUpperCase().trim(),
      type: formData.type,
      currentStock: parseFloat(formData.currentStock),
      minStock: parseFloat(formData.minStock),
      unit: formData.unit,
      price: formData.price ? parseFloat(formData.price) : undefined,
      supplier: formData.supplier || undefined,
      lastRestocked: new Date().toLocaleDateString('tr-TR')
    };

    const updatedIngredients = [...ingredients, newIngredient];
    onIngredientsUpdate(updatedIngredients);
    localStorage.setItem('pos_ingredients', JSON.stringify(updatedIngredients));

    toast.success('Hammadde eklendi!', {
      description: `${newIngredient.name} - ${newIngredient.currentStock} ${newIngredient.unit}`
    });

    setShowAddDialog(false);
    resetForm();
  };

  // Edit ingredient
  const handleEditIngredient = () => {
    if (!currentIngredient) return;

    if (!formData.name.trim() || !formData.currentStock || !formData.minStock) {
      toast.error('Lütfen zorunlu alanları doldurun!');
      return;
    }

    const updatedIngredients = ingredients.map(ing =>
      ing.id === currentIngredient.id
        ? {
            ...ing,
            name: formData.name.toUpperCase().trim(),
            type: formData.type,
            currentStock: parseFloat(formData.currentStock),
            minStock: parseFloat(formData.minStock),
            unit: formData.unit,
            price: formData.price ? parseFloat(formData.price) : undefined,
            supplier: formData.supplier || undefined
          }
        : ing
    );

    onIngredientsUpdate(updatedIngredients);
    localStorage.setItem('pos_ingredients', JSON.stringify(updatedIngredients));

    toast.success('Hammadde güncellendi!', {
      description: formData.name
    });

    setShowEditDialog(false);
    setCurrentIngredient(null);
    resetForm();
  };

  // Delete ingredient
  const handleDeleteIngredient = () => {
    if (!currentIngredient) return;

    const updatedIngredients = ingredients.filter(ing => ing.id !== currentIngredient.id);
    onIngredientsUpdate(updatedIngredients);
    localStorage.setItem('pos_ingredients', JSON.stringify(updatedIngredients));

    toast.success('Hammadde silindi!', {
      description: currentIngredient.name
    });

    setShowDeleteDialog(false);
    setCurrentIngredient(null);
  };

  const openEditDialog = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      type: ingredient.type,
      currentStock: ingredient.currentStock.toString(),
      minStock: ingredient.minStock.toString(),
      unit: ingredient.unit,
      price: ingredient.price ? ingredient.price.toString() : '',
      supplier: ingredient.supplier || ''
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (ingredient: Ingredient) => {
    setCurrentIngredient(ingredient);
    setShowDeleteDialog(true);
  };

  if (!isOpen) return null;

  // Group ingredients by type - SADECE ALKOL
  const ingredientsByType = {
    alcohol: ingredients.filter(ing => ing.type === 'alcohol')
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#1E1E1E] rounded-xl border-2 border-[#2C2C2C] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#2C2C2C] bg-gradient-to-r from-[#FF9100]/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF9100] p-3 rounded-lg shadow-lg shadow-[#FF9100]/50">
                <Flame className="w-6 h-6 text-[#121212]" />
              </div>
              <div>
                <h2 className="font-bold text-2xl tracking-wider">HAMMADDE YÖNETİMİ (ALKOL)</h2>
                <p className="text-neutral-500 text-sm">Kokteyl içerikleri için sadece alkol hammaddelerini yönet</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212] rounded-lg px-6 py-3 font-bold tracking-wide transition-all shadow-lg shadow-[#00E676]/40 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                YENİ HAMMADDE EKLE
              </button>
              <button
                onClick={onClose}
                className="bg-[#2C2C2C] hover:bg-[#333333] text-white rounded-lg px-6 py-3 font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                KAPAT
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#FF9100]/20 to-[#FF9100]/10 rounded-lg p-4 border-2 border-[#FF9100]/30">
              <div className="text-neutral-400 text-sm mb-1">Toplam Hammadde</div>
              <div className="font-bold text-3xl text-[#FF9100]">{ingredients.length}</div>
            </div>
            <div className="bg-gradient-to-br from-[#FF9100]/20 to-[#FF9100]/10 rounded-lg p-4 border-2 border-[#FF9100]/30">
              <div className="text-neutral-400 text-sm mb-1">🔥 Alkol Çeşidi</div>
              <div className="font-bold text-3xl text-[#FF9100]">{ingredientsByType.alcohol.length}</div>
            </div>
          </div>

          {/* Ingredients List by Type */}
          {Object.entries(ingredientCategories).map(([type, config]) => (
            <div key={type} className="mb-6">
              <div className="bg-[#121212] rounded-lg border-2 border-[#2C2C2C] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[#2C2C2C] bg-[#1E1E1E]">
                  <h3 className="font-bold text-xl tracking-wide">{config.name}</h3>
                  <p className="text-neutral-500 text-xs mt-1">
                    {ingredientsByType[type as keyof typeof ingredientsByType].length} hammadde
                  </p>
                </div>

                <div className="p-4">
                  {ingredientsByType[type as keyof typeof ingredientsByType].length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      Bu kategoride hammadde bulunmuyor
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ingredientsByType[type as keyof typeof ingredientsByType].map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="bg-[#1E1E1E] rounded-lg p-4 border border-[#2C2C2C] hover:border-[#FF9100] transition-all group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-white mb-1">{ingredient.name}</h4>
                              <div className="space-y-1">
                                <p className="text-[#00E676] font-bold">Stok: {ingredient.currentStock} {ingredient.unit}</p>
                                <p className="text-neutral-400 text-sm">Min: {ingredient.minStock} {ingredient.unit}</p>
                                {ingredient.price && (
                                  <p className="text-neutral-400 text-sm">Fiyat: {ingredient.price} TL/{ingredient.unit}</p>
                                )}
                                {ingredient.supplier && (
                                  <p className="text-neutral-400 text-xs">Tedarikçi: {ingredient.supplier}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditDialog(ingredient)}
                                className="bg-blue-500 hover:bg-blue-600 p-2 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4 text-white" />
                              </button>
                              <button
                                onClick={() => openDeleteDialog(ingredient)}
                                className="bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-neutral-500 mt-2">
                            Son Tedarik: {ingredient.lastRestocked}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Dialog */}
      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Plus className="w-6 h-6 text-[#00E676]" />
              Yeni Hammadde Ekle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Yeni bir hammadde ekleyin. Tüm alanları doldurun.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Hammadde Adı *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ör: VODKA"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori</label>
              <div className="w-full bg-[#0C0C0C] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-neutral-400 flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF9100]" />
                <span>🔥 Alkol (Sadece)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Mevcut Stok *</label>
                <input
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  placeholder="100"
                  min="0"
                  step="0.5"
                  className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Min. Stok *</label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  placeholder="20"
                  min="0"
                  step="0.5"
                  className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Birim *</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="cl"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Birim Fiyat (TL)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="2.5"
                min="0"
                step="0.01"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Tedarikçi</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Ör: Diageo"
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddIngredient}
              className="bg-[#00E676] hover:bg-[#00E676]/90 text-[#121212]"
            >
              <Save className="w-4 h-4 mr-2" />
              Kaydet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C] max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Edit2 className="w-6 h-6 text-blue-500" />
              Hammadde Düzenle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Hammadde bilgilerini güncelleyin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Hammadde Adı *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Kategori</label>
              <div className="w-full bg-[#0C0C0C] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-neutral-400 flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF9100]" />
                <span>🔥 Alkol (Sadece)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Mevcut Stok *</label>
                <input
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                  min="0"
                  step="0.5"
                  className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">Min. Stok *</label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  min="0"
                  step="0.5"
                  className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Birim *</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-400 mb-2">Birim Fiyat (TL)</label>
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
              <label className="block text-sm font-bold text-neutral-400 mb-2">Tedarikçi</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full bg-[#121212] border-2 border-[#2C2C2C] rounded-lg px-4 py-3 text-white focus:border-[#00E676] focus:outline-none"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]" onClick={resetForm}>
              <X className="w-4 h-4 mr-2" />
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditIngredient}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Güncelle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-2 border-[#2C2C2C]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Trash2 className="w-6 h-6 text-red-500" />
              Hammaddeyi Sil
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {currentIngredient && (
                <>
                  <strong className="text-white">{currentIngredient.name}</strong> hammaddesini silmek istediğinize emin misiniz?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {currentIngredient && (
            <div className="px-6 pb-2">
              <div className="bg-red-500/10 border-2 border-red-500/30 p-3 rounded">
                <span className="text-red-400 text-sm">
                  ⚠️ Bu hammaddeyi içeren kokteyller etkilenebilir!
                </span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2C2C2C] border-[#2C2C2C] hover:bg-[#333333]">
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIngredient}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
