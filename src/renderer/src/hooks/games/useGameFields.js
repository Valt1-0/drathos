import { useCallback } from "react";
import { useTranslation } from "react-i18next";

// Normalizes IGDB genre/platform fields (which may be strings or objects) into
// plain name arrays for display.
export function useGameFields() {
  const { t } = useTranslation();

  const extractGenreName = useCallback(
    (genre) => {
      if (!genre) return t("games.unknown");
      if (typeof genre === "string") return genre;
      return genre.name || genre.slug || genre.id || t("games.unknown");
    },
    [t]
  );

  const extractPlatformName = useCallback(
    (platform) => {
      if (!platform) return t("games.unknown");
      if (typeof platform === "string") return platform;
      return platform.name || platform.slug || platform.id || t("games.unknown");
    },
    [t]
  );

  const getGenresArray = useCallback(
    (game) => {
      if (!game?.genres || !Array.isArray(game.genres)) return [];
      return game.genres.map(extractGenreName);
    },
    [extractGenreName]
  );

  const getPlatformsArray = useCallback(
    (game) => {
      if (!game?.platforms || !Array.isArray(game.platforms)) return ["PC"];
      return game.platforms.map(extractPlatformName);
    },
    [extractPlatformName]
  );

  return { getGenresArray, getPlatformsArray };
}
