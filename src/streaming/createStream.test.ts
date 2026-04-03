import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStream, toWebSocketUrl, calculateDelay } from './createStream.js'
import type { CreateStreamConfig } from './createStream.js'
import type { WebSocketConstructor, WebSocketLike } from './types.js'

// --- Mock WebSocket ---

type MockWebSocket = WebSocketLike & {
  simulateOpen(): void
  simulateMessage(data: unknown): void
  simulateClose(code?: number, reason?: string): void
  simulateError(): void
  sentMessages: string[]
  closedWith?: { code?: number; reason?: string }
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
      close(code?: number, reason?: string) {
        ws.closedWith = { code, reason }
        ws.readyState = 3
      },
      send(data: string) {
        ws.sentMessages.push(data)
      },
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
      simulateError() {
        ws.onerror?.(null)
      },
    }
    instances.push(ws)
    return ws
  }) as unknown as WebSocketConstructor

  return { MockWS, instances }
}

function defaultConfig(overrides: Partial<CreateStreamConfig> = {}): CreateStreamConfig {
  return {
    url: 'ws://localhost:7575/v2/updates',
    buildRequest: (lastOffset) => ({ beginExclusive: lastOffset ?? 0 }),
    extractOffset: (msg) => {
      const m = msg as Record<string, unknown>
      return typeof m.offset === 'number' ? m.offset : undefined
    },
    ...overrides,
  }
}

describe('toWebSocketUrl', () => {
  it('converts http to ws', () => {
    expect(toWebSocketUrl('http://localhost:7575', '/v2/updates'))
      .toBe('ws://localhost:7575/v2/updates')
  })

  it('converts https to wss', () => {
    expect(toWebSocketUrl('https://canton.example.com', '/v2/updates'))
      .toBe('wss://canton.example.com/v2/updates')
  })

  it('leaves ws as-is', () => {
    expect(toWebSocketUrl('ws://localhost:7575', '/v2/updates'))
      .toBe('ws://localhost:7575/v2/updates')
  })

  it('leaves wss as-is', () => {
    expect(toWebSocketUrl('wss://canton.example.com', '/v2/updates'))
      .toBe('wss://canton.example.com/v2/updates')
  })

  it('preserves port numbers', () => {
    expect(toWebSocketUrl('http://localhost:9090', '/v2/updates'))
      .toBe('ws://localhost:9090/v2/updates')
  })
})

describe('calculateDelay', () => {
  it('returns initialDelay for attempt 0 (ignoring jitter)', () => {
    const config = { initialDelay: 1000, maxDelay: 30000, factor: 2, jitter: 0, maxAttempts: Infinity }
    expect(calculateDelay(0, config)).toBe(1000)
  })

  it('applies exponential backoff', () => {
    const config = { initialDelay: 1000, maxDelay: 30000, factor: 2, jitter: 0, maxAttempts: Infinity }
    expect(calculateDelay(1, config)).toBe(2000)
    expect(calculateDelay(2, config)).toBe(4000)
    expect(calculateDelay(3, config)).toBe(8000)
  })

  it('caps at maxDelay', () => {
    const config = { initialDelay: 1000, maxDelay: 5000, factor: 2, jitter: 0, maxAttempts: Infinity }
    expect(calculateDelay(10, config)).toBe(5000)
  })

  it('applies jitter within range', () => {
    const config = { initialDelay: 1000, maxDelay: 30000, factor: 2, jitter: 0.25, maxAttempts: Infinity }
    // With ±25% jitter on 1000ms base, delay should be between 750 and 1250
    for (let i = 0; i < 20; i++) {
      const delay = calculateDelay(0, config)
      expect(delay).toBeGreaterThanOrEqual(750)
      expect(delay).toBeLessThanOrEqual(1250)
    }
  })
})

