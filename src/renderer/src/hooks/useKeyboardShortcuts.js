import { useEffect, useRef } from 'react';

/**
 * Hook for handling keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to handlers
 *
 * Example usage:
 * useKeyboardShortcuts({
 *   'ctrl+s': () => navigate('/settings'),
 *   'escape': () => closeModal(),
 *   'ctrl+shift+d': () => toggleDevTools(),
 * });
 */
const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event) => {
      // Skip single-key shortcuts when typing in an input field
      const isTyping =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) ||
        event.target?.isContentEditable;
      if (isTyping && !event.ctrlKey && !event.metaKey && !event.altKey) return;

      // Build key combination string
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.shiftKey) modifiers.push('shift');
      if (event.altKey) modifiers.push('alt');
      if (event.metaKey) modifiers.push('meta');

      const key = event.key.toLowerCase();
      const combination = [...modifiers, key].join('+');
      // For symbol keys (e.g. "?"), shift is consumed to produce the character.
      // Also try the combo without "shift" so that "ctrl+?" matches Ctrl+Shift+/.
      const combinationNoShift = [...modifiers.filter(m => m !== 'shift'), key].join('+');

      // Check if this combination has a handler
      const handler = shortcutsRef.current[combination] || shortcutsRef.current[combinationNoShift] || shortcutsRef.current[key];

      if (handler) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Execute handler
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

/**
 * Global keyboard shortcuts that work across the entire app
 */
export const useGlobalShortcuts = (navigate) => {
  useKeyboardShortcuts({
    // Navigation shortcuts
    'ctrl+h': () => navigate('/'),
    'ctrl+g': () => navigate('/games'),
    'ctrl+d': () => navigate('/download'),
    'ctrl+,': () => navigate('/settings'), // Common settings shortcut

    // DevTools (F12 is handled in App.jsx)
    'f11': () => window.api?.windowToggleFullscreen?.(),
  });
};

export default useKeyboardShortcuts;
