import { useState, useEffect } from 'react';

/**
 * Hook pour débouncer une valeur
 * @param {*} value - La valeur à débouncer
 * @param {number} delay - Le délai en millisecondes (défaut: 300ms)
 * @returns {*} La valeur débouncée
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
