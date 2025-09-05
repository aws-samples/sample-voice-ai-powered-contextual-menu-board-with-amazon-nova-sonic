import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  customizations: AppliedCustomization[];
  totalPrice: number;
  notes?: string;
}

interface AppliedCustomization {
  id: string;
  name: string;
  price: number;
  type: 'add' | 'remove' | 'substitute';
}

interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
  items: CartItem[];
  totalQuantity: number;
}

interface BulkCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity?: number; // defaults to 1
  customizations?: AppliedCustomization[]; // defaults to []
}

interface BulkCartResult {
  success: boolean;
  addedItems: {
    cartItemId: string;
    menuItemId: string;
    name: string;
    quantity: number;
    totalPrice: number;
  }[];
  cartSummary: {
    cartTotal: number;
    cartCount: number;
    totalQuantity: number;
  };
  summary?: OrderSummary;
  comboApplied?: {
    comboName: string;
    savings: number;
    originalItems: any[];
    message: string;
  };
}

interface BulkRemoveResult {
  success: boolean;
  removedItems: {
    cartItemId: string;
    name: string;
    quantity: number;
    totalPrice: number;
  }[];
  notFoundItems: string[]; // IDs that weren't found in cart
  cartSummary: {
    cartTotal: number;
    cartCount: number;
    totalQuantity: number;
  };
  summary?: OrderSummary;
}

interface ShoppingCartProps {
  menuItems?: any[];
}

interface ComboSuggestion {
  comboName: string;
  comboId: string;
  comboPrice: number;
  originalPrice: number;
  savings: number;
  savingsPercentage: number;
  matchedItems: { menuItemId: string; name: string; price: number; }[];
  recommendation: string;
}

