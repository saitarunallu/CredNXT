import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('allows users to retry after an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    // After clicking retry, the error boundary should reset
    // Since we're not changing the shouldThrow prop, it will error again
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('includes error details in development mode', () => {
    const originalEnv = import.meta.env.MODE;
    import.meta.env.MODE = 'development';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details/i)).toBeInTheDocument();

    consoleSpy.mockRestore();
    import.meta.env.MODE = originalEnv;
  });

  it('shows appropriate error boundary UI in production mode', () => {
    const originalEnv = import.meta.env.MODE;
    import.meta.env.MODE = 'production';

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();

    consoleSpy.mockRestore();
    import.meta.env.MODE = originalEnv;
  });

  it('has proper accessibility attributes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer).toHaveAttribute('aria-live', 'assertive');

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toHaveAttribute('data-testid', 'button-retry-error');

    consoleSpy.mockRestore();
  });
});