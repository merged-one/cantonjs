/**
 * Mutation hook for exercising choices on contracts.
 *
 * Wraps LedgerClient.exerciseChoice with TanStack Query's useMutation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { useCantonClient } from './context.js'
import type { JsTransaction } from './types.js'

/** Variables for exercising a choice. */
export type ExerciseVariables = {
  readonly contractId: string
  readonly choiceArgument: Record<string, unknown>
  readonly commandId?: string
  readonly workflowId?: string
}

/** Options for the useExercise hook. */
export type UseExerciseOptions = {
  /** Template ID of the contract. */
  readonly templateId: string
  /** Choice name to exercise. */
  readonly choice: string
  /** Callback after successful exercise. */
  readonly onSuccess?: (tx: JsTransaction) => void
}

/**
 * Mutation hook for exercising a choice on a contract.
 *
 * @example
 * ```tsx
 * function TransferButton({ contractId }: { contractId: string }) {
 *   const { mutate: exercise, isPending } = useExercise({
 *     templateId: '#my-pkg:Main:Asset',
 *     choice: 'Transfer',
 *   })
 *
 *   return (
 *     <button
 *       disabled={isPending}
 *       onClick={() => exercise({
 *         contractId,
 *         choiceArgument: { newOwner: 'Bob' },
 *       })}
 *     >
 *       Transfer
 *     </button>
 *   )
 * }
 * ```
 */
export function useExercise(
  options: UseExerciseOptions,
): UseMutationResult<JsTransaction, Error, ExerciseVariables> {
  const client = useCantonClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: ExerciseVariables) =>
      client.exerciseChoice(
        options.templateId,
        variables.contractId,
        options.choice,
        variables.choiceArgument,
        {
          commandId: variables.commandId,
          workflowId: variables.workflowId,
        },
      ),
    onSuccess: (tx) => {
      // Invalidate all contract queries for this template
      void queryClient.invalidateQueries({
        queryKey: ['canton', 'contracts', options.templateId],
      })
      options.onSuccess?.(tx)
    },
  })
}
