import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../utils'
import ErrorBoundary from '@/components/ui/error-boundary'

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try refreshing the page.')).toBeInTheDocument()
    expect(screen.getByTestId('button-try-again')).toBeInTheDocument()
    expect(screen.getByTestId('button-refresh')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('resets error when try again button is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    
    fireEvent.click(screen.getByTestId('button-try-again'))
    
    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })
})