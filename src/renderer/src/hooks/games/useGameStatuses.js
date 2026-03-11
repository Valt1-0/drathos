import { useState, useEffect, useCallback } from "react";

const useGameStatuses = () => {
  const [gameStatuses, setGameStatuses] = useState({});

  useEffect(() => {
    window.store.get("gameStatuses").then(val => setGameStatuses(val || {}));
  }, []);

  const setStatus = useCallback((gameId, status) => {
    const next = { ...gameStatuses };
    if (status === null) {
      delete next[gameId];
    } else {
      next[gameId] = status;
    }
    setGameStatuses(next);
    window.store.set("gameStatuses", next);
  }, [gameStatuses]);

  return { gameStatuses, setStatus };
};

export default useGameStatuses;
