/**
 * Core AsyncIterable stream factory for Canton WebSocket connections.
 *
 * Creates a stream that:
 * - Opens a WebSocket connection with Canton subprotocol auth
 * - Sends a subscription request on connection open
 * - Yields parsed JSON messages as an AsyncIterable
 * - Auto-reconnects with exponential backoff on disconnect
 * - Tracks offsets for gap-free resumption
 * - Supports AbortSignal cancellation
 *
 * @see ADR 0005 — Streaming Architecture
 */

import type {
  WebSocketConstructor,
  WebSocketLike,
  ReconnectConfig,
} from './types.js'
import { WebSocketError, StreamClosedError, ReconnectFailedError } from '../errors/streaming.js'

/** Internal configuration for createStream. */
export type CreateStreamConfig = {
  /** Full WebSocket URL (ws:// or wss://). */
  readonly url: string
  /** JWT token for authentication. */
  readonly token?: string
  /** WebSocket constructor. */
  readonly WebSocket?: WebSocketConstructor
  /** AbortSignal for cancellation. */
  readonly signal?: AbortSignal
  /** Reconnect config, or false to disable. */
  readonly reconnect?: ReconnectConfig | false
  /** Build the subscription request body. Called on each (re)connection. */
  readonly buildRequest: (lastOffset: number | undefined) => unknown
  /** Extract an offset from a received message, if present. */
  readonly extractOffset: (message: unknown) => number | undefined
  /** Whether this is a bounded stream that ends on server close. */
  readonly bounded?: boolean
}

const DEFAULT_RECONNECT: Required<ReconnectConfig> = {
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: 0.25,
  maxAttempts: Infinity,
}

/**
 * Convert an HTTP(S) URL to a WebSocket URL.
 * http://host → ws://host, https://host → wss://host
 * If already ws/wss, return as-is.
 */
export function toWebSocketUrl(baseUrl: string, path: string): string {
  const url = new URL(path, baseUrl)
  if (url.protocol === 'https:') {
    url.protocol = 'wss:'
  } else if (url.protocol === 'http:') {
    url.protocol = 'ws:'
  }
  return url.toString()
}

/**
 * Calculate reconnect delay with exponential backoff and jitter.
 */
export function calculateDelay(attempt: number, config: Required<ReconnectConfig>): number {
  const baseDelay = Math.min(
    config.initialDelay * Math.pow(config.factor, attempt),
    config.maxDelay,
  )
  const jitterRange = baseDelay * config.jitter
  const jitter = (Math.random() * 2 - 1) * jitterRange
  return Math.max(0, baseDelay + jitter)
}

/**
 * Create a Canton WebSocket stream as an AsyncIterable.
 *
 * Each iteration yields a parsed JSON message from the WebSocket.
 * The stream auto-reconnects on disconnect unless:
 * - The AbortSignal is aborted
 * - reconnect is set to false
 * - The stream is bounded and the server closed normally (code 1000)
 * - Max reconnect attempts are exhausted
 */
export function createStream<T>(config: CreateStreamConfig): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      return new StreamIterator<T>(config)
    },
  }
}

/**
 * Internal AsyncIterator implementation.
 *
 * Uses a message queue with promise-based signaling to bridge the
 * event-driven WebSocket API to the pull-based AsyncIterator protocol.
 */
class StreamIterator<T> implements AsyncIterator<T> {
  private readonly config: CreateStreamConfig
  private readonly reconnectConfig: Required<ReconnectConfig> | false
  private ws: WebSocketLike | null = null
  private lastOffset: number | undefined = undefined
  private reconnectAttempts = 0
  private done = false
  private abortHandler: (() => void) | null = null

  // Message queue for buffering received messages
  private queue: T[] = []
  // Error stored when fail() is called before next()
  private storedError: Error | null = null
  // Pending resolve/reject for when consumer is waiting
  private pendingResolve: ((result: IteratorResult<T>) => void) | null = null
  private pendingReject: ((error: Error) => void) | null = null

  constructor(config: CreateStreamConfig) {
    this.config = config

    if (config.reconnect === false) {
      this.reconnectConfig = false
    } else {
      this.reconnectConfig = { ...DEFAULT_RECONNECT, ...config.reconnect }
    }

    if (config.signal?.aborted) {
      this.done = true
    } else {
      this.setupAbortHandler()
      this.connect()
    }
  }

