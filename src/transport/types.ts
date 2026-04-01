/**
 * Transport abstraction for Canton API communication.
 *
 * Inspired by viem's transport pattern: clients are instantiated with a
 * transport that handles the actual request execution. This separates
 * client logic from communication concerns.
 */

/** A transport handles sending requests to a Canton node. */
export type Transport = {
  readonly type: string
  readonly url: string
  request: <TResponse = unknown>(args: TransportRequest) => Promise<TResponse>
}

/** A request to be sent via transport. */
export type TransportRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeout?: number
}

/** Configuration shared by all transport types. */
export type TransportConfig = {
  /** Base URL of the Canton node. */
  readonly url: string
  /** JWT Bearer token for authentication. */
  readonly token?: string
  /** Request timeout in milliseconds. Default: 30000. */
  readonly timeout?: number
  /** Custom fetch implementation (for testing or environments without global fetch). */
  readonly fetchFn?: typeof fetch
}

/** Factory function type for creating transports. */
export type TransportFactory = (config: TransportConfig) => Transport
