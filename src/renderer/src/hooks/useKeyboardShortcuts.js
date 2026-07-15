import { useEffect, useRef } from 'react';

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

      const handler = shortcutsRef.current[combination] || shortcutsRef.current[combinationNoShift] || shortcutsRef.current[key];

      if (handler) {
        event.preventDefault();
        event.stopPropagation();
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

export const useGlobalShortcuts = (navigate) => {
  useKeyboardShortcuts({
    'ctrl+h': () => navigate('/'),
    'ctrl+g': () => navigate('/games'),
    'ctrl+d': () => navigate('/download'),
    'ctrl+,': () => navigate('/settings'),

    'f11': () => window.api?.windowToggleFullscreen?.(),
  });
};

export default useKeyboardShortcuts;
