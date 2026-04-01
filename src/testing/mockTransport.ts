/**
 * Mock transport for testing dApp code without a running Canton node.
 *
 * Provides two patterns:
 * - createMockTransport() — respond with pre-configured responses
 * - createRecordingTransport() — record real responses for later replay
 */

import type { Transport, TransportRequest } from '../transport/types.js'

/** A recorded request/response pair. */
export type RecordedExchange = {
  readonly request: {
    readonly method: string
    readonly path: string
    readonly body?: unknown
  }
  readonly response: unknown
}

/** Matcher for routing mock responses. */
export type RequestMatcher = {
  /** HTTP method to match. If omitted, matches any method. */
  readonly method?: string
  /** Path prefix or exact path to match. */
  readonly path: string
  /** Response to return when matched. */
  readonly response: unknown
}

/**
 * Create a mock transport that returns pre-configured responses.
 *
 * Responses are matched by path (prefix match) and optionally method.
 * If no matcher is found, returns the `defaultResponse` or throws.
 *
 * @example
 * ```typescript
 * const transport = createMockTransport({
 *   matchers: [
 *     { path: '/v2/parties', response: { partyDetails: [] } },
 *     { method: 'POST', path: '/v2/commands', response: { transaction: { ... } } },
 *   ],
 * })
 *
 * const client = createLedgerClient({ transport, actAs: party })
 * ```
 */
export function createMockTransport(options: {
  matchers?: readonly RequestMatcher[]
  defaultResponse?: unknown
  url?: string
} = {}): Transport & { readonly calls: readonly RecordedExchange[] } {
  const { matchers = [], defaultResponse, url = 'http://mock:7575' } = options
  const calls: RecordedExchange[] = []

  return {
    type: 'mock',
    url,
    calls,

    async request<TResponse>(args: TransportRequest): Promise<TResponse> {
      const matcher = matchers.find((m) => {
        if (m.method && m.method !== args.method) return false
        return args.path.startsWith(m.path)
      })

      const response = matcher?.response ?? defaultResponse
      if (response === undefined) {
        throw new Error(
          `No mock response for ${args.method} ${args.path}. ` +
          `Add a matcher or set defaultResponse.`,
        )
      }

      calls.push({
        request: { method: args.method, path: args.path, body: args.body },
        response,
      })

      return response as TResponse
    },
  }
}

/**
 * Create a transport that records all exchanges from a real transport.
 *
 * Wraps an existing transport and stores every request/response pair.
 * Use `transport.recordings` to access recorded exchanges for replay.
 *
 * @example
 * ```typescript
 * const real = jsonApi({ url: 'http://localhost:7575', token: jwt })
 * const recording = createRecordingTransport(real)
 *
 * // Use recording transport with your client...
 * const client = createLedgerClient({ transport: recording, actAs: party })
 * await client.queryContracts(templateId)
 *
 * // Later, replay the recordings
 * const replay = createMockTransport({
 *   matchers: recording.recordings.map(r => ({
 *     method: r.request.method,
 *     path: r.request.path,
 *     response: r.response,
 *   })),
 * })
 * ```
 */
export function createRecordingTransport(
  inner: Transport,
): Transport & { readonly recordings: readonly RecordedExchange[] } {
  const recordings: RecordedExchange[] = []

  return {
    type: `recording(${inner.type})`,
    url: inner.url,
    recordings,

    async request<TResponse>(args: TransportRequest): Promise<TResponse> {
      const response = await inner.request<TResponse>(args)

      recordings.push({
        request: { method: args.method, path: args.path, body: args.body },
        response,
      })

      return response
    },
  }
}
