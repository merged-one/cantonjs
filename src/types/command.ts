/**
 * Canton command types.
 *
 * Commands are the units of submission to the ledger. Each command atomically
 * creates contracts or exercises choices on existing contracts.
 */

import type { ContractId, TemplateId } from './contract.js'
import type { Party } from './party.js'

/** A command to create a new contract. */
export type CreateCommand = {
  readonly type: 'create'
  readonly templateId: TemplateId
  readonly payload: Record<string, unknown>
}

/** A command to exercise a choice on an existing contract. */
export type ExerciseCommand = {
  readonly type: 'exercise'
  readonly templateId: TemplateId
  readonly contractId: ContractId
  readonly choice: string
  readonly argument: Record<string, unknown>
}

/** A command to exercise a choice by contract key. */
export type ExerciseByKeyCommand = {
  readonly type: 'exerciseByKey'
  readonly templateId: TemplateId
  readonly contractKey: unknown
  readonly choice: string
  readonly argument: Record<string, unknown>
}

/** Union of command types. */
export type Command = CreateCommand | ExerciseCommand | ExerciseByKeyCommand

/** Options for submitting commands to the ledger. */
export type SubmitOptions = {
  readonly commandId?: string
  readonly workflowId?: string
  readonly actAs: readonly Party[]
  readonly readAs?: readonly Party[]
  readonly deduplicationPeriod?: {
    readonly seconds: number
    readonly nanos?: number
  }
  readonly disclosedContracts?: readonly {
    readonly templateId: TemplateId
    readonly contractId: ContractId
    readonly createdEventBlob: string
  }[]
  readonly commands: readonly Command[]
}

/** String-based ledger offset for position tracking. */
export type LedgerOffset = string & { readonly __offset: true }

/** Completion of a submitted command. */
export type Completion = {
  readonly commandId: string
  readonly status: CompletionStatus
  readonly updateId?: string
  readonly offset?: LedgerOffset
}

export type CompletionStatus =
  | { readonly type: 'succeeded' }
  | { readonly type: 'failed'; readonly code: number; readonly message: string }
