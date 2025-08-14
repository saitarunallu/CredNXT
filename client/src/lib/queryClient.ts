import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> }
): Promise<Response> {
  try {
    const token = localStorage.getItem('auth_token');
    
    const headers = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    };

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const token = localStorage.getItem('auth_token');
      
      const res = await fetch(queryKey.join("/") as string, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (res.status === 401) {
        // Clear auth data on 401 and handle appropriately
        localStorage.removeItem('auth_token');
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
      console.error(`Query failed for ${queryKey.join("/")}:`, error);
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
        }
      },
      onError: (error) => {
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
