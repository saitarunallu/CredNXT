import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    message: event.reason?.message,
    timestamp: new Date().toISOString()
  });
  
  // Log additional context for debugging
  if (event.reason instanceof Error) {
    console.error('Error details:', {
      name: event.reason.name,
      message: event.reason.message,
      stack: event.reason.stack
    });
  }
  
  // Prevent the default browser behavior of logging to console
  event.preventDefault();
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
