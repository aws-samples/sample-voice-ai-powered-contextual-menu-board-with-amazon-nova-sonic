/**
 * StorageManager - Utility class for localStorage operations with TTL support
 * Provides data storage with automatic expiration handling
 */
export class StorageManager {
  /**
   * Store data in localStorage with expiration
   * @param key - The storage key
   * @param data - The data to store (will be JSON stringified)
   * @param expirationInMinutes - Expiration time in minutes
   */
  static setData(key: string, data: any, expirationInMinutes: number): void {
    try {
      const item = {
        data: data,
        timestamp: new Date().getTime(),
        expirationInMinutes: expirationInMinutes
      };
      
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('StorageManager.setData error:', error);
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  /**
   * Get data from localStorage
   * @param key - The storage key
   * @returns Returns the data if valid, null if expired or not found
   */
  static getData(key: string): any | null {
    try {
      const item = localStorage.getItem(key);
      
      if (!item) return null;

      const parsedItem = JSON.parse(item);
      const now = new Date().getTime();
      const expirationTime = parsedItem.timestamp + (parsedItem.expirationInMinutes * 60 * 1000);

      if (now > expirationTime) {
        localStorage.removeItem(key);
        return null;
      }

      return parsedItem.data;
    } catch (error) {
      console.error('StorageManager.getData error:', error);
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   * @param key - The storage key
   */
  static removeData(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('StorageManager.removeData error:', error);
    }
  }

  /**
   * Check if data exists and is not expired
   * @param key - The storage key
   * @returns True if data exists and is valid, false otherwise
   */
  static hasValidData(key: string): boolean {
    return this.getData(key) !== null;
  }

  /**
   * Get remaining TTL for stored data
   * @param key - The storage key
   * @returns Remaining time in minutes, or null if not found/expired
   */
  static getRemainingTTL(key: string): number | null {
    try {
      const item = localStorage.getItem(key);
      
      if (!item) return null;

      const parsedItem = JSON.parse(item);
      const now = new Date().getTime();
      const expirationTime = parsedItem.timestamp + (parsedItem.expirationInMinutes * 60 * 1000);

      if (now > expirationTime) {
        localStorage.removeItem(key);
        return null;
      }

      return Math.ceil((expirationTime - now) / (60 * 1000));
    } catch (error) {
      console.error('StorageManager.getRemainingTTL error:', error);
      return null;
    }
  }

  /**
   * Clear all expired items from localStorage
   * @param keyPrefix - Optional prefix to filter keys (e.g., 'cache_')
   */
  static clearExpired(keyPrefix?: string): number {
    let clearedCount = 0;
    
    try {
      const keys = Object.keys(localStorage);
      const targetKeys = keyPrefix 
        ? keys.filter(key => key.startsWith(keyPrefix))
        : keys;

      for (const key of targetKeys) {
        // Try to get data - this will auto-remove if expired
        this.getData(key);
        
        // Check if it was removed
        if (!localStorage.getItem(key)) {
          clearedCount++;
        }
      }
    } catch (error) {
      console.error('StorageManager.clearExpired error:', error);
    }

    return clearedCount;
  }

  /**
   * Get storage statistics
   * @param keyPrefix - Optional prefix to filter keys
   */
  static getStorageStats(keyPrefix?: string): {
    totalItems: number;
    validItems: number;
    expiredItems: number;
    totalSize: number;
  } {
    let totalItems = 0;
    let validItems = 0;
    let expiredItems = 0;
    let totalSize = 0;

    try {
      const keys = Object.keys(localStorage);
      const targetKeys = keyPrefix 
        ? keys.filter(key => key.startsWith(keyPrefix))
        : keys;

      for (const key of targetKeys) {
        const item = localStorage.getItem(key);
        if (item) {
          totalItems++;
          totalSize += item.length;

          // Check if valid without removing
          try {
            const parsedItem = JSON.parse(item);
            const now = new Date().getTime();
            const expirationTime = parsedItem.timestamp + (parsedItem.expirationInMinutes * 60 * 1000);

            if (now > expirationTime) {
              expiredItems++;
            } else {
              validItems++;
            }
          } catch {
            expiredItems++;
          }
        }
      }
    } catch (error) {
      console.error('StorageManager.getStorageStats error:', error);
    }

    return { totalItems, validItems, expiredItems, totalSize };
  }
}
