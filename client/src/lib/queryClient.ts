import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  // In production, use direct Functions URL if no base URL is set
  if (baseUrl) {
    return `${baseUrl}${path}`;
  }
  
  // Check if we're in production (Firebase hosting)
  const isProduction = window.location.hostname.includes('firebaseapp.com') || 
                      window.location.hostname.includes('web.app') ||
                      window.location.hostname.includes('crednxt-ef673');
  
  if (isProduction) {
    // Use direct Firebase Functions URL since hosting rewrites aren't working
    return `https://api-mzz6re522q-uc.a.run.app${path}`;
  }
  
  // For development, use relative path
  return path;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> }
): Promise<Response> {
  const fullUrl = getApiUrl(url);
  
  // Dynamic import to avoid circular dependency
  const { firebaseAuthService } = await import('./firebase-auth');
  
  try {
    // Try to get fresh token
    let token = localStorage.getItem('firebase_auth_token');
    
    // If no token or request requires fresh token, try to refresh
    if (!token || options?.headers?.['X-Force-Token-Refresh']) {
      console.log('Refreshing Firebase token for API request...');
      token = await firebaseAuthService.refreshToken();
    }
    
    const headers = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    };

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // If 401 and we haven't refreshed yet, try once more with fresh token
    if (res.status === 401 && !options?.headers?.['X-Force-Token-Refresh']) {
      console.log('401 error, refreshing token and retrying...');
      const freshToken = await firebaseAuthService.refreshToken();
      if (freshToken) {
        const retryHeaders = {
          ...headers,
          "Authorization": `Bearer ${freshToken}`
        };
        
        const retryRes = await fetch(fullUrl, {
          method,
          headers: retryHeaders,
          body: data ? JSON.stringify(data) : undefined,
          credentials: "include",
        });
        
        await throwIfResNotOk(retryRes);
        return retryRes;
      }
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${fullUrl}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const fullUrl = getApiUrl(url);
    
    // Dynamic import to avoid circular dependency
    const { firebaseAuthService } = await import('./firebase-auth');
    
    try {
      // Try to get fresh token
      let token = localStorage.getItem('firebase_auth_token');
      
      if (!token) {
        console.log('No token found, attempting to refresh...');
        token = await firebaseAuthService.refreshToken();
      }
      
      const res = await fetch(fullUrl, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (res.status === 401) {
        // Clear auth data on 401 and handle appropriately
        localStorage.removeItem('auth_token');
        localStorage.removeItem('firebase_auth_token');
        localStorage.removeItem('user_data');
        
        if (unauthorizedBehavior === "returnNull") {
          return null;
        } else {
          throw new Error('401: Unauthorized');
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Query failed for ${fullUrl}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30 * 1000, // Refresh every 30 seconds instead of 3 seconds
      refetchOnWindowFocus: true,
      staleTime: 10 * 1000, // Consider data fresh for 10 seconds
      retry: 1, // Allow one retry on failure
    },
    mutations: {
      retry: false,
      onSuccess: async () => {
        try {
          // Immediately invalidate all related data after mutations
          await Promise.allSettled([
            queryClient.invalidateQueries({ queryKey: ['/api/offers'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
          ]);
        } catch (error) {
          console.error('Error invalidating queries after mutation:', error);
          // Ensure no unhandled rejections
        }
      },
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // Ensure all mutation errors are properly handled
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            console.warn('Authentication error in mutation');
          } else if (error.message.includes('Network')) {
            console.warn('Network error in mutation');
          }
        }
      },
    },
  },
});
