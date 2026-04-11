import { useState, useCallback } from "react";
import { getFavorites, toggleFavorite as toggleFav, isFavorite as checkFav } from "../lib/common";

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => getFavorites());

  const toggle = useCallback((entry) => {
    const saved = toggleFav(entry);
    setFavorites(getFavorites());
    return saved;
  }, []);

  const isSaved = useCallback((id) => checkFav(id), [favorites]);

  return { favorites, toggle, isSaved };
}
