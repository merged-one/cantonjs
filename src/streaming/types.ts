/**
 * Streaming types for Canton WebSocket connections.
 *
 * Canton WebSocket protocol:
 * - Auth via subprotocols: ['daml.ws.auth', 'jwt.token.<JWT>']
 * - One subscription per connection (no multiplexing)
 * - Messages are individual JSON frames
 * - OffsetCheckpoint messages serve as heartbeats
 */

import type { EventFormat } from '../types/command.js'

/**
 * WebSocket constructor type.
 * Accepts browser-native WebSocket or Node.js `ws` package.
 */
export type WebSocketConstructor = {
  new (url: string, protocols?: string | string[]): WebSocketLike
}

/** Minimal WebSocket interface needed by the streaming layer. */
export type WebSocketLike = {
  readyState: number
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  close(code?: number, reason?: string): void
  send(data: string): void
}

/** WebSocket readyState constants. */
export const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const

/** Reconnection configuration. */
export type ReconnectConfig = {
  /** Initial delay in milliseconds. Default: 1000. */
  readonly initialDelay?: number
  /** Maximum delay in milliseconds. Default: 30000. */
  readonly maxDelay?: number
  /** Backoff multiplier. Default: 2. */
  readonly factor?: number
  /** Jitter factor (0 to 1). Default: 0.25. */
  readonly jitter?: number
  /** Maximum reconnection attempts. Default: Infinity. */
  readonly maxAttempts?: number
}

/** Base options shared by all stream functions. */
export type StreamOptions = {
  /** Base URL of the Canton node (http/https, will be converted to ws/wss). */
  readonly url: string
  /** JWT token for authentication. */
  readonly token?: string
  /** WebSocket constructor to use. Defaults to globalThis.WebSocket. */
  readonly WebSocket?: WebSocketConstructor
  /** AbortSignal to cancel the stream. */
  readonly signal?: AbortSignal
  /** Reconnection configuration. Set to false to disable auto-reconnect. */
  readonly reconnect?: ReconnectConfig | false
}

/** Options for the /v2/updates stream. */
export type StreamUpdatesOptions = StreamOptions & {
  /** Start reading after this offset (exclusive). */
  readonly beginExclusive?: number
  /** Stop reading at this offset (inclusive). Omit for open-ended stream. */
  readonly endInclusive?: number
  /** Format for received updates. */
  readonly updateFormat?: {
    readonly includeTransactions?: {
      readonly transactionShape:
        | 'TRANSACTION_SHAPE_ACS_DELTA'
        | 'TRANSACTION_SHAPE_LEDGER_EFFECTS'
      readonly eventFormat: EventFormat
    }
    readonly includeReassignments?: EventFormat
    readonly includeTopologyEvents?: unknown
  }
}

/** Options for the /v2/state/active-contracts stream. */
export type StreamContractsOptions = StreamOptions & {
  /** Event format with party filters. */
  readonly eventFormat: EventFormat
  /** Offset to read the ACS at. Omit for current. */
  readonly activeAtOffset?: number
}

/** Options for the /v2/commands/completions stream. */
export type StreamCompletionsOptions = StreamOptions & {
  /** Start reading after this offset (exclusive). */
  readonly beginExclusive?: number
  /** Parties whose completions to receive. */
  readonly parties: readonly string[]
  /** Application ID filter. */
  readonly applicationId?: string
}

/** Completion event from the completions stream. */
export type CompletionEvent = {
  readonly completion: {
    readonly commandId: string
    readonly updateId?: string
    readonly status?: {
      readonly code: number
      readonly message: string
    }
    readonly offset?: number
    readonly synchronizerId?: string
  }
}
