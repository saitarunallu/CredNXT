import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise,
      stack: event.reason?.stack,
      message: event.reason?.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // In production, just log basic error info without full details
    console.error('Unhandled promise rejection:', event.reason?.message || 'Unknown error');
  }
  
  // Log additional context for debugging
  if (event.reason instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        name: event.reason.name,
        message: event.reason.message,
        stack: event.reason.stack
      });
    }
  }
  
  // Don't prevent default to see more details in console
  // event.preventDefault();
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Uncaught error:', event.error);
  } else {
    console.error('Uncaught error:', event.error?.message || 'Unknown error');
  }
});

createRoot(document.getElementById("root")!).render(<App />);
