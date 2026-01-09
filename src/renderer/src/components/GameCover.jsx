import { useState, useEffect } from 'react';
import imageCacheService from '../services/imageCacheService';

/**
 * Optimise une URL de cover IGDB pour réduire la taille de l'image
 * @param {string} url - URL originale de l'image IGDB
 * @param {string} size - Taille souhaitée (thumb, cover_small, cover_big, screenshot_med, screenshot_big)
 * @returns {string} URL optimisée
 */
const optimizeIGDBImageUrl = (url, size = 'cover_small') => {
  if (!url) return '';

  // Si l'URL est déjà optimisée, la retourner telle quelle
  if (url.includes('t_cover_small') || url.includes('t_cover_big') || url.includes('t_thumb')) {
    return url;
  }

  // Remplacer t_thumb par la taille demandée
  // Les tailles disponibles sur IGDB:
  // - t_thumb: 90x128
  // - t_cover_small: 264x352
  // - t_cover_big: 528x704
  // - t_screenshot_med: 569x320
  // - t_screenshot_big: 1280x720
  const sizeMap = {
    thumb: 't_thumb',
    cover_small: 't_cover_small',
    cover_big: 't_cover_big',
    screenshot_med: 't_screenshot_med',
    screenshot_big: 't_screenshot_big'
  };

  const igdbSize = sizeMap[size] || 't_cover_small';

  // Remplacer toute occurrence de t_[size] par la nouvelle taille
  return url.replace(/t_thumb|t_cover_small|t_cover_big|t_screenshot_med|t_screenshot_big|t_screenshot_huge|t_1080p/g, igdbSize);
};

/**
 * Composant GameCover - Affiche une cover de jeu optimisée avec lazy loading et placeholder
 * @param {Object} props
 * @param {string} props.src - URL de l'image
 * @param {string} props.alt - Texte alternatif
 * @param {string} props.className - Classes CSS
 * @param {string} props.size - Taille de l'image (thumb, cover_small, cover_big)
 * @param {Function} props.onError - Callback en cas d'erreur de chargement
 * @param {boolean} props.blur - Appliquer un effet de flou
 */
const GameCover = ({ src, alt, className = '', size = 'cover_small', onError, blur = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    // Réinitialiser l'état lors du changement de source
    setHasError(false);

    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Optimiser l'URL IGDB
    const optimizedUrl = optimizeIGDBImageUrl(src, size);

    // Vérifier d'abord le cache mémoire de façon synchrone
    const memoryCache = imageCacheService.memoryCache;
    if (memoryCache && memoryCache.has(optimizedUrl)) {
      const cached = memoryCache.get(optimizedUrl);
      if (cached && cached.blobUrl) {
        // Image en cache mémoire - chargement instantané sans loader
        setImageSrc(cached.blobUrl);
        setIsLoading(false);
        return;
      }
    }

    // Si pas en cache mémoire, afficher le loader et charger
    setIsLoading(true);

    // Charger l'image depuis IndexedDB ou réseau
    const loadImage = async () => {
      try {
        const cachedImageUrl = await imageCacheService.fetchAndCache(optimizedUrl);
        setImageSrc(cachedImageUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'image:', error);
        // En cas d'erreur, essayer de charger directement sans cache
        setImageSrc(optimizedUrl);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src, size, onError]);

  // Classes pour le placeholder
  const placeholderClasses = `${className} bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center`;

  // Classes pour l'image avec effet de flou si nécessaire
  const imageClasses = `${className} ${blur ? 'blur-sm' : ''} transition-opacity duration-300 ${imageSrc ? 'opacity-100' : 'opacity-0'}`;

  // Si erreur de chargement, afficher un placeholder avec icône
  if (hasError) {
    return (
      <div className={placeholderClasses}>
        <svg
          className="w-1/3 h-1/3 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder simple sans loader si pas d'image */}
      {!imageSrc && !hasError && (
        <div className={placeholderClasses}>
          {isLoading && (
            <div className="relative">
              {/* Spinner animé seulement si vraiment en train de charger */}
              <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
              {/* Icône de jeu au centre */}
              <svg
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Image avec lazy loading */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={imageClasses}
          loading="lazy"
          decoding="async"
          onError={() => {
            setHasError(true);
            if (onError) onError();
          }}
        />
      )}
    </>
  );
};

export default GameCover;
export { optimizeIGDBImageUrl };
