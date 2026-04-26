import { useState, useEffect, useCallback } from "react";

const useGameStatuses = () => {
  const [gameStatuses, setGameStatuses] = useState({});

  useEffect(() => {
    window.store.get("gameStatuses").then(val => setGameStatuses(val || {}));
  }, []);

  const setStatus = useCallback((gameId, status) => {
    setGameStatuses(prev => {
      const next = { ...prev };
      if (status === null) {
        delete next[gameId];
      } else {
        next[gameId] = status;
      }
      window.store.set("gameStatuses", next);
      return next;
    });
  }, []);

  return { gameStatuses, setStatus };
};

export default useGameStatuses;
