import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * WCAG 2.1 SC 2.1.2 focus trap for modal dialogs.
 * - Traps Tab/Shift+Tab within the container when active.
 * - Focuses the first focusable element on open.
 * - Restores focus to the previously focused element on close.
 *
 * Usage:
 *   const containerRef = useFocusTrap(isOpen);
 *   return <div ref={containerRef} role="dialog" aria-modal="true">...</div>
 */
export function useFocusTrap(isActive) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
        (el) => !el.closest("[aria-hidden='true']")
      );

    const focusable = getFocusable();
    focusable[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const els = getFocusable();
      if (els.length === 0) { e.preventDefault(); return; }

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isActive]);

  return containerRef;
}
