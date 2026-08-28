import api from '../utils/api';

export const CANONICAL_MAIN_CATEGORIES = [
  'Services',
  'Products',
  'Daily Needs',
  'Food',
  'Stay',
  'Travel',
  'Jobs'
];

export interface CategoryRecord {
  _id?: string;
  id?: string;
  name: string;
  level?: 'main' | 'subcategory' | 'child' | string;
  isMainCategory?: boolean;
  mainCategory?: string;
  subcategory?: string;
  subcategories?: any[];
  children?: CategoryRecord[];
  isActive?: boolean;
  isDeleted?: boolean;
}

let memoryCategoryCache: CategoryRecord[] | null = null;

export const fetchAdminCategories = async (forceRefresh = false): Promise<CategoryRecord[]> => {
  if (!forceRefresh && memoryCategoryCache && memoryCategoryCache.length > 0) {
    return memoryCategoryCache;
  }

  const endpoints = [
    '/categories',
    '/admin/categories',
    '/public/categories'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      if (response.data) {
        const list = Array.isArray(response.data) 
          ? response.data 
          : (response.data.categories || response.data.data || []);
        
        if (Array.isArray(list) && list.length > 0) {
          memoryCategoryCache = list;
          return list;
        }
      }
    } catch (e) {
      // Continue to next endpoint if failed
    }
  }

  // Fallback to canonical main categories
  const fallbackList: CategoryRecord[] = CANONICAL_MAIN_CATEGORIES.map((name, index) => ({
    id: String(index + 1),
    name,
    level: 'main',
    isMainCategory: true,
    isActive: true
  }));

  memoryCategoryCache = fallbackList;
  return fallbackList;
};

export const getActiveMainCategories = (dbCategories: CategoryRecord[] = []): string[] => {
  if (!Array.isArray(dbCategories) || dbCategories.length === 0) {
    return CANONICAL_MAIN_CATEGORIES;
  }

  const mainCatNames = new Set<string>();

  // Extract explicit main categories or level 1 nodes from Admin Category Management
  dbCategories.forEach(c => {
    if (!c || c.isActive === false || c.isDeleted) return;
    
    if (c.level === 'main' || c.isMainCategory === true) {
      if (c.name) mainCatNames.add(c.name.trim());
    } else if (c.mainCategory) {
      mainCatNames.add(c.mainCategory.trim());
    }
  });

  // Preserve canonical order first, then append any custom admin main categories
  const result: string[] = [];
  CANONICAL_MAIN_CATEGORIES.forEach(m => {
    result.push(m);
  });

  mainCatNames.forEach(custom => {
    if (!result.some(r => r.toLowerCase() === custom.toLowerCase())) {
      result.push(custom);
    }
  });

  return result;
};

export const getSubcategoriesForMain = (mainCategory: string, dbCategories: CategoryRecord[] = []): string[] => {
  if (!mainCategory || !Array.isArray(dbCategories)) return [];

  const subcats = new Set<string>();
  const normMain = mainCategory.trim().toLowerCase();

  dbCategories.forEach(c => {
    if (!c || c.isActive === false || c.isDeleted) return;

    const cMain = (c.mainCategory || c.name || '').trim().toLowerCase();
    if (cMain === normMain && Array.isArray(c.children)) {
      c.children.forEach(sub => {
        if (sub && sub.name && sub.isActive !== false) {
          subcats.add(sub.name.trim());
        }
      });
    } else if (cMain === normMain && c.subcategory) {
      subcats.add(c.subcategory.trim());
    }
  });

  return Array.from(subcats);
};
