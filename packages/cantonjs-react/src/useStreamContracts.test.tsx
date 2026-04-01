import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { CantonProvider } from './context.js'
import { useStreamContracts } from './useStreamContracts.js'
import type { LedgerClient, ActiveContract } from './types.js'

const CONTRACT: ActiveContract = {
  createdEvent: {
    contractId: 'contract-1',
    templateId: '#pkg:Mod:T',
    createArgument: { owner: 'Alice' },
  },
  synchronizerId: 'sync-1',
  reassignmentCounter: 0,
}

function mockClient(contracts: readonly ActiveContract[] = [CONTRACT]): LedgerClient {
  return {
    actAs: 'Alice::1234',
    readAs: [],
    createContract: vi.fn(),
    exerciseChoice: vi.fn(),
    queryContracts: vi.fn().mockResolvedValue(contracts),
  }
}

function createWrapper(client: LedgerClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(CantonProvider, { client, queryClient }, children)
  }
}

describe('useStreamContracts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads contracts on mount', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useStreamContracts({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.contracts).toEqual([CONTRACT])
    expect(result.current.error).toBeNull()
  })

  it('polls on interval', async () => {
    const client = mockClient()
    renderHook(
      () => useStreamContracts({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    const callsAfterMount = (client.queryContracts as ReturnType<typeof vi.fn>).mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000)
    })

    // Should have at least one additional call from the interval
    expect((client.queryContracts as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsAfterMount)
  })

  it('does not poll when disabled', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useStreamContracts({ templateId: '#pkg:Mod:T', enabled: false }),
      { wrapper: createWrapper(client) },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(client.queryContracts).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(true)
  })

  it('handles query errors', async () => {
    const client = mockClient()
    ;(client.queryContracts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Stream error'),
    )
    const { result } = renderHook(
      () => useStreamContracts({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })

    expect(result.current.error?.message).toBe('Stream error')
    expect(result.current.isLoading).toBe(false)
  })
})
