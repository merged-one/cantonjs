import { describe, it, expect, vi, beforeEach } from 'vitest'
import { streamCompletions } from './streamCompletions.js'
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

describe('streamCompletions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('connects to /v2/commands/completions endpoint', async () => {
    const { MockWS } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    expect(MockWS as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      'ws://localhost:7575/v2/commands/completions',
      undefined,
    )

    await iter.return!()
    vi.useRealTimers()
  })

  it('sends parties and beginExclusive in subscription request', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220', 'Bob::5678'],
      beginExclusive: 5,
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.parties).toEqual(['Alice::1220', 'Bob::5678'])
    expect(request.beginExclusive).toBe(5)

    await iter.return!()
    vi.useRealTimers()
  })

  it('includes applicationId when provided', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
      applicationId: 'my-app',
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const request = JSON.parse(instances[0]!.sentMessages[0]!)
    expect(request.applicationId).toBe('my-app')

    await iter.return!()
    vi.useRealTimers()
  })

  it('yields completion events', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    instances[0]!.simulateMessage({
      completion: {
        commandId: 'cmd-1',
        updateId: 'u-1',
        status: { code: 0, message: 'OK' },
        offset: 10,
        synchronizerId: 'sync-1',
      },
    })

    const result = await iter.next()
    expect(result.done).toBe(false)
    expect(result.value!.completion.commandId).toBe('cmd-1')
    expect(result.value!.completion.status?.code).toBe(0)
    expect(result.value!.completion.offset).toBe(10)

    await iter.return!()
    vi.useRealTimers()
  })

  it('tracks completion offsets for reconnection', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
      beginExclusive: 0,
      reconnect: { initialDelay: 50, jitter: 0, maxAttempts: 1 },
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    instances[0]!.simulateMessage({
      completion: { commandId: 'cmd-1', offset: 30 },
    })
    await iter.next()

    instances[0]!.simulateClose(1006, '')
    await vi.advanceTimersByTimeAsync(50)

    instances[1]!.simulateOpen()
    const request = JSON.parse(instances[1]!.sentMessages[0]!)
    expect(request.beginExclusive).toBe(30) // Resumed from last completion offset

    await iter.return!()
    vi.useRealTimers()
  })

  it('auto-reconnects by default (open-ended stream)', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
      reconnect: { initialDelay: 50, jitter: 0, maxAttempts: 1 },
    })
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateClose(1006, '')

    await vi.advanceTimersByTimeAsync(50)
    expect(instances).toHaveLength(2) // Reconnected

    await iter.return!()
    vi.useRealTimers()
  })

  it('cancels via AbortSignal', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const controller = new AbortController()
    const stream = streamCompletions({
      url: 'http://localhost:7575',
      WebSocket: MockWS,
      parties: ['Alice::1220'],
      signal: controller.signal,
    })

    const results: unknown[] = []
    const consumePromise = (async () => {
      for await (const event of stream) {
        results.push(event)
        controller.abort()
      }
    })()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateMessage({
      completion: { commandId: 'cmd-1', offset: 1 },
    })

    await consumePromise
    expect(results).toHaveLength(1)
    vi.useRealTimers()
  })
})
