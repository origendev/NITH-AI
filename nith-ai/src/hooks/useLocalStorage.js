import { useEffect, useState } from 'react';

/** useState that persists to localStorage (JSON) and survives reloads. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable or full — keep working in memory */
    }
  }, [key, value]);

  return [value, setValue];
}