  async next(): Promise<IteratorResult<T>> {
    // If an error was stored before next() was called, throw it now
    if (this.storedError) {
      const error = this.storedError
      this.storedError = null
      throw error
    }

    if (this.done && this.queue.length === 0) {
      return { done: true, value: undefined }
    }

    // If there are queued messages, return immediately
    if (this.queue.length > 0) {
      return { done: false, value: this.queue.shift()! }
    }

    // Wait for the next message, error, or close
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.pendingResolve = resolve
      this.pendingReject = reject
    })
  }

  async return(): Promise<IteratorResult<T>> {
    this.cleanup()
    return { done: true, value: undefined }
  }

  async throw(error?: Error): Promise<IteratorResult<T>> {
    this.cleanup()
    throw error
  }

  private setupAbortHandler(): void {
    if (!this.config.signal) return

    this.abortHandler = () => {
      this.cleanup()
      if (this.pendingResolve) {
        this.pendingResolve({ done: true, value: undefined })
        this.pendingResolve = null
        this.pendingReject = null
      }
    }
    this.config.signal.addEventListener('abort', this.abortHandler)
  }

  private connect(): void {
    if (this.done) return

    const WS = this.config.WebSocket ?? (globalThis as Record<string, unknown>).WebSocket as WebSocketConstructor | undefined
    if (!WS) {
      const error = new WebSocketError(this.config.url, {
        cause: new Error('No WebSocket implementation available. Provide a WebSocket constructor.'),
      })
      this.fail(error)
      return
    }

    const protocols = this.config.token
      ? ['daml.ws.auth', `jwt.token.${this.config.token}`]
      : undefined

    let ws: WebSocketLike
    try {
      ws = new WS(this.config.url, protocols) as WebSocketLike
    } catch (err) {
      const error = new WebSocketError(this.config.url, {
        cause: err instanceof Error ? err : new Error(String(err)),
      })
      this.fail(error)
      return
    }
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      const request = this.config.buildRequest(this.lastOffset)
      ws.send(JSON.stringify(request))
    }

    ws.onmessage = (event: { data: unknown }) => {
      let message: T
      try {
        message = JSON.parse(String(event.data)) as T
      } catch {
        return // Skip non-JSON messages
      }

      // Track offset for resumption
      const offset = this.config.extractOffset(message)
      if (offset !== undefined) {
        this.lastOffset = offset
      }

      this.enqueue(message)
    }

    ws.onerror = () => {
      // onerror is always followed by onclose, so we handle reconnection there
    }

    ws.onclose = (event: { code: number; reason: string }) => {
      this.ws = null

      // Normal close on bounded stream = stream complete
      if (this.config.bounded && event.code === 1000) {
        this.cleanup()
        if (this.pendingResolve) {
          this.pendingResolve({ done: true, value: undefined })
          this.pendingResolve = null
          this.pendingReject = null
        }
        return
      }

      // If already done (abort, return), don't reconnect
      if (this.done) return

      // Try to reconnect
      if (this.reconnectConfig === false) {
        const error = new StreamClosedError(event.code, event.reason)
        this.fail(error)
        return
      }

      if (this.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
        const error = new ReconnectFailedError(this.reconnectAttempts)
        this.fail(error)
        return
      }

      const delay = calculateDelay(this.reconnectAttempts, this.reconnectConfig)
      this.reconnectAttempts++

      setTimeout(() => {
        if (!this.done) {
          this.connect()
        }
      }, delay)
    }
  }

  private enqueue(message: T): void {
    if (this.pendingResolve) {
      const resolve = this.pendingResolve
      this.pendingResolve = null
      this.pendingReject = null
      resolve({ done: false, value: message })
    } else {
      this.queue.push(message)
    }
  }

  private fail(error: Error): void {
    this.done = true
    if (this.pendingReject) {
      const reject = this.pendingReject
      this.pendingResolve = null
      this.pendingReject = null
      reject(error)
    } else {
      this.storedError = error
    }
  }

  private cleanup(): void {
    this.done = true

    if (this.config.signal && this.abortHandler) {
      this.config.signal.removeEventListener('abort', this.abortHandler)
      this.abortHandler = null
    }

    if (this.ws) {
      // Clear handlers before closing to prevent reconnect
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }
}
