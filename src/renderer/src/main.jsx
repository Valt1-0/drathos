import "./assets/main.css";

import ReactDOM from "react-dom/client";
import App from "./App";

// Global error handlers for crash reporting
// Skip errors already handled by React ErrorBoundary (they set _handledByBoundary)
window.addEventListener('error', (event) => {
  if (event.error?._handledByBoundary) return;
  window.api?.crashReport?.send({
    error: { message: event.message, stack: event.error?.stack },
    context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  window.api?.crashReport?.send({
    error: {
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason?.stack,
    },
    context: { type: 'unhandledrejection' },
  });
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
