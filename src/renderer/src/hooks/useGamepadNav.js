import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { gamepadService } from "../services/gamepadService";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const isVisible = (el) => {
  if (el.closest('[aria-hidden="true"]')) return false;
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
};

// An open modal owns the navigation: restrict candidates to it (mirrors the
// keyboard focus trap)
const navRoot = () =>
  document.querySelector('[role="dialog"]') ?? document;

const candidates = () =>
  [...navRoot().querySelectorAll(FOCUSABLE_SELECTOR)].filter(isVisible);

const center = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

// Geometric directional focus: prefer elements strictly in the requested
// direction, scored by distance along the axis + doubled orthogonal drift
const findNext = (from, direction) => {
  const fromRect = from.getBoundingClientRect();
  const fc = center(fromRect);
  let best = null;
  let bestScore = Infinity;

  for (const el of candidates()) {
    if (el === from) continue;
    const c = center(el.getBoundingClientRect());
    const dx = c.x - fc.x;
    const dy = c.y - fc.y;

    let primary, ortho;
    if (direction === "up") { primary = -dy; ortho = Math.abs(dx); }
    else if (direction === "down") { primary = dy; ortho = Math.abs(dx); }
    else if (direction === "left") { primary = -dx; ortho = Math.abs(dy); }
    else { primary = dx; ortho = Math.abs(dy); }

    if (primary <= 1) continue; // not in that direction
    const score = primary + ortho * 2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
};

const focusElement = (el) => {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
};

const currentFocus = () => {
  const el = document.activeElement;
  return el && el !== document.body && isVisible(el) ? el : null;
};

// Global gamepad navigation: d-pad/stick moves focus, A activates, B closes
// the open modal or goes back. Mount once at app level.
export function useGamepadNav() {
  const { t } = useTranslation();

  useEffect(() => {
    gamepadService.start();
    const setGamepadMode = (on) => document.body.classList.toggle("gamepad-mode", on);
    const onMouse = () => setGamepadMode(false);
    window.addEventListener("mousemove", onMouse, { passive: true });

    const unsubs = [
      gamepadService.on("connected", () => {
        toast.success(t("gamepad.connected"), { description: t("gamepad.connectedDesc") });
      }),
      gamepadService.on("disconnected", () => {
        setGamepadMode(false);
        toast.info(t("gamepad.disconnected"));
      }),
      gamepadService.on("nav", ({ direction }) => {
        if (gamepadService.exclusiveOwner) return;
        setGamepadMode(true);
        const from = currentFocus();
        if (!from) {
          const first = candidates()[0];
          if (first) focusElement(first);
          return;
        }
        const next = findNext(from, direction);
        if (next) focusElement(next);
      }),
      gamepadService.on("confirm", () => {
        if (gamepadService.exclusiveOwner) return;
        setGamepadMode(true);
        currentFocus()?.click();
      }),
      gamepadService.on("back", () => {
        if (gamepadService.exclusiveOwner) return;
        setGamepadMode(true);
        const active = currentFocus() ?? document.body;
        if (document.querySelector('[role="dialog"]')) {
          // Bubbles up to the modal's focus-trap keydown listener
          active.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
          );
        } else {
          window.history.back();
        }
      }),
      // Start opens Big Picture from anywhere (the mode itself claims the pad
      // and handles Start to close)
      gamepadService.on("menu", () => {
        if (gamepadService.exclusiveOwner) return;
        setGamepadMode(true);
        window.dispatchEvent(new CustomEvent("drathos:bigpicture"));
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("mousemove", onMouse);
      gamepadService.stop();
      setGamepadMode(false);
    };
  }, [t]);
}
