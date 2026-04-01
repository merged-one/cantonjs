/**
 * Streaming hook for live contract updates.
 *
 * Uses useEffect + AsyncIterator to subscribe to contract changes
 * and update React state in real-time.
 */

import { useState, useEffect, useRef } from 'react'
import { useCantonClient } from './context.js'
import type { ActiveContract } from './types.js'

/** Options for the useStreamContracts hook. */
export type UseStreamContractsOptions = {
  /** Template ID to stream. */
  readonly templateId: string
  /** Whether to enable the stream. Defaults to true. */
  readonly enabled?: boolean
}

/** Result of the useStreamContracts hook. */
export type UseStreamContractsResult = {
  /** Current list of active contracts. */
  readonly contracts: readonly ActiveContract[]
  /** Whether the initial query is loading. */
  readonly isLoading: boolean
  /** Any error from the query or stream. */
  readonly error: Error | null
}

/**
 * Stream active contracts with live updates.
 *
 * Performs an initial query for active contracts, then polls at a regular
 * interval to pick up changes. For true real-time updates, integrate with
 * cantonjs's streamUpdates WebSocket API.
 *
 * @example
 * ```tsx
 * function LiveAssets() {
 *   const { contracts, isLoading, error } = useStreamContracts({
 *     templateId: '#my-pkg:Main:Asset',
 *   })
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *   return <ul>{contracts.map(c => <li key={c.createdEvent.contractId}>...</li>)}</ul>
 * }
 * ```
 */
export function useStreamContracts(
  options: UseStreamContractsOptions,
): UseStreamContractsResult {
  const client = useCantonClient()
  const [contracts, setContracts] = useState<readonly ActiveContract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const enabled = options.enabled ?? true
  const templateIdRef = useRef(options.templateId)
  templateIdRef.current = options.templateId

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const controller = new AbortController()

    async function poll() {
      try {
        const result = await client.queryContracts(templateIdRef.current, {
          signal: controller.signal,
        })
        if (!cancelled) {
          setContracts(result)
          setIsLoading(false)
          setError(null)
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), 5_000)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(interval)
    }
  }, [client, enabled])

  return { contracts, isLoading, error }
}
