import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { vi } from 'vitest';

// Mock providers for testing
const createMockQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialRoute?: string;
}

const AllTheProviders = ({ 
  children, 
  queryClient = createMockQueryClient(),
  initialRoute = '/'
}: AllTheProvidersProps) => {
  // Mock the wouter router with memory history
  const mockRouter = {
    base: '',
    hook: () => [initialRoute, (path: string) => vi.fn()],
    matcher: (pattern: string, path: string) => [true, {}],
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={() => [initialRoute, vi.fn()]}>
        {children}
      </Router>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, initialRoute, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders 
        queryClient={queryClient} 
        initialRoute={initialRoute}
        {...props} 
      />
    ),
    ...renderOptions,
  });
};

// Mock API responses
export const mockApiResponse = function<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
};

// Mock fetch implementation
export const mockFetch = (response: any) => {
  vi.mocked(global.fetch).mockResolvedValueOnce(response as Response);
};

// Mock user data
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Mock offer data
export const mockOffer = {
  id: '1',
  lenderId: '1',
  borrowerId: '2',
  amount: 50000,
  interestRate: 12,
  tenure: 12,
  repaymentFrequency: 'monthly' as const,
  repaymentType: 'emi' as const,
  status: 'pending' as const,
  purpose: 'Business expansion',
  dueDate: new Date('2024-12-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Mock payment data
export const mockPayment = {
  id: '1',
  offerId: '1',
  amount: 4500,
  installmentNumber: 1,
  status: 'pending' as const,
  dueDate: new Date('2024-02-01'),
  submittedAt: new Date('2024-01-28'),
  createdAt: new Date('2024-01-28'),
  updatedAt: new Date('2024-01-28'),
};

// Utility to create mock authenticated user context
export const createMockAuthContext = (user = mockUser, isLoggedIn = true) => ({
  user: isLoggedIn ? user : null,
  isLoggedIn,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  loading: false,
});

// Utility to wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Mock WebSocket
export const mockWebSocket = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
};

// Mock local storage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Export everything
export * from '@testing-library/react';
export { customRender as render };
export { createMockQueryClient };