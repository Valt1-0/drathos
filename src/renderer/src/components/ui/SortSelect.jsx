import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiCheck } from "react-icons/fi";

const SortSelect = ({ options = [], value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{
          scale: 1.02,
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)",
          borderColor: "var(--app-primary)"
        }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 min-w-[200px] cursor-pointer"
        style={{
          background: isOpen
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)"
            : "var(--app-surface)",
          borderColor: isOpen ? "var(--app-primary)" : "var(--app-border)",
          color: "var(--app-text)"
        }}
      >
        {selectedOption?.icon && (
          <span className="text-lg" style={{ color: "var(--app-primary)" }}>
            {selectedOption.icon}
          </span>
        )}
        <span className="flex-1 text-left text-sm font-medium">
          {selectedOption?.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown className="text-lg" style={{ color: "var(--app-textSecondary)" }} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 rounded-xl border shadow-2xl overflow-hidden z-50"
            style={{
              background: "var(--app-surface)",
              borderColor: "var(--app-border)"
            }}
          >
            {options.map((option) => {
              const isSelected = value === option.value;

              return (
                <motion.button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  whileHover={{
                    background: isSelected
                      ? "var(--app-primary)"
                      : "rgba(99, 102, 241, 0.1)"
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: isSelected ? "var(--app-primary)" : "transparent",
                    color: isSelected ? "white" : "var(--app-text)"
                  }}
                >
                  {option.icon && (
                    <span className="text-lg">
                      {option.icon}
                    </span>
                  )}
                  <span className="flex-1 text-sm font-medium">
                    {option.label}
                  </span>
                  {isSelected && (
                    <FiCheck className="text-lg" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(SortSelect);
