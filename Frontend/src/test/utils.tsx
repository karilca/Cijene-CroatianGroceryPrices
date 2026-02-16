import React from 'react'
import { render, renderHook, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// Test utilities for React Query
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Wrapper for components that need QueryClient
const QueryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Wrapper for components that need Router
const RouterWrapper: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/']
}) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  )
}

// Combined wrapper for components that need both QueryClient and Router
const AllProvidersWrapper: React.FC<{
  children: React.ReactNode
  initialEntries?: string[]
}> = ({ children, initialEntries = ['/'] }) => {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Custom render function with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions & { initialEntries?: string[] }
) => {
  const { initialEntries, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProvidersWrapper initialEntries={initialEntries}>
        {children}
      </AllProvidersWrapper>
    ),
    ...renderOptions,
  })
}

// Custom renderHook function with providers
export const renderHookWithProviders = <T,>(
  hook: () => T,
  options?: { initialEntries?: string[] }
) => {
  const { initialEntries } = options || {}

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <AllProvidersWrapper initialEntries={initialEntries}>
        {children}
      </AllProvidersWrapper>
    ),
  })
}

// Mock local storage
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key]
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key])
    }),
    length: 0,
    key: vi.fn(),
  }
}

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: vi.fn((success: (position: GeolocationPosition) => void) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 45.8150,
        longitude: 15.9819,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }
    success(position)
  }),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

// Wait for loading to complete
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Import userEvent
import userEvent from '@testing-library/user-event'
export { userEvent }