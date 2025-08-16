import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import { NetworkError } from '@/components/ui/network-error';

describe('NetworkError', () => {
  it('renders network error message', () => {
    render(<NetworkError onRetry={vi.fn()} />);

    expect(screen.getByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetryMock = vi.fn();
    const { user } = render(<NetworkError onRetry={onRetryMock} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during retry', async () => {
    const onRetryMock = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const { user } = render(<NetworkError onRetry={onRetryMock} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(screen.getByText(/retrying/i)).toBeInTheDocument();
    expect(retryButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });
  });

  it('displays custom error message when provided', () => {
    const customMessage = 'Custom network error occurred';
    render(<NetworkError onRetry={vi.fn()} message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<NetworkError onRetry={vi.fn()} />);

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toHaveAttribute('data-testid', 'button-retry-network');
  });

  it('shows network status information', () => {
    render(<NetworkError onRetry={vi.fn()} showNetworkStatus={true} />);

    expect(screen.getByText(/network status/i)).toBeInTheDocument();
  });
});