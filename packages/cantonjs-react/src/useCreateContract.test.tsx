import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { CantonProvider } from './context.js'
import { useCreateContract } from './useCreateContract.js'
import type { LedgerClient, CreatedEvent } from './types.js'

const CREATED_EVENT: CreatedEvent = {
  contractId: 'contract-1',
  templateId: '#pkg:Mod:T',
  createArgument: { owner: 'Alice', value: 100 },
}

function mockClient(): LedgerClient {
  return {
    actAs: 'Alice::1234',
    readAs: [],
    createContract: vi.fn().mockResolvedValue(CREATED_EVENT),
    exerciseChoice: vi.fn(),
    queryContracts: vi.fn().mockResolvedValue([]),
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

describe('useCreateContract', () => {
  it('creates a contract and returns the created event', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useCreateContract({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({
        createArguments: { owner: 'Alice', value: 100 },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(CREATED_EVENT)
    expect(client.createContract).toHaveBeenCalledWith(
      '#pkg:Mod:T',
      { owner: 'Alice', value: 100 },
      { commandId: undefined, workflowId: undefined },
    )
  })

  it('calls onSuccess callback', async () => {
    const client = mockClient()
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useCreateContract({ templateId: '#pkg:Mod:T', onSuccess }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({
        createArguments: { owner: 'Alice', value: 100 },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(CREATED_EVENT)
  })

  it('returns error on failure', async () => {
    const client = mockClient()
    ;(client.createContract as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Permission denied'),
    )
    const { result } = renderHook(
      () => useCreateContract({ templateId: '#pkg:Mod:T' }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({ createArguments: { owner: 'Alice' } })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Permission denied')
  })
})
