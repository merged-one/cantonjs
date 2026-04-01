/**
 * Query hook for active contracts.
 *
 * Wraps LedgerClient.queryContracts with TanStack Query for caching,
 * deduplication, and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useCantonClient } from './context.js'
import type { ActiveContract } from './types.js'

/** Options for the useContracts hook. */
export type UseContractsOptions = {
  /** Template ID to query. */
  readonly templateId: string
  /** Whether to enable the query. Defaults to true. */
  readonly enabled?: boolean
  /** Refetch interval in milliseconds. */
  readonly refetchInterval?: number
}

/**
 * Query active contracts matching a template.
 *
 * @example
 * ```tsx
 * function AssetList() {
 *   const { data: contracts, isLoading } = useContracts({
 *     templateId: '#my-pkg:Main:Asset',
 *   })
 *
 *   if (isLoading) return <div>Loading...</div>
 *   return <ul>{contracts?.map(c => <li key={c.createdEvent.contractId}>...</li>)}</ul>
 * }
 * ```
 */
export function useContracts(
  options: UseContractsOptions,
): UseQueryResult<readonly ActiveContract[]> {
  const client = useCantonClient()

  return useQuery({
    queryKey: ['canton', 'contracts', options.templateId, client.actAs],
    queryFn: ({ signal }) => client.queryContracts(options.templateId, { signal }),
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
  })
}
