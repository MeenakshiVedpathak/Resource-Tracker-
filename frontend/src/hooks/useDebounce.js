import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating the returned value until `delay` ms have
 * elapsed since the last change to `value`.
 *
 * @param {any}    value — the value to debounce (typically a search string)
 * @param {number} delay — debounce delay in milliseconds (default 400)
 * @returns {any}  debouncedValue
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 400);
 *   useEffect(() => { fetchResults(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
