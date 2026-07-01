/**
 * Storage Utility
 *
 * Manages session and persistent storage:
 * - sessionStorage: For session-specific data (cleared on browser close)
 * - localStorage: For persistent settings (survives browser close)
 */

// Session Storage (cleared when browser/tab closes)
export const sessionStore = {
  get: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set: (key: string, value: string): void => {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set sessionStorage:', error);
    }
  },

  remove: (key: string): void => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from sessionStorage:', error);
    }
  },

  clear: (): void => {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }
  },
};

// Local Storage (persists across browser sessions)
export const persistentStore = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to set localStorage:', error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};

// Convenience functions for common operations
export const clearSession = (): void => {
  sessionStore.clear();
};
