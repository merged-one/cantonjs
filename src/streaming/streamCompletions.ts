/**
 * Stream command completions from Canton's /v2/commands/completions WebSocket endpoint.
 *
 * Yields completion events as an AsyncIterable with auto-reconnect.
 */

import type { CompletionEvent, StreamCompletionsOptions } from './types.js'
import { createStream, toWebSocketUrl } from './createStream.js'

/**
 * Stream command completions from a Canton node.
 *
 * @example
 * ```typescript
 * const completions = streamCompletions({
 *   url: 'http://localhost:7575',
 *   token: jwt,
 *   parties: ['Alice::1220'],
 *   beginExclusive: 0,
 * })
 *
 * for await (const event of completions) {
 *   console.log('Completion:', event.completion.commandId, event.completion.status)
 * }
 * ```
 */
export function streamCompletions(
  options: StreamCompletionsOptions,
): AsyncIterable<CompletionEvent> {
  const wsUrl = toWebSocketUrl(options.url, '/v2/commands/completions')

  return createStream<CompletionEvent>({
    url: wsUrl,
    token: options.token,
    WebSocket: options.WebSocket,
    signal: options.signal,
    reconnect: options.reconnect,
    bounded: false,
    buildRequest: (lastOffset) => ({
      beginExclusive: lastOffset ?? options.beginExclusive ?? 0,
      parties: options.parties,
      ...(options.applicationId && { applicationId: options.applicationId }),
    }),
    extractOffset: (message) => {
      const msg = message as CompletionEvent
      return msg.completion?.offset
    },
  })
}
