import { describe, it, expect, vi, beforeEach } from 'vitest'
import { streamUpdates } from './streamUpdates.js'
import type { WebSocketConstructor, WebSocketLike } from './types.js'
import type { TaggedUpdate } from '../types/transaction.js'

type MockWebSocket = WebSocketLike & {
  simulateOpen(): void
  simulateMessage(data: unknown): void
  simulateClose(code?: number, reason?: string): void
  sentMessages: string[]
  protocols?: string | string[]
}

function createMockWebSocket(): {
  MockWS: WebSocketConstructor
  instances: MockWebSocket[]
} {
  const instances: MockWebSocket[] = []

  const MockWS = vi.fn().mockImplementation((_url: string, protocols?: string | string[]) => {
    const ws: MockWebSocket = {
      readyState: 0,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      sentMessages: [],
      protocols,
      close() { ws.readyState = 3 },
      send(data: string) { ws.sentMessages.push(data) },
      simulateOpen() {
        ws.readyState = 1
        ws.onopen?.(null)
      },
      simulateMessage(data: unknown) {
        ws.onmessage?.({ data: JSON.stringify(data) })
      },
      simulateClose(code = 1006, reason = '') {
        ws.readyState = 3
        ws.onclose?.({ code, reason })
      },
    }
    instances.push(ws)
    return ws
  }) as unknown as WebSocketConstructor

  return { MockWS, instances }
}

describe('streamUpdates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('connects to /v2/updates WebSocket endpoint', async () => {
    const { MockWS } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    expect(MockWS as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'ws://localhost:7575/v2/updates',
      undefined,
    )

    await iter.return!()
    vi.useRealTimers()
  })

  it('sends subscription request with beginExclusive and updateFormat', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const updateFormat = {
      includeTransactions: {
        transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA' as const,
        eventFormat: { filtersByParty: {} },
      },
    }

    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      beginExclusive: 10,
      updateFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.beginExclusive).toBe(10)
    expect(request.updateFormat).toEqual(updateFormat)

    await iter.return!()
    vi.useRealTimers()
  })

  it('sends endInclusive for bounded streams', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      beginExclusive: 0,
      endInclusive: 100,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.endInclusive).toBe(100)

    await iter.return!()
    vi.useRealTimers()
  })

  it('yields Transaction updates', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const txUpdate: TaggedUpdate = {
      Transaction: {
        value: {
          updateId: 'u-1',
          events: [],
          offset: 5,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      },
    }
    instances[0]!.simulateMessage(txUpdate)

    const result = await iter.next()
    expect(result.done).toBe(false)
    expect('Transaction' in result.value!).toBe(true)
    if ('Transaction' in result.value!) {
      expect(result.value.Transaction.value.updateId).toBe('u-1')
    }

    await iter.return!()
    vi.useRealTimers()
  })

  it('yields OffsetCheckpoint updates', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const checkpoint: TaggedUpdate = {
      OffsetCheckpoint: {
        value: { offset: 15 },
      },
    }
    instances[0]!.simulateMessage(checkpoint)

    const result = await iter.next()
    expect(result.done).toBe(false)
    if ('OffsetCheckpoint' in result.value!) {
      expect(result.value.OffsetCheckpoint.value.offset).toBe(15)
    }

    await iter.return!()
    vi.useRealTimers()
  })

  it('resumes from last transaction offset on reconnect', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      beginExclusive: 0,
      reconnect: { initialDelay: 50, jitter: 0, maxAttempts: 1 },
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // Receive a transaction at offset 25
    instances[0]!.simulateMessage({
      Transaction: {
        value: {
          updateId: 'u-1', events: [], offset: 25,
          synchronizerId: 'sync-1', effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      },
    })
    await iter.next()

    // Disconnect and reconnect
    instances[0]!.simulateClose(1006, '')
    await vi.advanceTimersByTimeAsync(50)

    instances[1]!.simulateOpen()
    const request = JSON.parse(instances[1]!.sentMessages[0]!)
    expect(request.beginExclusive).toBe(25) // Resumed from last offset

    await iter.return!()
    vi.useRealTimers()
  })

  it('disables reconnect for bounded streams (endInclusive set)', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      endInclusive: 50,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // Normal close on bounded stream = done
    instances[0]!.simulateClose(1000, '')

    const result = await iter.next()
    expect(result.done).toBe(true)
    vi.useRealTimers()
  })

  it('uses auth subprotocols when token provided', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      token: 'test-jwt',
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    expect(instances[0]!.protocols).toEqual(['daml.ws.auth', 'jwt.token.test-jwt'])

    await iter.return!()
    vi.useRealTimers()
  })

  it('does not advance the resume cursor for updates without a transaction offset', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamUpdates({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      beginExclusive: 12,
      reconnect: { initialDelay: 50, jitter: 0, maxAttempts: 1 },
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateMessage({
      Reassignment: {
        updateId: 'reassignment-1',
        offset: 99,
        events: [],
        recordTime: '2025-01-01T00:00:00Z',
      },
    } as TaggedUpdate)
    await iter.next()

    instances[0]!.simulateClose(1006, '')
    await vi.advanceTimersByTimeAsync(50)

    instances[1]!.simulateOpen()
    const request = JSON.parse(instances[1]!.sentMessages[0]!)
    expect(request.beginExclusive).toBe(12)

    await iter.return!()
    vi.useRealTimers()
  })
})