describe('createStream', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('opens a WebSocket connection and sends subscription request', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    // Wait for connection to be attempted
    await vi.advanceTimersByTimeAsync(0)
    expect(instances).toHaveLength(1)

    instances[0]!.simulateOpen()
    expect(instances[0]!.sentMessages).toHaveLength(1)
    expect(JSON.parse(instances[0]!.sentMessages[0]!)).toEqual({ beginExclusive: 0 })

    await iter.return!()
    vi.useRealTimers()
  })

  it('uses Canton auth subprotocols when token is provided', async () => {
    const { MockWS } = createMockWebSocket()
    const stream = createStream(defaultConfig({ WebSocket: MockWS, token: 'my-jwt-token' }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    expect((MockWS as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toEqual([
      'daml.ws.auth',
      'jwt.token.my-jwt-token',
    ])

    await iter.return!()
    vi.useRealTimers()
  })

  it('yields parsed JSON messages', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream<{ value: number }>(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateMessage({ value: 1 })
    instances[0]!.simulateMessage({ value: 2 })

    const r1 = await iter.next()
    expect(r1.done).toBe(false)
    expect(r1.value).toEqual({ value: 1 })

    const r2 = await iter.next()
    expect(r2.done).toBe(false)
    expect(r2.value).toEqual({ value: 2 })

    await iter.return!()
    vi.useRealTimers()
  })

  it('supports for-await-of with AbortSignal', async () => {
    const { MockWS, instances: wsInstances } = createMockWebSocket()
    const controller = new AbortController()
    const stream = createStream<{ value: number }>(defaultConfig({
      WebSocket: MockWS,
      signal: controller.signal,
    }))

    const received: number[] = []

    const consumePromise = (async () => {
      for await (const msg of stream) {
        received.push(msg.value)
        if (received.length === 2) {
          controller.abort()
        }
      }
    })()

    await vi.advanceTimersByTimeAsync(0)
    wsInstances[0]!.simulateOpen()
    wsInstances[0]!.simulateMessage({ value: 10 })
    wsInstances[0]!.simulateMessage({ value: 20 })

    await consumePromise
    expect(received).toEqual([10, 20])
    vi.useRealTimers()
  })

  it('resolves a pending next() call when the signal aborts', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const controller = new AbortController()
    const stream = createStream<{ value: number }>(defaultConfig({
      WebSocket: MockWS,
      signal: controller.signal,
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const pending = iter.next()
    controller.abort()

    await expect(pending).resolves.toEqual({ done: true, value: undefined })
    vi.useRealTimers()
  })

  it('returns done when signal is already aborted', async () => {
    const { MockWS } = createMockWebSocket()
    const controller = new AbortController()
    controller.abort()

    const stream = createStream<{ value: number }>(defaultConfig({
      WebSocket: MockWS,
      signal: controller.signal,
    }))
    const iter = stream[Symbol.asyncIterator]()

    const result = await iter.next()
    expect(result.done).toBe(true)
    vi.useRealTimers()
  })

  it('tracks offsets for resumption', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: { maxAttempts: 1, jitter: 0, initialDelay: 100 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateMessage({ offset: 42 })

    const r1 = await iter.next()
    expect(r1.value).toEqual({ offset: 42 })

    // Simulate disconnect
    instances[0]!.simulateClose(1006, 'timeout')

    // Wait for reconnect
    await vi.advanceTimersByTimeAsync(200)
    expect(instances).toHaveLength(2)

    // Second connection should resume from offset 42
    instances[1]!.simulateOpen()
    expect(JSON.parse(instances[1]!.sentMessages[0]!)).toEqual({ beginExclusive: 42 })

    await iter.return!()
    vi.useRealTimers()
  })

  it('auto-reconnects with exponential backoff', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: { initialDelay: 100, factor: 2, jitter: 0, maxDelay: 1000, maxAttempts: 2 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // First disconnect → attempt 0 → 100ms delay
    instances[0]!.simulateClose(1006, '')
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(100)
    expect(instances).toHaveLength(2)

    // Don't open — simulate failure (stays at attempt 1)
    // Second disconnect → attempt 1 → 200ms delay
    instances[1]!.simulateClose(1006, '')

    await vi.advanceTimersByTimeAsync(150)
    expect(instances).toHaveLength(2) // Not yet (200ms needed)

    await vi.advanceTimersByTimeAsync(50)
    expect(instances).toHaveLength(3)

    // Third disconnect → attempt 2 — maxAttempts (2) exhausted
    instances[2]!.simulateClose(1006, '')

    await expect(iter.next()).rejects.toThrow('Failed to reconnect after 2 attempts')
    vi.useRealTimers()
  })

  it('throws StreamClosedError when reconnect is disabled', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: false,
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateClose(1006, 'server timeout')

    await expect(iter.next()).rejects.toThrow('Stream closed unexpectedly')
    vi.useRealTimers()
  })

  it('rejects a pending next() call when reconnect is disabled and the stream closes', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: false,
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const pending = iter.next()
    instances[0]!.simulateClose(1006, 'server timeout')

    await expect(pending).rejects.toThrow('Stream closed unexpectedly')
    vi.useRealTimers()
  })

  it('completes bounded stream on normal close (code 1000)', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream<{ value: number }>(defaultConfig({
      WebSocket: MockWS,
      bounded: true,
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateMessage({ value: 1 })

    const r1 = await iter.next()
    expect(r1.value).toEqual({ value: 1 })

    // Server closes bounded stream normally
    instances[0]!.simulateClose(1000, '')

    const r2 = await iter.next()
    expect(r2.done).toBe(true)
    vi.useRealTimers()
  })

  it('completes a pending next() call when a bounded stream closes normally', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream<{ value: number }>(defaultConfig({
      WebSocket: MockWS,
      bounded: true,
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    const pending = iter.next()
    instances[0]!.simulateClose(1000, '')

    await expect(pending).resolves.toEqual({ done: true, value: undefined })
    vi.useRealTimers()
  })

  it('closes WebSocket when iterator returns', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    await iter.return!()
    expect(instances[0]!.closedWith).toBeDefined()
    vi.useRealTimers()
  })

  it('resets reconnect attempts on successful connection', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: { initialDelay: 100, factor: 2, jitter: 0, maxDelay: 1000, maxAttempts: 2 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // Disconnect #1
    instances[0]!.simulateClose(1006, '')
    await vi.advanceTimersByTimeAsync(100)
    instances[1]!.simulateOpen() // Successful reconnect resets counter

    // Disconnect #2 — should start from attempt 0 again
    instances[1]!.simulateClose(1006, '')
    await vi.advanceTimersByTimeAsync(100) // 100ms, not 200ms
    expect(instances).toHaveLength(3)

    await iter.return!()
    vi.useRealTimers()
  })

  it('throws WebSocketError when no WebSocket implementation is available', async () => {
    const g = globalThis as Record<string, unknown>
    const originalWS = g.WebSocket
    delete g.WebSocket

    try {
      const stream = createStream(defaultConfig())
      const iter = stream[Symbol.asyncIterator]()

      await expect(iter.next()).rejects.toThrow('WebSocket connection failed')
    } finally {
      g.WebSocket = originalWS
      vi.useRealTimers()
    }
  })

  it('ignores onerror because close handling owns reconnection', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream<{ value: number }>(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateError()
    instances[0]!.simulateMessage({ value: 42 })

    await expect(iter.next()).resolves.toEqual({ done: false, value: { value: 42 } })
    await iter.return!()
    vi.useRealTimers()
  })

  it('skips non-JSON messages without error', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream<{ value: number }>(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    // Send raw non-JSON string directly
    instances[0]!.onmessage?.({ data: 'not-json{{{' })
    instances[0]!.simulateMessage({ value: 42 })

    const r1 = await iter.next()
    expect(r1.value).toEqual({ value: 42 })

    await iter.return!()
    vi.useRealTimers()
  })

  it('does not reconnect after abort', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const controller = new AbortController()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      signal: controller.signal,
      reconnect: { initialDelay: 100, jitter: 0, maxAttempts: 5 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    controller.abort()

    const result = await iter.next()
    expect(result.done).toBe(true)

    // Should not attempt reconnect
    await vi.advanceTimersByTimeAsync(1000)
    expect(instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('does not reconnect once the iterator has returned during a reconnect delay', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: { initialDelay: 100, jitter: 0, maxAttempts: 5 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    instances[0]!.simulateClose(1006, '')

    await iter.return!()
    await vi.advanceTimersByTimeAsync(100)

    expect(instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('returns immediately when connect is invoked after the iterator is already done', async () => {
    const { MockWS } = createMockWebSocket()
    const stream = createStream(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]() as AsyncIterator<unknown> & { connect: () => void }

    await iter.return!()
    expect(() => iter.connect()).not.toThrow()
    vi.useRealTimers()
  })

  it('ignores close events that arrive after the iterator is already done', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({
      WebSocket: MockWS,
      reconnect: { initialDelay: 100, jitter: 0, maxAttempts: 1 },
    }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()
    const onclose = instances[0]!.onclose

    await iter.return!()
    onclose?.({ code: 1006, reason: 'late close' })
    await vi.advanceTimersByTimeAsync(100)

    expect(instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('handles WebSocket constructor throwing', async () => {
    const ThrowingWS = vi.fn().mockImplementation(() => {
      throw new Error('WebSocket not supported')
    }) as unknown as WebSocketConstructor

    const stream = createStream(defaultConfig({ WebSocket: ThrowingWS }))
    const iter = stream[Symbol.asyncIterator]()

    await expect(iter.next()).rejects.toThrow('WebSocket connection failed')
    vi.useRealTimers()
  })

  it('wraps non-Error constructor failures as WebSocketError causes', async () => {
    const ThrowingWS = vi.fn().mockImplementation(() => {
      throw 'unsupported'
    }) as unknown as WebSocketConstructor

    const stream = createStream(defaultConfig({ WebSocket: ThrowingWS }))
    const iter = stream[Symbol.asyncIterator]()

    await expect(iter.next()).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: 'unsupported',
      }),
    })
    vi.useRealTimers()
  })

  it('closes the socket and rethrows from iterator.throw()', async () => {
    const { MockWS, instances } = createMockWebSocket()
    const stream = createStream(defaultConfig({ WebSocket: MockWS }))
    const iter = stream[Symbol.asyncIterator]()

    await vi.advanceTimersByTimeAsync(0)
    instances[0]!.simulateOpen()

    await expect(iter.throw?.(new Error('boom'))).rejects.toThrow('boom')
    expect(instances[0]!.closedWith).toBeDefined()
    vi.useRealTimers()
  })
})
