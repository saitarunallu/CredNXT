import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '@/hooks/use-network-status'

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    navigator.onLine = true
    
    // Clear event listeners
    window.removeEventListener('online', vi.fn())
    window.removeEventListener('offline', vi.fn())
  })

  it('should return initial online status', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.wasOffline).toBe(false)
  })

  it('should handle offline event', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    act(() => {
      navigator.onLine = false
      window.dispatchEvent(new Event('offline'))
    })
    
    expect(result.current.isOnline).toBe(false)
    expect(result.current.wasOffline).toBe(true)
  })

  it('should handle online event after being offline', () => {
    const { result } = renderHook(() => useNetworkStatus())
    
    // Go offline first
    act(() => {
      navigator.onLine = false
      window.dispatchEvent(new Event('offline'))
    })
    
    expect(result.current.wasOffline).toBe(true)
    
    // Come back online
    act(() => {
      navigator.onLine = true
      window.dispatchEvent(new Event('online'))
    })
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.wasOffline).toBe(false)
  })
})