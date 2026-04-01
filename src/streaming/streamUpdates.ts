/**
 * Stream updates from Canton's /v2/updates WebSocket endpoint.
 *
 * Yields TaggedUpdate messages (Transaction, Reassignment, OffsetCheckpoint,
 * TopologyTransaction) as an AsyncIterable with auto-reconnect.
 */

import type { TaggedUpdate } from '../types/transaction.js'
import type { StreamUpdatesOptions } from './types.js'
import { createStream, toWebSocketUrl } from './createStream.js'

/**
 * Stream ledger updates from a Canton node.
 *
 * @example
 * ```typescript
 * const updates = streamUpdates({
 *   url: 'http://localhost:7575',
 *   token: jwt,
 *   beginExclusive: 0,
 *   updateFormat: {
 *     includeTransactions: {
 *       transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
 *       eventFormat: {
 *         filtersByParty: {
 *           [party]: { cumulative: [{ identifierFilter: { WildcardFilter: { value: {} } } }] }
 *         }
 *       }
 *     }
 *   }
 * })
 *
 * for await (const update of updates) {
 *   if ('Transaction' in update) {
 *     console.log('Transaction:', update.Transaction.value.updateId)
 *   }
 * }
 * ```
 */
export function streamUpdates(options: StreamUpdatesOptions): AsyncIterable<TaggedUpdate> {
  const wsUrl = toWebSocketUrl(options.url, '/v2/updates')
  const isOpen = options.endInclusive === undefined

  return createStream<TaggedUpdate>({
    url: wsUrl,
    token: options.token,
    WebSocket: options.WebSocket,
    signal: options.signal,
    reconnect: isOpen ? options.reconnect : false,
    bounded: !isOpen,
    buildRequest: (lastOffset) => ({
      beginExclusive: lastOffset ?? options.beginExclusive ?? 0,
      ...(options.endInclusive !== undefined && { endInclusive: options.endInclusive }),
      ...(options.updateFormat && { updateFormat: options.updateFormat }),
    }),
    extractOffset: (message) => {
      const msg = message as TaggedUpdate
      if ('Transaction' in msg) {
        return msg.Transaction.value.offset
      }
      if ('OffsetCheckpoint' in msg) {
        return msg.OffsetCheckpoint.value.offset
      }
      return undefined
    },
  })
}
