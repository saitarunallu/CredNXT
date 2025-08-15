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
  
  // Don't prevent default to see more details in console
  // event.preventDefault();
});

// Global error handling for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

console.log('Main.tsx is executing');
console.log('Root element:', document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error('Root element not found!');
  } else {
    console.log('Creating root...');
    const root = createRoot(rootElement);
    console.log('Rendering App...');
    root.render(<div style={{padding: '20px', fontSize: '24px', fontWeight: 'bold'}}>CredNXT Test - React is working!</div>);
    console.log('App rendered successfully');
  }
} catch (error) {
  console.error('Error rendering app:', error);
}
