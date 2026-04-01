/**
 * Fallback transport — tries transports in order until one succeeds.
 *
 * Useful for high-availability setups where a primary node may be unavailable.
 * On each request, tries the first transport. If it fails with a connection
 * error, tries the next, and so on.
 */

import { ConnectionError, TimeoutError } from '../errors/transport.js'
import type { Transport, TransportRequest } from './types.js'

export type FallbackTransportConfig = {
  /** Transports to try, in order of preference. */
  readonly transports: readonly Transport[]
}

/**
 * Create a fallback transport that tries multiple transports in sequence.
 *
 * Only retries on connection-level failures (ConnectionError, TimeoutError).
 * Application-level errors (HttpError, 4xx/5xx) are thrown immediately since
 * a different transport would get the same result.
 */
export function fallback(config: FallbackTransportConfig): Transport {
  const { transports } = config

  if (transports.length === 0) {
    throw new Error('fallback() requires at least one transport')
  }

  return {
    type: 'fallback',
    url: transports[0]!.url,

    async request<TResponse = unknown>(args: TransportRequest): Promise<TResponse> {
      let lastError: unknown

      for (const transport of transports) {
        try {
          return await transport.request<TResponse>(args)
        } catch (error) {
          lastError = error
          if (isRetryableError(error)) {
            continue
          }
          throw error
        }
      }

      throw lastError
    },
  }
}

function isRetryableError(error: unknown): boolean {
  return error instanceof ConnectionError || error instanceof TimeoutError
}
