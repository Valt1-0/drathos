import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export const STATUS_CONFIG = {
  backlog: {
    dot: "bg-primary",
    bg: "bg-primary/15",
    border: "border-primary/30",
    text: "text-primary",
  },
  inProgress: {
    dot: "bg-warning",
    bg: "bg-warning/15",
    border: "border-warning/30",
    text: "text-warning",
  },
  completed: {
    dot: "bg-success",
    bg: "bg-success/15",
    border: "border-success/30",
    text: "text-success",
  },
  dropped: {
    dot: "bg-red-400",
    bg: "bg-red-400/15",
    border: "border-red-400/30",
    text: "text-red-400",
  },
};

// align: 'left' anchors to left edge of button, 'right' anchors to right edge
export const usePortalDropdown = (align = "left") => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + (align === "right" ? 8 : 6),
        left: align === "right" ? rect.right - 180 : rect.left,
      });
    }
  }, [isOpen, align]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return { isOpen, setIsOpen, position, buttonRef, dropdownRef };
};

const GameStatusSelector = ({ gameId, gameStatus, onSetStatus }) => {
  const { t } = useTranslation();
  const { isOpen, setIsOpen, position, buttonRef, dropdownRef } =
    usePortalDropdown("left");

  const current = gameStatus ? STATUS_CONFIG[gameStatus] : null;

  const options = [
    { value: null, label: t("games.userStatusNone") },
    { value: "backlog", label: t("games.userStatusBacklog"), config: STATUS_CONFIG.backlog },
    { value: "inProgress", label: t("games.userStatusInProgress"), config: STATUS_CONFIG.inProgress },
    { value: "completed", label: t("games.userStatusCompleted"), config: STATUS_CONFIG.completed },
    { value: "dropped", label: t("games.userStatusDropped"), config: STATUS_CONFIG.dropped },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-medium transition-all cursor-pointer ${
          current
            ? `${current.bg} ${current.border} ${current.text}`
            : "bg-surface/80 border-border/50 text-text-secondary hover:text-text"
        }`}
      >
        {current ? (
          <div className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full border border-current opacity-50" />
        )}
        <span>
          {options.find((o) => o.value === gameStatus)?.label ??
            t("games.userStatusNone")}
        </span>
        <FiChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="status-dropdown"
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                zIndex: 9999,
              }}
              className="min-w-40 rounded-xl overflow-hidden bg-surface border border-border shadow-2xl py-1"
            >
              {options.map((opt) => {
                const isSelected = gameStatus === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      onSetStatus(gameId, opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-surface/80 hover:text-text"
                    }`}
                  >
                    {opt.config ? (
                      <div className={`w-2 h-2 rounded-full ${opt.config.dot} shrink-0`} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-surface border border-border shrink-0" />
                    )}
                    <span className="font-medium">{opt.label}</span>
                    {isSelected && <FiCheck className="w-3 h-3 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default GameStatusSelector;
