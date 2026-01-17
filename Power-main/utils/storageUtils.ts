// Utility for safe local storage operations with error handling

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const serializedItem = localStorage.getItem(key);
    if (serializedItem === null) {
      return defaultValue;
    }
    return JSON.parse(serializedItem) as T;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): boolean => {
  try {
    const serializedItem = JSON.stringify(value);
    localStorage.setItem(key, serializedItem);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    // Could happen if storage is full
    return false;
  }
};

export const clearStorage = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing ${key}:`, error);
  }
};

export const generateId = (): string => {
  // Fallback for environments where crypto is not available (e.g. non-https preview)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID-like generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};