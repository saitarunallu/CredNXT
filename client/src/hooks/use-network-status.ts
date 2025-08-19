import { useState, useEffect } from 'react';

/**
 * Custom React hook to track the network status (online/offline).
 * @example
 * const { isOnline, wasOffline } = useNetworkStatus();
 * // Example usage for conditional rendering based on network status.
 * @returns {Object} Return an object with properties `isOnline` and `wasOffline` indicating the network state.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      if (wasOffline) {
        // Optionally trigger a toast notification
        console.log('Connection restored');
      }
      setWasOffline(false);
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
}