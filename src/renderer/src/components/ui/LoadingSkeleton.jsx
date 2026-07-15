import { motion } from "framer-motion";

const LoadingSkeleton = ({
  variant = 'text',
  count = 1,
  className = ''
}) => {

  const skeletonVariants = {
    card: (
      <div className={`backdrop-blur-xl border rounded-2xl p-6 ${className}`}
        style={{
          background: 'var(--app-backgroundSecondary)',
          borderColor: 'var(--app-border)'
        }}
      >
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-surface rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface rounded w-3/4"></div>
              <div className="h-3 bg-surface rounded w-1/2 opacity-70"></div>
            </div>
          </div>
        </div>
      </div>
    ),

    text: (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-surface rounded w-full"></div>
          <div className="h-4 bg-surface rounded w-5/6"></div>
          <div className="h-4 bg-surface rounded w-4/6"></div>
        </div>
      </div>
    ),

    circle: (
      <div className={`animate-pulse ${className}`}>
        <div className="w-12 h-12 bg-surface rounded-full"></div>
      </div>
    ),

    stat: (
      <div className={`backdrop-blur-xl border rounded-2xl p-6 ${className}`}
        style={{
          background: 'var(--app-backgroundSecondary)',
          borderColor: 'var(--app-border)'
        }}
      >
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-surface rounded w-1/3"></div>
            <div className="w-10 h-10 bg-surface rounded-xl"></div>
          </div>
          <div className="h-8 bg-surface rounded w-1/2"></div>
        </div>
      </div>
    ),

    game: (
      <div className={`group relative overflow-hidden backdrop-blur-xl border rounded-2xl transition-all duration-300 ${className}`}
        style={{
          background: 'var(--app-backgroundSecondary)',
          borderColor: 'var(--app-border)'
        }}
      >
        <div className="animate-pulse">
          <div className="relative h-48 bg-surface"></div>
          <div className="p-4 space-y-3">
            <div className="h-5 bg-surface rounded w-3/4"></div>
            <div className="h-3 bg-surface rounded w-1/2 opacity-70"></div>
          </div>
        </div>
      </div>
    )
  };

  const items = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1, duration: 0.4 }}
    >
      {skeletonVariants[variant]}
    </motion.div>
  ));

  return count > 1 ? (
    <div className="space-y-4">
      {items}
    </div>
  ) : items[0];
};

export default LoadingSkeleton;