const ShoppingCart = forwardRef<any, ShoppingCartProps>(({ menuItems = [] }, ref) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [taxRate] = useState(0.08); // 8% tax rate
  const cartItemsRef = useRef<HTMLDivElement>(null);

  // Helper function to calculate summary from any cart items array
  const calculateSummary = useCallback((items: CartItem[]): OrderSummary => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, tax, total, items, totalQuantity };
  }, [taxRate]);

  // Generate unique ID for cart items
  const generateCartItemId = useCallback(() => {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ========================================
  // COMBO DETECTION FUNCTIONS
  // ========================================

  // Analyze cart items for combo opportunities
  const analyzeForComboOpportunities = useCallback((items: BulkCartItem[]): ComboSuggestion[] => {
    if (!menuItems || menuItems.length === 0 || items.length === 0) {
      return [];
    }

    console.log("🍔 ShoppingCart::analyzeForComboOpportunities - Dynamic combo detection");
    console.log("🍔 Available menu items:", menuItems.length);
    console.log("🍔 Cart items to analyze:", items.length);
    
    // Find all combo items from menu
    const combos = menuItems.filter((item: any) => item.isCombo === true);
    console.log("🍔 Found combos:", combos.length, combos.map((c: any) => c.name));
    
    const suggestions: ComboSuggestion[] = [];
    
    // Analyze each combo
    for (const combo of combos) {
      console.log("🍔 ===== ANALYZING COMBO:", combo.name, "=====");
      
      if (!combo.items || !Array.isArray(combo.items)) {
        console.log("🍔 Combo has no items array:", combo.name);
        continue;
      }
      
      console.log("🍔 Combo contains:", combo.items.map((item: any) => item.name));
      
      // Check if we can form this combo from the cart items
      const comboMatch = checkComboMatch(items, combo.items, combo);
      
      if (comboMatch.canFormCombo && comboMatch.savings > 0) {
        console.log("🍔 ✅ COMBO OPPORTUNITY FOUND:", combo.name);
        console.log("🍔 Savings:", comboMatch.savings);
        
        const savingsPercentage = Math.round((comboMatch.savings / comboMatch.originalPrice) * 100);
        const itemNames = comboMatch.matchedItems.map((item: any) => item.name).join(", ");
        const recommendation = `Save $${comboMatch.savings.toFixed(2)} by switching ${itemNames} to ${combo.name}!`;
        
        suggestions.push({
          comboName: combo.name,
          comboId: combo.id,
          comboPrice: combo.price,
          originalPrice: comboMatch.originalPrice,
          savings: comboMatch.savings,
          savingsPercentage,
          matchedItems: comboMatch.matchedItems,
          recommendation
        });
      } else {
        console.log("🍔 ❌ No beneficial combo match for:", combo.name);
      }
    }
    
    // Sort suggestions by savings (highest first)
    suggestions.sort((a, b) => b.savings - a.savings);
    
    console.log("🍔 Found", suggestions.length, "combo suggestions");
    return suggestions;
  }, [menuItems]);

  // Helper function to check if items can form a combo
  const checkComboMatch = useCallback((cartItems: BulkCartItem[], comboItems: any[], combo: any) => {
    console.log("🍔 checkComboMatch for:", combo.name);
    
    const matchedItems: { menuItemId: string; name: string; price: number; }[] = [];
    const availableItems = [...cartItems];
    let originalPrice = 0;
    let canFormCombo = true;
    
    // Check each item required by the combo
    for (const comboItem of comboItems) {
      console.log("🍔 Looking for combo item:", comboItem.name, "id:", comboItem.id);
      
      // Find matching item in available cart items
      const itemIndex = availableItems.findIndex(cartItem => 
        cartItem.menuItemId === comboItem.id ||
        cartItem.name.toLowerCase().includes(comboItem.name.toLowerCase()) ||
        comboItem.name.toLowerCase().includes(cartItem.name.toLowerCase())
      );
      
      if (itemIndex === -1) {
        console.log("🍔 Combo item not available in cart:", comboItem.name);
        canFormCombo = false;
        break;
      }
      
      const cartItem = availableItems[itemIndex];
      console.log("🍔 Found matching cart item:", cartItem.name);
      
      matchedItems.push({
        menuItemId: cartItem.menuItemId,
        name: cartItem.name,
        price: cartItem.price
      });
      
      originalPrice += cartItem.price;
      
      // Remove item from available items (or reduce quantity)
      const quantity = cartItem.quantity || 1;
      if (quantity > 1) {
        availableItems[itemIndex] = { ...cartItem, quantity: quantity - 1 };
      } else {
        availableItems.splice(itemIndex, 1);
      }
    }
    
    const savings = canFormCombo ? Math.max(0, originalPrice - combo.price) : 0;
    
    console.log("🍔 Combo analysis result:", {
      canFormCombo,
      originalPrice,
      comboPrice: combo.price,
      savings
    });
    
    return {
      canFormCombo,
      matchedItems,
      originalPrice,
      savings
    };
  }, []);

  // Show combo suggestion and replace items
  const showComboSuggestion = useCallback((suggestion: ComboSuggestion) => {
    console.log("🍔 Applying combo:", suggestion.comboName);
    
    // Replace cart items with combo
    setCartItems(prevCartItems => {
      let newCartItems = [...prevCartItems];
      const itemsToRemove: string[] = [];
      let replacementMade = false;
      
      // Process each matched item from the suggestion
      suggestion.matchedItems.forEach((matchedItem: any) => {
        const cartItemIndex = newCartItems.findIndex(cartItem => 
          cartItem.menuItemId === matchedItem.menuItemId
        );
        
        if (cartItemIndex !== -1) {
          const cartItem = newCartItems[cartItemIndex];
          
          if (cartItem.quantity > 1) {
            // Reduce quantity by 1 (for the combo)
            newCartItems[cartItemIndex] = {
              ...cartItem,
              quantity: cartItem.quantity - 1,
              totalPrice: (cartItem.basePrice + cartItem.customizations.reduce((sum, c) => sum + c.price, 0)) * (cartItem.quantity - 1)
            };
          } else {
            // Remove item completely (quantity is 1)
            itemsToRemove.push(cartItem.id);
          }
          replacementMade = true;
        }
      });
      
      // Remove items that had quantity 1
      newCartItems = newCartItems.filter(item => !itemsToRemove.includes(item.id));
      
      // Add the combo item
      if (replacementMade) {
        const comboItem: CartItem = {
          id: generateCartItemId(),
          menuItemId: suggestion.comboId,
          name: suggestion.comboName,
          basePrice: suggestion.comboPrice,
          quantity: 1,
          customizations: [],
          totalPrice: suggestion.comboPrice,
        };
        
        newCartItems.push(comboItem);
        console.log("🍔 Added combo item:", comboItem.name);
      }
      
      return newCartItems;
    });
    
    // Show notification
    const notification = document.createElement('div');
    notification.innerHTML = `✅ Combo Applied! Saved $${suggestion.savings.toFixed(2)} with ${suggestion.comboName}`;
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#4CAF50',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '10000',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px'
    });
    
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }, [generateCartItemId]);

  // Add item to cart
  const addToCart = useCallback((menuItemId: string, name: string, basePrice: number, quantity: number = 1, customizations: AppliedCustomization[] = []) => {
    console.log("🍔 ShoppingCart: addToCart method called with:", { menuItemId, name, basePrice, quantity, customizations });
    console.log("🍔 ShoppingCart: Current cart has", cartItems.length, "items");
    console.log("🍔 ShoppingCart: Menu items available:", menuItems?.length || 0);
    
    const customizationTotal = customizations.reduce((sum, custom) => sum + custom.price, 0);
    const totalPrice = (basePrice + customizationTotal) * quantity;

    const newItem: CartItem = {
      id: generateCartItemId(),
      menuItemId,
      name,
      basePrice,
      quantity,
      customizations,
      totalPrice,
    };

    // Calculate new cart state with the added item
    let newCartItems = [...cartItems, newItem];
    
    // ========================================
    // INTEGRATED COMBO DETECTION
    // ========================================
    
    let comboApplied = null;
    let totalSavings = 0;
    let totalCombosApplied = 0;
    let lastComboName = '';
    
    // Check for combo opportunities after adding the item
    if (menuItems && menuItems.length > 0 && newCartItems.length >= 2) {
      console.log("🍔 addToCart: Checking for combo opportunities after adding:", name);
      
      // Convert to format needed for combo analysis
      const cartAsBulkItems = newCartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.basePrice,
        quantity: item.quantity,
        customizations: item.customizations
      }));
      
      // Use existing combo detection logic
      let suggestions = analyzeForComboOpportunities(cartAsBulkItems);
      
      while (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        console.log("🍔 addToCart: COMBO OPPORTUNITY DETECTED:", topSuggestion.comboName);
        
        // Apply combo to newCartItems directly (don't use setCartItems yet)
        const itemsToRemove: string[] = [];
        let replacementMade = false;
        
        // Process each matched item from the suggestion
        topSuggestion.matchedItems.forEach((matchedItem: any) => {
          const cartItemIndex = newCartItems.findIndex(cartItem => 
            cartItem.menuItemId === matchedItem.menuItemId
          );
          
          if (cartItemIndex !== -1) {
            const cartItem = newCartItems[cartItemIndex];
            
            if (cartItem.quantity > 1) {
              // Reduce quantity by 1 (for the combo)
              newCartItems[cartItemIndex] = {
                ...cartItem,
                quantity: cartItem.quantity - 1,
                totalPrice: (cartItem.basePrice + cartItem.customizations.reduce((sum, c) => sum + c.price, 0)) * (cartItem.quantity - 1)
              };
            } else {
              // Remove item completely (quantity is 1)
              itemsToRemove.push(cartItem.id);
            }
            replacementMade = true;
          }
        });
        
        // Remove items that had quantity 1
        newCartItems = newCartItems.filter(item => !itemsToRemove.includes(item.id));
        
        // Add the combo item (COMBO DEDUPLICATION FIX)
        if (replacementMade) {
          // Check if combo already exists in cart
          const existingComboIndex = newCartItems.findIndex(item => 
            item.menuItemId === topSuggestion.comboId
          );
          
          if (existingComboIndex !== -1) {
            // Merge with existing combo
            console.log("🍔 COMBO DEDUPLICATION: Merging with existing combo:", topSuggestion.comboName);
            newCartItems[existingComboIndex].quantity += 1;
            newCartItems[existingComboIndex].totalPrice = 
              newCartItems[existingComboIndex].basePrice * newCartItems[existingComboIndex].quantity;
          } else {
            // Create new combo item
            console.log("🍔 COMBO DEDUPLICATION: Creating new combo:", topSuggestion.comboName);
            const comboItem: CartItem = {
              id: generateCartItemId(),
              menuItemId: topSuggestion.comboId,
              name: topSuggestion.comboName,
              basePrice: topSuggestion.comboPrice,
              quantity: 1,
              customizations: [],
              totalPrice: topSuggestion.comboPrice,
            };
            
            newCartItems.push(comboItem);
          }
          
          // Accumulate savings and combo count
          totalSavings += topSuggestion.savings;
          totalCombosApplied += 1;
          lastComboName = topSuggestion.comboName;
          
          console.log(`🍔 addToCart: Applied combo ${totalCombosApplied}, total savings so far: $${totalSavings.toFixed(2)}`);
          
          // Show notification
          const notification = document.createElement('div');
          notification.innerHTML = `✅ Combo Applied! Saved $${topSuggestion.savings.toFixed(2)} with ${topSuggestion.comboName}`;
          Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px'
          });
          
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);
        }
        
        // Re-analyze for more combo opportunities
        const updatedCartAsBulkItems = newCartItems.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.basePrice,
          quantity: item.quantity,
          customizations: item.customizations
        }));
        suggestions = analyzeForComboOpportunities(updatedCartAsBulkItems);
      }
      
      // Create final combo information with total savings
      if (totalCombosApplied > 0) {
        comboApplied = {
          comboName: totalCombosApplied > 1 ? `${totalCombosApplied} ${lastComboName}s` : lastComboName,
          savings: totalSavings,
          originalItems: [], // Not relevant for multiple combos
          message: totalCombosApplied > 1 
            ? `Great! I applied ${totalCombosApplied} ${lastComboName}s and saved you $${totalSavings.toFixed(2)}!`
            : `Great! I applied ${lastComboName} and saved you $${totalSavings.toFixed(2)}!`
        };
        
        console.log("🍔 addToCart: Final combo info with total savings:", comboApplied);
      }
    }
    
    // Update state with final cart (only once)
    setCartItems(newCartItems);
    
    // Calculate and return updated summary
    const updatedSummary = calculateSummary(newCartItems);
    
    // Return cart item ID, calculated totals, and combo information
    return {
      cartItemId: newItem.id,
      cartTotal: updatedSummary.total,
      cartCount: updatedSummary.totalQuantity,
      subtotal: updatedSummary.subtotal,
      tax: updatedSummary.tax,
      summary: updatedSummary,
      ...(comboApplied && { comboApplied })
    };
  }, [generateCartItemId, cartItems, taxRate, menuItems, analyzeForComboOpportunities, showComboSuggestion]);

  // Add multiple items to cart in a single operation
  const bulkAddToCart = useCallback((items: BulkCartItem[]): BulkCartResult => {
    const addedItems: {
      cartItemId: string;
      menuItemId: string;
      name: string;
      quantity: number;
      totalPrice: number;
    }[] = [];
    let newCartItems = [...cartItems];
    
    // Process each item
    items.forEach(item => {
      const customizationTotal = (item.customizations || []).reduce((sum, custom) => sum + custom.price, 0);
      const quantity = item.quantity || 1;
      const totalPrice = (item.price + customizationTotal) * quantity;

      const newItem: CartItem = {
        id: generateCartItemId(),
        menuItemId: item.menuItemId,
        name: item.name,
        basePrice: item.price,
        quantity,
        customizations: item.customizations || [],
        totalPrice,
      };

      newCartItems.push(newItem);
      
      // Track what was added for return value
      addedItems.push({
        cartItemId: newItem.id,
        menuItemId: newItem.menuItemId,
        name: newItem.name,
        quantity: newItem.quantity,
        totalPrice: newItem.totalPrice
      });
    });

    // ========================================
    // INTEGRATED COMBO DETECTION
    // ========================================
    
    let comboApplied = null;
    let totalSavings = 0;
    let totalCombosApplied = 0;
    let lastComboName = '';
    
    // Check for combo opportunities after adding items
    if (menuItems && menuItems.length > 0 && newCartItems.length >= 2) {
      console.log("🍔 bulkAddToCart: Checking for combo opportunities after adding", items.length, "items");
      
      // Convert to format needed for combo analysis
      const cartAsBulkItems = newCartItems.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.basePrice,
        quantity: item.quantity,
        customizations: item.customizations
      }));
      
      // Use existing combo detection logic
      let suggestions = analyzeForComboOpportunities(cartAsBulkItems);
      
      while (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        console.log("🍔 bulkAddToCart: COMBO OPPORTUNITY DETECTED:", topSuggestion.comboName);
        
        // Apply combo to newCartItems directly
        const itemsToRemove: string[] = [];
        let replacementMade = false;
        
        // Process each matched item from the suggestion
        topSuggestion.matchedItems.forEach((matchedItem: any) => {
          const cartItemIndex = newCartItems.findIndex(cartItem => 
            cartItem.menuItemId === matchedItem.menuItemId
          );
          
          if (cartItemIndex !== -1) {
            const cartItem = newCartItems[cartItemIndex];
            
            if (cartItem.quantity > 1) {
              // Reduce quantity by 1 (for the combo)
              newCartItems[cartItemIndex] = {
                ...cartItem,
                quantity: cartItem.quantity - 1,
                totalPrice: (cartItem.basePrice + cartItem.customizations.reduce((sum, c) => sum + c.price, 0)) * (cartItem.quantity - 1)
              };
            } else {
              // Remove item completely (quantity is 1)
              itemsToRemove.push(cartItem.id);
            }
            replacementMade = true;
          }
        });
        
        // Remove items that had quantity 1
        newCartItems = newCartItems.filter(item => !itemsToRemove.includes(item.id));
        
        // Add the combo item (COMBO DEDUPLICATION FIX)
        if (replacementMade) {
          // Check if combo already exists in cart
          const existingComboIndex = newCartItems.findIndex(item => 
            item.menuItemId === topSuggestion.comboId
          );
          
          if (existingComboIndex !== -1) {
            // Merge with existing combo
            console.log("🍔 COMBO DEDUPLICATION: Merging with existing combo:", topSuggestion.comboName);
            newCartItems[existingComboIndex].quantity += 1;
            newCartItems[existingComboIndex].totalPrice = 
              newCartItems[existingComboIndex].basePrice * newCartItems[existingComboIndex].quantity;
          } else {
            // Create new combo item
            console.log("🍔 COMBO DEDUPLICATION: Creating new combo:", topSuggestion.comboName);
            const comboItem: CartItem = {
              id: generateCartItemId(),
              menuItemId: topSuggestion.comboId,
              name: topSuggestion.comboName,
              basePrice: topSuggestion.comboPrice,
              quantity: 1,
              customizations: [],
              totalPrice: topSuggestion.comboPrice,
            };
            
            newCartItems.push(comboItem);
          }
          
          // Accumulate savings and combo count
          totalSavings += topSuggestion.savings;
          totalCombosApplied += 1;
          lastComboName = topSuggestion.comboName;
          
          console.log(`🍔 bulkAddToCart: Applied combo ${totalCombosApplied}, total savings so far: $${totalSavings.toFixed(2)}`);
          
          // Show notification
          const notification = document.createElement('div');
          notification.innerHTML = `✅ Combo ${totalCombosApplied} Applied! Total saved: $${totalSavings.toFixed(2)}`;
          Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '14px'
          });
          
          document.body.appendChild(notification);
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);
        }
        
        // Re-analyze for more combo opportunities
        const updatedCartAsBulkItems = newCartItems.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.basePrice,
          quantity: item.quantity,
          customizations: item.customizations
        }));
        suggestions = analyzeForComboOpportunities(updatedCartAsBulkItems);
      }
      
      // Create final combo information with total savings
      if (totalCombosApplied > 0) {
        comboApplied = {
          comboName: totalCombosApplied > 1 ? `${totalCombosApplied} ${lastComboName}s` : lastComboName,
          savings: totalSavings,
          originalItems: [], // Not relevant for multiple combos
          message: totalCombosApplied > 1 
            ? `Great! I applied ${totalCombosApplied} ${lastComboName}s and saved you $${totalSavings.toFixed(2)}!`
            : `Great! I applied ${lastComboName} and saved you $${totalSavings.toFixed(2)}!`
        };
        
        console.log("🍔 bulkAddToCart: Final combo info with total savings:", comboApplied);
      }
    }

    // Update state with final cart (only once)
    setCartItems(newCartItems);

    // Calculate and return updated summary
    const updatedSummary = calculateSummary(newCartItems);

    const result: BulkCartResult = {
      success: true,
      addedItems,
      cartSummary: {
        cartTotal: updatedSummary.total,
        cartCount: newCartItems.length,
        totalQuantity: updatedSummary.totalQuantity
      },
      summary: updatedSummary,
      ...(comboApplied && { comboApplied })
    };

    return result;
  }, [cartItems, taxRate, generateCartItemId, menuItems, analyzeForComboOpportunities, showComboSuggestion]);

  // Remove item from cart
  const removeFromCart = useCallback((cartItemId: string) => {
    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.filter(item => item.id !== cartItemId);
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [calculateSummary]);

  // Remove multiple items from cart in a single operation
  const bulkRemoveFromCart = useCallback((cartItemIds: string[]): BulkRemoveResult => {
    let result: BulkRemoveResult;
    
    setCartItems(prevCartItems => {
      const removedItems: { cartItemId: string; name: string; quantity: number; totalPrice: number; }[] = [];
      const notFoundItems: string[] = [];
      
      // Find items to remove and track what was found/not found using CURRENT state
      cartItemIds.forEach(cartItemId => {
        const item = prevCartItems.find(item => item.id === cartItemId);
        if (item) {
          removedItems.push({
            cartItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          });
        } else {
          notFoundItems.push(cartItemId);
        }
      });
      
      // Remove all items in a single state update using CURRENT state
      const newCartItems = prevCartItems.filter(item => !cartItemIds.includes(item.id));
      
      // Calculate and store updated summary
      const updatedSummary = calculateSummary(newCartItems);
      
      // Store result for return
      result = {
        success: true,
        removedItems,
        notFoundItems,
        cartSummary: {
          cartTotal: updatedSummary.total,
          cartCount: newCartItems.length,
          totalQuantity: updatedSummary.totalQuantity
        },
        summary: updatedSummary
      };
      
      return newCartItems;
    });
    
    return result!;
  }, [calculateSummary]);

  // Update item quantity
  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(cartItemId);
    }

    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.map(item => {
        if (item.id === cartItemId) {
          const customizationTotal = item.customizations.reduce((sum, custom) => sum + custom.price, 0);
          const totalPrice = (item.basePrice + customizationTotal) * quantity;
          return { ...item, quantity, totalPrice };
        }
        return item;
      });
      
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [removeFromCart, calculateSummary]);

  // Update entire cart item (for combo modifications)
  const updateCartItem = useCallback((cartItemId: string, updatedItem: any) => {
    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.map(item => {
        if (item.id === cartItemId) {
          return { ...item, ...updatedItem };
        }
        return item;
      });
      
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [calculateSummary]);

  // Add customization to item
  const addCustomization = useCallback((cartItemId: string, customization: AppliedCustomization) => {
    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.map(item => {
        if (item.id === cartItemId) {
          const newCustomizations = [...item.customizations, customization];
          const customizationTotal = newCustomizations.reduce((sum, custom) => sum + custom.price, 0);
          const totalPrice = (item.basePrice + customizationTotal) * item.quantity;
          return { ...item, customizations: newCustomizations, totalPrice };
        }
        return item;
      });
      
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [calculateSummary]);

  // Remove customization from item
  const removeCustomization = useCallback((cartItemId: string, customizationId: string) => {
    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.map(item => {
        if (item.id === cartItemId) {
          const newCustomizations = item.customizations.filter(custom => custom.id !== customizationId);
          const customizationTotal = newCustomizations.reduce((sum, custom) => sum + custom.price, 0);
          const totalPrice = (item.basePrice + customizationTotal) * item.quantity;
          return { ...item, customizations: newCustomizations, totalPrice };
        }
        return item;
      });
      
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [calculateSummary]);

  // Update item notes
  const updateItemNotes = useCallback((cartItemId: string, notes: string) => {
    let updatedSummary: OrderSummary;
    
    setCartItems(prev => {
      const newCartItems = prev.map(item => 
        item.id === cartItemId ? { ...item, notes } : item
      );
      
      updatedSummary = calculateSummary(newCartItems);
      return newCartItems;
    });
    
    return updatedSummary!;
  }, [calculateSummary]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    return calculateSummary([]);
  }, [calculateSummary]);

  // Get cart summary
  const getOrderSummary = useCallback((): OrderSummary => {
    return calculateSummary(cartItems);
  }, [cartItems, calculateSummary]);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (cartItemsRef.current && cartItems.length > 0) {
      cartItemsRef.current.scrollTop = cartItemsRef.current.scrollHeight;
    }
  }, [cartItems.length]);

  // Get cart total
  const getCartTotal = useCallback(() => {
    return getOrderSummary().total;
  }, [getOrderSummary]);

  // Get cart count
  const getCartCount = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Get cart items
  const getCart = useCallback(() => {
    return cartItems;
  }, [cartItems]);

  // Get single cart item by ID
  const getCartItem = useCallback((cartItemId: string): CartItem | null => {
    const item = cartItems.find(item => item.id === cartItemId);
    return item || null;
  }, [cartItems]);

  // Submit order (placeholder)
  const submitOrder = useCallback(() => {
    const summary = getOrderSummary();
    const order = {
      id: `order_${Date.now()}`,
      ...summary,
      status: 'submitted' as const,
      timestamp: new Date(),
    };
    
    // In a real implementation, this would submit to a POS system
    console.log('Order submitted:', order);
    return order;
  }, [cartItems, getOrderSummary]);

  // Expose methods via ref for parent component access
  useImperativeHandle(ref, () => ({
    addToCart,
    bulkAddToCart,
    removeFromCart,
    bulkRemoveFromCart,
    updateQuantity,
    updateCartItem,
    addCustomization,
    removeCustomization,
    updateItemNotes,
    clearCart,
    getCart,
    getCartItem,
    getCartTotal,
    getCartCount,
    getOrderSummary,
    submitOrder,
  }), [
    addToCart, bulkAddToCart, removeFromCart, bulkRemoveFromCart, updateQuantity, updateCartItem, addCustomization, removeCustomization, updateItemNotes,
    clearCart, getCart, getCartItem, getCartTotal, getCartCount, getOrderSummary, submitOrder, calculateSummary
  ]);

  const summary = getOrderSummary();

  return (
    <div className="shopping-cart">
      <div className="cart-header">
        <h3>🛒 Your Order</h3>
        {summary.totalQuantity > 0 && (
          <span className="cart-count">{summary.totalQuantity}</span>
        )}
      </div>

      <div className="cart-content">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <span>Add items from the menu to get started</span>
          </div>
        ) : (
          <>
            <div className="cart-items" ref={cartItemsRef}>
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <div className="item-name-qty">
                      <span className="item-name">{item.name}</span>
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="qty-btn"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    {item.customizations.length > 0 && (
                      <div className="customizations">
                        {item.customizations.map(custom => (
                          <span key={custom.id} className="customization">
                            {custom.type === 'add' ? '+' : custom.type === 'remove' ? '−' : '~'} {custom.name}
                            {custom.price > 0 && ` (+$${custom.price.toFixed(2)})`}
                          </span>
                        ))}
                      </div>
                    )}

                    {(item as any).comboItems && (item as any).comboItems.length > 0 && (
                      <div className="combo-items">
                        {(item as any).comboItems.map((comboItem: any) => (
                          <span key={comboItem.id} className="combo-item">
                            • {comboItem.name}
                            {comboItem.isReplacement && (
                              <span className="replacement-note"> (was {comboItem.originalName})</span>
                            )}
                            {comboItem.priceDifference > 0 && ` (+$${comboItem.priceDifference.toFixed(2)})`}
                            {comboItem.priceDifference < 0 && ` (-$${Math.abs(comboItem.priceDifference).toFixed(2)})`}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {item.notes && (
                      <div className="item-notes">
                        <small>Note: {item.notes}</small>
                      </div>
                    )}
                  </div>
                  
                  <div className="item-actions">
                    <div className="price-remove">
                      <span className="item-price">${item.totalPrice.toFixed(2)}</span>
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-line">
                <span>Subtotal:</span>
                <span>${summary.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-line">
                <span>Tax:</span>
                <span>${summary.tax.toFixed(2)}</span>
              </div>
              <div className="summary-line total">
                <span>Total:</span>
                <span>${summary.total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default ShoppingCart;
