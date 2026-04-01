import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { CantonProvider } from './context.js'
import { useContracts } from './useContracts.js'
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

describe('useContracts', () => {
  it('queries contracts by template ID', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useContracts({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([CONTRACT])
    expect(client.queryContracts).toHaveBeenCalledWith(
      '#pkg:Mod:T',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('does not query when disabled', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useContracts({ templateId: '#pkg:Mod:T', enabled: false }),
      { wrapper: createWrapper(client) },
    )

    // Give it a tick to settle
    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.fetchStatus).toBe('idle')
    expect(client.queryContracts).not.toHaveBeenCalled()
  })

  it('returns error when query fails', async () => {
    const client = mockClient()
    ;(client.queryContracts as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error'),
    )
    const { result } = renderHook(
      () => useContracts({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Network error')
  })
})
