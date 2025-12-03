// Hammadde (İçerik) Tipi - Alkol şişeleri, meyve suları vb.
export interface Ingredient {
  id: string;
  name: string;
  currentStock: number; // CL cinsinden
  minStock: number; // CL cinsinden
  unit: 'cl' | 'ml' | 'gr';
  supplier: string;
  lastRestocked: string;
  price: number; // Birim fiyat (şişe fiyatı değil, cl başına maliyet)
  type: 'alcohol'; // Sadece Alkol
}

// Reçete Satırı - Her bir içerik ve miktarı
export interface RecipeItem {
  ingredientId: string;
  amount: number; // İçeriğin kullanım miktarı (CL, ML veya GR)
}

// Güncellenmiş Ürün Interface'i
export interface ProductItem {
  id: string;
  name: string;
  price: number; // Satış fiyatı
  category: string;
  
  // Kokteyl ise reçete bilgisi
  isCocktail?: boolean;
  recipe?: RecipeItem[];
  
  // Bira/Atıştırmalık ise stok bilgisi
  supplier?: string;
  currentStock?: number;
  minStock?: number;
  unit?: string;
}
