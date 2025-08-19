import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorDetails = {
    reason: event.reason,
    message: event.reason?.message || 'Unknown error',
    stack: event.reason?.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  console.error('🚨 Unhandled promise rejection in', import.meta.env.MODE || 'production', ':', errorDetails);
  
  // Log additional context for debugging
  if (event.reason instanceof Error) {
    if (import.meta.env.DEV) {
      console.error('Error details:', {
        name: event.reason.name,
        message: event.reason.message,
        stack: event.reason.stack
      });
    }
    
    // Handle specific error types
    if (event.reason.message?.includes('Firebase') || event.reason.message?.includes('auth')) {
      console.warn('Firebase authentication error detected - may need to refresh tokens');
    }
    
    if (event.reason.message?.includes('Network') || event.reason.message?.includes('fetch')) {
      console.warn('Network error detected - check internet connection');
    }
  }
  
  // Don't prevent default to see more details in console
  // event.preventDefault();
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  if (import.meta.env.DEV) {
    console.error('Uncaught error:', event.error);
  } else {
    console.error('Uncaught error:', event.error?.message || 'Unknown error');
  }
});

createRoot(document.getElementById("root")!).render(<App />);
