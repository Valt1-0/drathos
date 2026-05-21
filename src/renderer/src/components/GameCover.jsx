import { useState, useEffect, memo } from "react";
import imageCacheService from "../services/imageCacheService";
import logger from "../services/logger";

const optimizeIGDBImageUrl = (url, size = "cover_small") => {
  if (!url) return "";

  // If the URL is already optimized, return it as-is
  if (
    url.includes("t_cover_small") ||
    url.includes("t_cover_big") ||
    url.includes("t_thumb")
  ) {
    return url;
  }

  // Replace t_thumb with the requested size
  // Available sizes on IGDB:
  // - t_thumb: 90x128
  // - t_cover_small: 264x352
  // - t_cover_big: 528x704
  // - t_screenshot_med: 569x320
  // - t_screenshot_big: 1280x720
  const sizeMap = {
    thumb: "t_thumb",
    cover_small: "t_cover_small",
    cover_big: "t_cover_big",
    screenshot_med: "t_screenshot_med",
    screenshot_big: "t_screenshot_big",
  };

  const igdbSize = sizeMap[size] || "t_cover_small";

  return url.replace(
    /t_thumb|t_cover_small|t_cover_big|t_screenshot_med|t_screenshot_big|t_screenshot_huge|t_1080p/g,
    igdbSize,
  );
};

const GameCover = ({
  src,
  alt,
  className = "",
  size = "cover_small",
  onError,
  blur = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    setHasError(false);

    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const optimizedUrl = optimizeIGDBImageUrl(src, size);

    const memoryCache = imageCacheService.memoryCache;
    if (memoryCache && memoryCache.has(optimizedUrl)) {
      const cached = memoryCache.get(optimizedUrl);
      if (cached && cached.blobUrl) {
        setImageSrc(cached.blobUrl);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);

    const loadImage = async () => {
      try {
        const cachedImageUrl =
          await imageCacheService.fetchAndCache(optimizedUrl);
        setImageSrc(cachedImageUrl);
        setIsLoading(false);
      } catch (error) {
        logger.warn(`[GameCover] Erreur lors du chargement de l'image: ${error.message}`);
        setImageSrc(optimizedUrl);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src, size]);

  const placeholderClasses = `${className} bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center`;

  const imageClasses = `${className} ${blur ? "blur-sm" : ""} transition-opacity duration-300 ${imageSrc ? "opacity-100" : "opacity-0"}`;

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
      {!imageSrc && !hasError && (
        <div className={`${className} relative overflow-hidden`}>
          <div
            className="absolute inset-0"
            style={{ background: "var(--app-surface)" }}
          />
          {isLoading && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, var(--app-backgroundSecondary) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          )}
        </div>
      )}

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

// onError is excluded from comparison — it's a callback that changes identity on every
// parent render but doesn't affect whether the image needs to be re-fetched or re-rendered.
export default memo(GameCover, (prev, next) =>
  prev.src === next.src &&
  prev.size === next.size &&
  prev.className === next.className &&
  prev.blur === next.blur &&
  prev.alt === next.alt
);
export { optimizeIGDBImageUrl };
