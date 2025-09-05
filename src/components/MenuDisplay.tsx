import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number
  category: string | string[]; // Support both single category (string) and multiple categories (array)
  image?: string;
  available: boolean;
  customizations: Customization[];
  badges?: string[];
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
  preparationTime?: number;
  metadata?: Record<string, any>;
}

interface Category {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  order: number;
  active: boolean;
}

interface Customization {
  id: string;
  name: string;
  type: 'add' | 'remove' | 'substitute';
  price: number;
  available: boolean;
  category?: string;
}

interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

// Helper functions for multi-category support
const normalizeCategories = (category: string | string[]): string[] => {
  return Array.isArray(category) ? category : [category];
};

// Price calculation helpers
const validateDiscount = (discount: number): number => {
  if (!discount || discount < 0) return 0;
  if (discount > 100) return 100; // Cap at 100%
  return discount;
};

const calculateDiscountedPrice = (originalPrice: number, discount: number): number => {
  const validDiscount = validateDiscount(discount);
  if (validDiscount <= 0) return originalPrice;
  return originalPrice * (1 - validDiscount / 100);
};

const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

const itemBelongsToCategory = (item: MenuItem, targetCategory: string): boolean => {
  const categories = normalizeCategories(item.category);
  return categories.includes(targetCategory);
};

