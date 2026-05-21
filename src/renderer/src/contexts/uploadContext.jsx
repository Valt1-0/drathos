import { createContext, useContext, useReducer, useCallback } from "react";

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }
  return context;
};

const INITIAL_STATE = {
  isUploading: false,
  uploadState: "idle", // idle | queued | uploading | success | error | duplicate
  uploadProgress: 0,
  uploadSpeed: 0,
  uploadETA: 0,
  uploadLoaded: 0,
  uploadTotal: 0,
  uploadGameName: "",
  uploadError: "",
  queueInfo: { active: 0, queued: 0, maxSimultaneous: 2 },
};

const uploadReducer = (state, action) => {
  switch (action.type) {
    case "START":
      return {
        ...INITIAL_STATE,
        isUploading: true,
        uploadState: "uploading",
        uploadGameName: action.gameName,
      };
    case "PROGRESS": {
      const p = action.payload;
      return {
        ...state,
        uploadState: p.status === "queued" ? "queued" : "uploading",
        uploadProgress: p.percent,
        uploadSpeed: p.speed,
        uploadETA: p.eta,
        uploadLoaded: p.loaded,
        uploadTotal: p.total,
        queueInfo: p.queueInfo ?? state.queueInfo,
      };
    }
    case "COMPLETE":
      return { ...state, uploadState: "success" };
    case "FAIL":
      return { ...state, uploadState: "error", uploadError: action.error };
    case "DUPLICATE":
      return { ...state, uploadState: "duplicate" };
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
};

export const UploadProvider = ({ children }) => {
  const [state, dispatch] = useReducer(uploadReducer, INITIAL_STATE);

  const startUpload = useCallback((gameName) => {
    dispatch({ type: "START", gameName });
  }, []);

  const updateUploadProgress = useCallback((progressData) => {
    dispatch({ type: "PROGRESS", payload: progressData });
  }, []);

  const completeUpload = useCallback(() => {
    dispatch({ type: "COMPLETE" });
    setTimeout(() => dispatch({ type: "RESET" }), 5000);
  }, []);

  const failUpload = useCallback((error) => {
    dispatch({ type: "FAIL", error });
    setTimeout(() => dispatch({ type: "RESET" }), 10000);
  }, []);

  const duplicateUpload = useCallback(() => {
    dispatch({ type: "DUPLICATE" });
    setTimeout(() => dispatch({ type: "RESET" }), 6000);
  }, []);

  const resetUpload = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const dismissUpload = useCallback(() => {
    if (state.uploadState !== "uploading") {
      dispatch({ type: "RESET" });
    }
  }, [state.uploadState]);

  return (
    <UploadContext.Provider
      value={{
        ...state,
        startUpload,
        updateUploadProgress,
        completeUpload,
        failUpload,
        duplicateUpload,
        resetUpload,
        dismissUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
