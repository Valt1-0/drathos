// drathos/src/renderer/src/components/ConnectionIndicator.jsx

import { useConnection } from "../contexts/connectionContext";

export default function ConnectionIndicator() {
  const { isOnline } = useConnection();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700/50">
      <div className="relative flex items-center justify-center">
        {isOnline ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="absolute w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </>
        ) : (
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        )}
      </div>
      <span className={`text-xs font-medium transition-colors ${isOnline ? "text-green-400" : "text-red-400"}`}>
        {isOnline ? "En ligne" : "Hors ligne"}
      </span>
    </div>
  );
}
