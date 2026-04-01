/**
 * Stream active contracts from Canton's /v2/state/active-contracts WebSocket endpoint.
 *
 * This is a bounded stream: the server sends all matching active contracts
 * and then closes the connection. No auto-reconnect is used.
 */

import type { StreamContractsOptions } from './types.js'
import { createStream, toWebSocketUrl } from './createStream.js'

/** Response message from the active contracts stream. */
export type ActiveContractsResponse = {
  readonly contractEntry?: { readonly [key: string]: unknown }
  readonly offset?: number
}

/**
 * Stream active contracts from a Canton node.
 *
 * The stream yields contract entries matching the provided filters.
 * It is bounded: the server closes the connection when all contracts
 * have been sent.
 *
 * @example
 * ```typescript
 * const contracts = streamContracts({
 *   url: 'http://localhost:7575',
 *   token: jwt,
 *   eventFormat: {
 *     filtersByParty: {
 *       [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: {} } } }] }
 *     }
 *   }
 * })
 *
 * for await (const entry of contracts) {
 *   if (entry.contractEntry && 'JsActiveContract' in entry.contractEntry) {
 *     console.log('Contract:', entry.contractEntry.JsActiveContract)
 *   }
 * }
 * ```
 */
export function streamContracts(
  options: StreamContractsOptions,
): AsyncIterable<ActiveContractsResponse> {
  const wsUrl = toWebSocketUrl(options.url, '/v2/state/active-contracts')

  return createStream<ActiveContractsResponse>({
    url: wsUrl,
    token: options.token,
    WebSocket: options.WebSocket,
    signal: options.signal,
    reconnect: false, // Bounded stream — no reconnect
    bounded: true,
    buildRequest: () => ({
      eventFormat: options.eventFormat,
      ...(options.activeAtOffset !== undefined && { activeAtOffset: options.activeAtOffset }),
    }),
    extractOffset: (message) => {
      const msg = message as ActiveContractsResponse
      return msg.offset
    },
  })
}
