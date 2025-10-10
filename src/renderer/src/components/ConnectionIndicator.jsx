// drathos/src/renderer/src/components/ConnectionIndicator.jsx

import { useConnection } from "../contexts/connectionContext";

export default function ConnectionIndicator() {
  const { isOnline } = useConnection();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
      {/* Point indicateur */}
      <div className="relative flex items-center justify-center">
        {isOnline ? (
          <>
            {/* Point vert avec animation pulse */}
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
          </>
        ) : (
          <>
            {/* Point rouge */}
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          </>
        )}
      </div>

      {/* Texte */}
      <span className={`text-xs font-medium ${isOnline ? "text-green-400" : "text-red-400"}`}>
        {isOnline ? "Connecté" : "Hors ligne"}
      </span>
    </div>
  );
}
