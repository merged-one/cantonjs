import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { CantonProvider } from './context.js'
import { useExercise } from './useExercise.js'
import type { LedgerClient, JsTransaction } from './types.js'

const TX_RESULT: JsTransaction = {
  updateId: 'tx-1',
  events: [{ Created: { contractId: 'contract-2' } }],
}

function mockClient(): LedgerClient {
  return {
    actAs: 'Alice::1234',
    readAs: [],
    createContract: vi.fn(),
    exerciseChoice: vi.fn().mockResolvedValue(TX_RESULT),
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

describe('useExercise', () => {
  it('exercises a choice and returns the transaction', async () => {
    const client = mockClient()
    const { result } = renderHook(
      () => useExercise({ templateId: '#pkg:Mod:T', choice: 'Transfer' }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({
        contractId: 'contract-1',
        choiceArgument: { newOwner: 'Bob' },
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(TX_RESULT)
    expect(client.exerciseChoice).toHaveBeenCalledWith(
      '#pkg:Mod:T',
      'contract-1',
      'Transfer',
      { newOwner: 'Bob' },
      { commandId: undefined, workflowId: undefined },
    )
  })

  it('calls onSuccess callback', async () => {
    const client = mockClient()
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useExercise({ templateId: '#pkg:Mod:T', choice: 'Archive', onSuccess }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({
        contractId: 'contract-1',
        choiceArgument: {},
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(TX_RESULT)
  })

  it('returns error on failure', async () => {
    const client = mockClient()
    ;(client.exerciseChoice as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Contract not found'),
    )
    const { result } = renderHook(
      () => useExercise({ templateId: '#pkg:Mod:T', choice: 'Transfer' }),
      { wrapper: createWrapper(client) },
    )

    act(() => {
      result.current.mutate({
        contractId: 'contract-1',
        choiceArgument: { newOwner: 'Bob' },
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Contract not found')
  })
})
