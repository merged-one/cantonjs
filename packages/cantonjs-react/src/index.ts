/**
 * cantonjs-react — React hooks for Canton Network dApps.
 *
 * @packageDocumentation
 */

export { CantonProvider, useCantonClient, useParty } from './context.js'
export type { CantonProviderProps } from './context.js'

export { useContracts } from './useContracts.js'
export type { UseContractsOptions } from './useContracts.js'

export { useCreateContract } from './useCreateContract.js'
export type { UseCreateContractOptions, CreateContractVariables } from './useCreateContract.js'

export { useExercise } from './useExercise.js'
export type { UseExerciseOptions, ExerciseVariables } from './useExercise.js'

export { useStreamContracts } from './useStreamContracts.js'
export type { UseStreamContractsOptions, UseStreamContractsResult } from './useStreamContracts.js'

export type { LedgerClient, ActiveContract, CreatedEvent, JsTransaction } from './types.js'
