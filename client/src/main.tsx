import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection in', process.env.NODE_ENV || 'production', ':', {
    reason: event.reason,
    message: event.reason?.message,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
  
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
