import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CantonProvider, useCantonClient, useParty } from './context.js'
import type { LedgerClient } from './types.js'

function mockClient(actAs = 'Alice::1234'): LedgerClient {
  return {
    actAs,
    readAs: [],
    createContract: vi.fn(),
    exerciseChoice: vi.fn(),
    queryContracts: vi.fn().mockResolvedValue([]),
  }
}

function createWrapper(client: LedgerClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      CantonProvider,
      { client, queryClient },
      children,
    )
  }
}

describe('CantonProvider', () => {
  it('provides the client to child hooks', () => {
    const client = mockClient()
    const { result } = renderHook(() => useCantonClient(), {
      wrapper: createWrapper(client),
    })
    expect(result.current).toBe(client)
  })

  it('throws when useCantonClient is used outside provider', () => {
    const queryClient = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    expect(() =>
      renderHook(() => useCantonClient(), { wrapper }),
    ).toThrow('useCantonClient must be used within a CantonProvider')
  })

  it('creates and uses the default QueryClient when one is not provided', () => {
    const client = mockClient()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(CantonProvider, { client }, children)

    const { result } = renderHook(() => useCantonClient(), { wrapper })
    expect(result.current).toBe(client)
  })
})

describe('useParty', () => {
  it('returns the actAs party from the client', () => {
    const client = mockClient('Bob::5678')
    const { result } = renderHook(() => useParty(), {
      wrapper: createWrapper(client),
    })
    expect(result.current).toBe('Bob::5678')
  })
})
