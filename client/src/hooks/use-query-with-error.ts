import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from './use-network-status';
import React from 'react';

interface QueryWithErrorOptions<TData, TError = Error> extends UseQueryOptions<TData, TError> {
  showErrorToast?: boolean;
  errorMessage?: string;
  showNetworkError?: boolean;
}

export function useQueryWithError<TData, TError = Error>(
  options: QueryWithErrorOptions<TData, TError>
): UseQueryResult<TData, TError> & { isNetworkError: boolean } {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  
  const {
    showErrorToast = true,
    errorMessage = 'An error occurred while loading data',
    showNetworkError = true,
    ...queryOptions
  } = options;

  const query = useQuery({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      
      // Don't retry 4xx errors
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) return false;
      }
      
      // Default retry logic
      return failureCount < 3;
    }
  });

  // Handle errors with useEffect since onError is deprecated in React Query v5
  React.useEffect(() => {
    if (query.error) {
      if (showErrorToast && isOnline) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      if (showNetworkError && !isOnline) {
        toast({
          title: 'Network Error',
          description: 'Please check your internet connection',
          variant: 'destructive',
        });
      }
    }
  }, [query.error, showErrorToast, isOnline, toast, errorMessage, showNetworkError]);

  const isNetworkError = !isOnline || (query.isError && !isOnline);

  return {
    ...query,
    isNetworkError,
  };
}