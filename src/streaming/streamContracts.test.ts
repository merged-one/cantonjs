import { describe, it, expect, vi, beforeEach } from 'vitest'
import { streamContracts } from './streamContracts.js'
import type { WebSocketConstructor, WebSocketLike } from './types.js'

type MockWebSocket = WebSocketLike & {
  simulateOpen(): void
  simulateMessage(data: unknown): void
  simulateClose(code?: number, reason?: string): void
  sentMessages: string[]
}

function createMockWebSocket(): {
  MockWS: WebSocketConstructor
  instances: MockWebSocket[]
} {
  const instances: MockWebSocket[] = []

  const MockWS = vi.fn().mockImplementation(() => {
    const ws: MockWebSocket = {
      readyState: 0,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      sentMessages: [],
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

const eventFormat = {
  filtersByParty: {
    'Alice::1220': {
      cumulative: [{ identifierFilter: { WildcardFilter: { value: {} } } }],
    },
  },
}

describe('streamContracts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('connects to /v2/state/active-contracts endpoint', async () => {
    const { MockWS } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    expect(MockWS as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'ws://localhost:7575/v2/state/active-contracts',
      undefined,
    )

    await iter.return!()
    vi.useRealTimers()
  })

  it('sends eventFormat in subscription request', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.eventFormat).toEqual(eventFormat)

    await iter.return!()
    vi.useRealTimers()
  })

  it('includes activeAtOffset when provided', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
      activeAtOffset: 42,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.activeAtOffset).toBe(42)

    await iter.return!()
    vi.useRealTimers()
  })

  it('yields contract entries', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    instances[0]!.simulateMessage({
      contractEntry: {
        JsActiveContract: {
          createdEvent: {
            offset: 1, nodeId: 0, contractId: 'c-1',
            templateId: '#pkg:Mod:Tmpl', packageName: 'pkg',
            representativePackageId: 'abc', createArgument: { value: 1 },
            signatories: ['Alice::1220'], witnessParties: ['Alice::1220'],
            acsDelta: true, createdAt: '2026-04-01T00:00:00Z',
          },
          synchronizerId: 'sync-1',
          reassignmentCounter: 0,
        },
      },
    })

    const result = await iter.next()
    expect(result.done).toBe(false)
    expect(result.value!.contractEntry).toBeDefined()

    await iter.return!()
    vi.useRealTimers()
  })

  it('completes when server closes the bounded stream (code 1000)', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    instances[0]!.simulateMessage({ contractEntry: { JsEmpty: {} } })
    await iter.next()

    instances[0]!.simulateClose(1000, '')

    const result = await iter.next()
    expect(result.done).toBe(true)
    vi.useRealTimers()
  })

  it('does not reconnect (bounded stream)', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // Unexpected close should error, not reconnect
    instances[0]!.simulateClose(1006, 'unexpected')

    await expect(iter.next()).rejects.toThrow('Stream closed unexpectedly')
    expect(instances).toHaveLength(1) // No reconnect
    vi.useRealTimers()
  })

  it('collects all contracts with for-await-of', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamContracts({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      eventFormat,
    })

    const entries: unknown[] = []
    const consumePromise = (async () => {
      for await (const entry of stream) {
        entries.push(entry)
      }
    })()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    instances[0]!.simulateMessage({ contractEntry: { JsActiveContract: { id: 1 } } })
    instances[0]!.simulateMessage({ contractEntry: { JsActiveContract: { id: 2 } } })
    instances[0]!.simulateClose(1000, '')

    await consumePromise
    expect(entries).toHaveLength(2)
    vi.useRealTimers()
  })
})