const MenuDisplay = forwardRef<any, {}>((_props, ref) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [highlightedItems, setHighlightedItems] = useState<Set<string>>(new Set());

  // Auto-create category if it doesn't exist
  const ensureCategoryExists = useCallback((categoryId: string, categoryName?: string) => {
    setCategories(prev => {
      const exists = prev.some(cat => cat.id === categoryId);
      if (!exists) {
        const newCategory: Category = {
          id: categoryId,
          name: categoryId,
          displayName: categoryName || categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
          order: prev.length,
          active: true
        };
        return [...prev, newCategory].sort((a, b) => a.order - b.order);
      }
      return prev;
    });
  }, []);

  // Add multiple items to menu
  const addItems = useCallback((items: MenuItem[]) => {
    // Ensure all categories exist for each item
    items.forEach(item => {
      const categories = normalizeCategories(item.category);
      categories.forEach(cat => ensureCategoryExists(cat));
    });

    setMenuItems(prev => {
      // Remove duplicates by ID and add new items
      const existingIds = new Set(prev.map(item => item.id));
      const newItems = items.filter(item => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });
  }, [ensureCategoryExists]);

  // Add single item to menu
  const addItem = useCallback((item: MenuItem) => {
    const categories = normalizeCategories(item.category);
    categories.forEach(cat => ensureCategoryExists(cat));
    
    setMenuItems(prev => {
      const exists = prev.some(existing => existing.id === item.id);
      if (!exists) {
        return [...prev, item];
      }
      return prev;
    });
  }, [ensureCategoryExists]);

  // Update existing item
  const updateItem = useCallback((itemId: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  // Remove item from menu
  const removeItem = useCallback((itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Clear all menu items
  const clearMenu = useCallback(() => {
    setMenuItems([]);
    setCategories([]);
    setActiveCategory('all');
  }, []);

  // Category management
  const createCategory = useCallback((category: Category) => {
    setCategories(prev => {
      const exists = prev.some(cat => cat.id === category.id);
      if (!exists) {
        return [...prev, category].sort((a, b) => a.order - b.order);
      }
      return prev;
    });
  }, []);

  const updateCategory = useCallback((categoryId: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, ...updates } : cat
    ));
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    
    // Remove items that ONLY belong to this category
    // Keep items that belong to other categories too
    setMenuItems(prev => prev.filter(item => {
      const categories = normalizeCategories(item.category);
      // Keep item if it belongs to other categories too
      return categories.length > 1 || !categories.includes(categoryId);
    }));
  }, []);

  const reorderCategories = useCallback((categoryIds: string[]) => {
    setCategories(prev => {
      const reordered = categoryIds.map((id, index) => {
        const category = prev.find(cat => cat.id === id);
        return category ? { ...category, order: index } : null;
      }).filter(Boolean) as Category[];
      return reordered;
    });
  }, []);

  // Navigation and display
  const showCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
  }, []);

  const getCurrentCategory = useCallback(() => {
    return activeCategory;
  }, [activeCategory]);

  const getAllCategories = useCallback(() => {
    return categories;
  }, [categories]);

  // Item queries
  const getMenuItems = useCallback((category?: string) => {
    const items = !category ? menuItems : menuItems.filter(item => itemBelongsToCategory(item, category));
    
    // Return items with discounted prices calculated
    return items.map(item => ({
      ...item,
      price: calculateDiscountedPrice(item.price, item.discount || 0)
    }));
  }, [menuItems]);

  const getItemById = useCallback((itemId: string) => {
    const item = menuItems.find(item => item.id === itemId);
    if (!item) return null;
    
    // Return item with discounted price calculated
    return {
      ...item,
      price: calculateDiscountedPrice(item.price, item.discount || 0)
    };
  }, [menuItems]);

  const searchItems = useCallback((query: string) => {
    const items = !query.trim() ? menuItems : menuItems.filter(item => {
      const categories = normalizeCategories(item.category);
      const categoryMatch = categories.some(cat => 
        cat.toLowerCase().includes(query.toLowerCase())
      );
      
      return item.name.toLowerCase().includes(query.toLowerCase()) ||
             item.description.toLowerCase().includes(query.toLowerCase()) ||
             categoryMatch;
    });
    
    // Return items with discounted prices calculated
    return items.map(item => ({
      ...item,
      price: calculateDiscountedPrice(item.price, item.discount || 0)
    }));
  }, [menuItems]);

  // Visual feedback
  const highlightItem = useCallback((itemId: string, duration: number = 3000) => {
    setHighlightedItems(prev => new Set([...prev, itemId]));
    setTimeout(() => {
      setHighlightedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, duration);
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedItems(new Set());
  }, []);

  // Availability management
  const setItemAvailability = useCallback((itemId: string, available: boolean) => {
    updateItem(itemId, { available });
  }, [updateItem]);

  const getUnavailableItems = useCallback(() => {
    return menuItems.filter(item => !item.available);
  }, [menuItems]);

  const bulkUpdateAvailability = useCallback((updates: {itemId: string, available: boolean}[]) => {
    setMenuItems(prev => prev.map(item => {
      const update = updates.find(u => u.itemId === item.id);
      return update ? { ...item, available: update.available } : item;
    }));
  }, []);

  // Expose methods via ref for parent component access
  useImperativeHandle(ref, () => ({
    // Menu Population
    addItems,
    addItem,
    updateItem,
    removeItem,
    clearMenu,
    
    // Category Management
    createCategory,
    updateCategory,
    removeCategory,
    reorderCategories,
    getAllCategories,
    showCategory,
    setActiveCategory,
    getCurrentCategory,
    
    // Menu Items
    getMenuItems,
    getItemById,
    searchItems,
    highlightItem,
    clearHighlights,
    
    // Availability Management
    setItemAvailability,
    getUnavailableItems,
    bulkUpdateAvailability,
  }), [
    addItems, addItem, updateItem, removeItem, clearMenu,
    createCategory, updateCategory, removeCategory, reorderCategories, getAllCategories, showCategory, getCurrentCategory,
    getMenuItems, getItemById, searchItems, highlightItem, clearHighlights,
    setItemAvailability, getUnavailableItems, bulkUpdateAvailability
  ]);

  // Get filtered items for display
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => itemBelongsToCategory(item, activeCategory));

  // Create display categories (show actual categories if they exist, otherwise show placeholder)
  const displayCategories = categories.length > 0 
    ? [
        // ...(menuItems.length > 0 ? [{ id: 'all', name: 'all', displayName: 'All Items', order: -1, active: true }] : []),
        ...categories.filter(cat => cat.active)
      ].sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="menu-display">
      <div className="menu-layout">
        {/* Vertical Category List (Left Side - 15%) */}
        <div className="menu-categories-vertical">
          {displayCategories.length > 0 ? (
            displayCategories.map(category => (
              <button
                key={category.id}
                className={`category-button-vertical ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
                title={category.displayName}
              >
                <span className="category-icon">
                  {getCategoryIcon(category.id)}
                </span>
                <span className="category-name">{category.displayName}</span>
              </button>
            ))
          ) : (
            <div className="empty-categories">
              <div className="categories-placeholder">
                <h4>📋 Categories</h4>
                <p>Categories will be populated when the restaurant loads their menu.</p>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items Grid (Right Side - 85%) */}
        <div className="menu-items-container">
          {menuItems.length === 0 ? (
            <div className="empty-menu">
              <div className="empty-state">
                <h3>🍽️ Menu Loading...</h3>
                <p>The menu will be populated automatically when the restaurant loads their items.</p>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="menu-items-grid">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`menu-item-card ${highlightedItems.has(item.id) ? 'highlighted' : ''} ${!item.available ? 'unavailable' : ''}`}
                >
                  {item.image && (
                    <div className="item-image">
                      <img src={item.image} alt={item.name} />
                      {item.discount && item.discount > 0 && (
                        <span className="discount-badge">{validateDiscount(item.discount)}% OFF</span>
                      )}
                    </div>
                  )}
                  <div className="item-content">
                    <div className="item-header">
                      <h3 className="item-name">{item.name}</h3>
                      {item.discount && item.discount > 0 ? (
                        <div className="item-pricing">
                          <span className="original-price">{formatPrice(item.price)}</span>
                          <span className="discounted-price">{formatPrice(calculateDiscountedPrice(item.price, item.discount))}</span>
                        </div>
                      ) : (
                        <span className="item-price">{formatPrice(item.price)}</span>
                      )}
                    </div>
                    <p className="item-description">{item.description}</p>
                    
                    {item.badges && item.badges.length > 0 && (
                      <div className="item-badges">
                        {item.badges.map(badge => (
                          <span key={badge} className={`badge ${badge.toLowerCase().replace(' ', '-')}`}>
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}

                    {!item.available && (
                      <div className="unavailable-overlay">
                        <span>Currently Unavailable</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
            </div>
          ) : (
            <div className="empty-category">
              <p>No items available in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper function to get category icons
  function getCategoryIcon(categoryId: string): string {
    const iconMap: Record<string, string> = {
      'all': '🍽️',
      'burgers': '🍔',
      'chicken': '🍗',
      'sides': '🍟',
      'fries': '🍟',
      'drinks': '🥤',
      'desserts': '🍰',
      'pizza': '🍕',
      'salads': '🥗',
      'sandwiches': '🥪',
      'breakfast': '🍳',
      'seafood': '🐟',
      'vegetarian': '🥬',
      'spicy': '🌶️',
      'healthy': '🥗',
      'kids': '🧒',
      'specials': '⭐',
      'new': '🆕',
      'popular': '🔥',
      'seasonal': '🍂',
      'limited-time': '⏰',
      'wings': '🍗',
      'sauces': '🌶️',
      'combos': '🍱',
      'promotions': '⭐️',
      'today\'s special': '⭐️',
      'all items': '🍽️'
    };
    
    return iconMap[categoryId.toLowerCase()] || '📋';
  }
});

export default MenuDisplay;
