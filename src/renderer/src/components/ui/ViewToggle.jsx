import React from "react";
import { motion } from "framer-motion";

const ViewToggle = ({ options = [], value, onChange, size = "md", className = "", ...props }) => {
  const sizes = { sm: "p-1.5", md: "p-2.5", lg: "p-3" };
  const buttonSizes = { sm: "p-1.5", md: "p-2.5", lg: "p-3.5" };

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border ${sizes[size]} ${className}`}
      style={{ background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)" }}
      {...props}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <motion.button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`${buttonSizes[size]} rounded-lg transition-all relative flex items-center justify-center gap-2`}
            style={{ background: isActive ? "var(--app-primary)" : "transparent", color: isActive ? "#FFFFFF" : "var(--app-textSecondary)" }}
            whileHover={{ scale: 1.05, color: isActive ? "#FFFFFF" : "var(--app-text)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            title={option.label}
          >
            {option.icon}
          </motion.button>
        );
      })}
    </div>
  );
};

export default React.memo(ViewToggle);
