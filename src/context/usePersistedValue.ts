import { useEffect } from 'react';
import { safeStorageRemove, safeStorageSet } from '../shared/storage/safeStorage';

interface PersistedValueOptions {
  /** Store a primitive as-is instead of JSON-encoding it. */
  serialize?: boolean;
  /** Remove the key when the value is null or undefined. */
  removeWhenNull?: boolean;
}

/**
 * Persist React state without coupling domain providers to storage mechanics.
 * Initial state loading remains with the owning provider so existing defaults
 * and hydration behavior stay unchanged.
 */
export const usePersistedValue = <T,>(
  key: string,
  value: T,
  options: PersistedValueOptions = {},
): void => {
  const serialize = options.serialize ?? true;
  const removeWhenNull = options.removeWhenNull ?? false;

  useEffect(() => {
    if (removeWhenNull && (value === null || value === undefined)) {
      safeStorageRemove(key);
      return;
    }

    safeStorageSet(key, serialize ? JSON.stringify(value) : String(value));
  }, [key, value, serialize, removeWhenNull]);
};
