/**
 * JSON Ledger API V2 transport (HTTP).
 *
 * Primary transport for cantonjs. Communicates with Canton's JSON Ledger API
 * via HTTP requests to /v2/* endpoints.
 */

import { ConnectionError, HttpError, TimeoutError } from '../errors/transport.js'
import {
  resolveTransportHeaders,
  type Transport,
  type TransportConfig,
  type TransportRequest,
} from './types.js'

const DEFAULT_TIMEOUT = 30_000

export function jsonApi(config: TransportConfig): Transport {
  const { url, timeout = DEFAULT_TIMEOUT, fetchFn = globalThis.fetch } = config

  const baseUrl = url.replace(/\/+$/, '')

  return {
    type: 'json-api',
    url: baseUrl,

    async request<TResponse = unknown>(args: TransportRequest): Promise<TResponse> {
      const requestUrl = `${baseUrl}${args.path}`
      const authHeaders = await resolveTransportHeaders(config, {
        transport: 'json-api',
        url: baseUrl,
        request: {
          method: args.method,
          path: args.path,
          headers: args.headers,
          signal: args.signal,
        },
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...args.headers,
        ...authHeaders,
      }

      const controller = new AbortController()
      const timeoutMs = args.timeout ?? timeout

      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      if (args.signal !== undefined) {
        args.signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      try {
        const response = await fetchFn(requestUrl, {
          method: args.method,
          headers,
          body: args.body !== undefined ? JSON.stringify(args.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const body = await response.text().catch(() => undefined)
          throw new HttpError(response.status, response.statusText, { body })
        }

        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          return (await response.json()) as TResponse
        }

        return (await response.text()) as TResponse
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof HttpError) {
          throw error
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          if (args.signal?.aborted) {
            throw error
          }
          throw new TimeoutError(timeoutMs)
        }

        throw new ConnectionError(baseUrl, {
          cause: error instanceof Error ? error : new Error(String(error)),
        })
      }
    },
  }
}
