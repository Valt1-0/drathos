import { createContext, useContext } from "react";

export const GamesContext = createContext(null);
export const useGames = () => useContext(GamesContext);
