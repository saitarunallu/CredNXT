import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../utils'
import NetworkError, { NetworkLoading, EmptyState } from '@/components/ui/network-error'

describe('NetworkError', () => {
  it('renders default error message', () => {
    render(<NetworkError />)
    
    expect(screen.getByText('Connection Problem')).toBeInTheDocument()
    expect(screen.getByText(/We're having trouble connecting/)).toBeInTheDocument()
    expect(screen.getByTestId('button-retry-network')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <NetworkError 
        title="Custom Error" 
        description="Custom description" 
      />
    )
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const mockRetry = vi.fn()
    render(<NetworkError onRetry={mockRetry} />)
    
    fireEvent.click(screen.getByTestId('button-retry-network'))
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })
})

describe('NetworkLoading', () => {
  it('renders default loading message', () => {
    render(<NetworkLoading />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('network-loading')).toBeInTheDocument()
  })

  it('renders custom loading message', () => {
    render(<NetworkLoading message="Custom loading..." />)
    
    expect(screen.getByText('Custom loading...')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('renders default empty state', () => {
    render(<EmptyState />)
    
    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByText("There's nothing to show here yet.")).toBeInTheDocument()
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('renders custom title and description', () => {
    render(
      <EmptyState 
        title="No offers found"
        description="Create your first offer to get started"
      />
    )
    
    expect(screen.getByText('No offers found')).toBeInTheDocument()
    expect(screen.getByText('Create your first offer to get started')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    render(
      <EmptyState 
        action={<button data-testid="action-button">Create Offer</button>}
      />
    )
    
    expect(screen.getByTestId('action-button')).toBeInTheDocument()
  })
})