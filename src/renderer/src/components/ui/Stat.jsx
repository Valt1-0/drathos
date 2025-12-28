import { motion } from "framer-motion";
import Card from "./Card";

/**
 * Stat Component - Système de design Drathos
 *
 * Composant carte statistique pour afficher des métriques.
 *
 * @param {React.ReactNode} icon - Icône de la statistique
 * @param {string} label - Label de la statistique
 * @param {string|number} value - Valeur de la statistique
 * @param {string} change - Changement (ex: "+12%")
 * @param {boolean} changePositive - Si le changement est positif
 * @param {string} variant - Couleur: 'primary', 'secondary', 'accent', 'success', 'warning'
 * @param {boolean} gradient - Utiliser un fond gradient
 * @param {string} className - Classes CSS additionnelles
 */
const Stat = ({
  icon,
  label,
  value,
  change,
  changePositive,
  variant = 'primary',
  gradient = false,
  className = '',
  ...props
}) => {
  return (
    <Card
      variant="stat"
      hover
      gradient={gradient}
      gradientColor={variant}
      className={className}
      {...props}
    >
      <div className="p-6">
        {/* Icône */}
        {icon && (
          <motion.div
            className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{
              background: gradient
                ? `var(--app-gradient-${variant})`
                : `var(--app-${variant})`,
              color: '#FFFFFF',
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-2xl">{icon}</div>
          </motion.div>
        )}

        {/* Label */}
        <p
          className="text-sm font-medium mb-2"
          style={{ color: 'var(--app-textSecondary)' }}
        >
          {label}
        </p>

        {/* Valeur */}
        <div className="flex items-end justify-between">
          <h3
            className="text-3xl font-bold"
            style={{ color: 'var(--app-text)' }}
          >
            {value}
          </h3>

          {/* Changement */}
          {change && (
            <motion.span
              className="text-sm font-semibold px-2 py-1 rounded-lg"
              style={{
                background: changePositive
                  ? 'rgba(34, 197, 94, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                color: changePositive
                  ? 'var(--app-success)'
                  : 'var(--app-error)',
              }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {change}
            </motion.span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default Stat;
