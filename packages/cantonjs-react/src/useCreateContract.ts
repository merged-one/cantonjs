/**
 * Mutation hook for creating contracts.
 *
 * Wraps LedgerClient.createContract with TanStack Query's useMutation
 * for loading state, error handling, and cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { useCantonClient } from './context.js'
import type { CreatedEvent } from './types.js'

/** Variables for creating a contract. */
export type CreateContractVariables = {
  readonly createArguments: Record<string, unknown>
  readonly commandId?: string
  readonly workflowId?: string
}

/** Options for the useCreateContract hook. */
export type UseCreateContractOptions = {
  /** Template ID for the contract to create. */
  readonly templateId: string
  /** Callback after successful creation. */
  readonly onSuccess?: (event: CreatedEvent) => void
}

/**
 * Mutation hook for creating a contract.
 *
 * @example
 * ```tsx
 * function CreateAsset() {
 *   const { mutate: create, isPending } = useCreateContract({
 *     templateId: '#my-pkg:Main:Asset',
 *   })
 *
 *   return (
 *     <button
 *       disabled={isPending}
 *       onClick={() => create({ createArguments: { owner: 'Alice', value: 100 } })}
 *     >
 *       Create Asset
 *     </button>
 *   )
 * }
 * ```
 */
export function useCreateContract(
  options: UseCreateContractOptions,
): UseMutationResult<CreatedEvent, Error, CreateContractVariables> {
  const client = useCantonClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: CreateContractVariables) =>
      client.createContract(options.templateId, variables.createArguments, {
        commandId: variables.commandId,
        workflowId: variables.workflowId,
      }),
    onSuccess: (event) => {
      // Invalidate contract queries for this template
      void queryClient.invalidateQueries({
        queryKey: ['canton', 'contracts', options.templateId],
      })
      options.onSuccess?.(event)
    },
  })
}
