/**
 * Canton command types.
 *
 * Commands are the units of submission to the ledger. Each command atomically
 * creates contracts or exercises choices on existing contracts.
 *
 * Commands on the wire use tagged discriminated unions:
 *   { "CreateCommand": {...} } | { "ExerciseCommand": {...} } | ...
 */

/**
 * Ledger offset. int64 in Canton 3.4+.
 * 0 = empty ledger, positive = absolute offset.
 */
export type LedgerOffset = number

/** Wire format for a create command. */
export type CreateCommand = {
  readonly templateId: string
  readonly createArguments: Record<string, unknown>
}

/** Wire format for an exercise command. */
export type ExerciseCommand = {
  readonly templateId: string
  readonly contractId: string
  readonly choice: string
  readonly choiceArgument: Record<string, unknown>
}

/** Wire format for an exercise-by-key command. */
export type ExerciseByKeyCommand = {
  readonly templateId: string
  readonly contractKey: unknown
  readonly choice: string
  readonly choiceArgument: Record<string, unknown>
}

/** Wire format for a create-and-exercise command. */
export type CreateAndExerciseCommand = {
  readonly templateId: string
  readonly createArguments: Record<string, unknown>
  readonly choice: string
  readonly choiceArgument: Record<string, unknown>
}

/** Tagged command union as it appears on the wire. */
export type TaggedCommand =
  | { readonly CreateCommand: CreateCommand }
  | { readonly ExerciseCommand: ExerciseCommand }
  | { readonly ExerciseByKeyCommand: ExerciseByKeyCommand }
  | { readonly CreateAndExerciseCommand: CreateAndExerciseCommand }

/** Full JsCommands request body. */
export type JsCommands = {
  readonly commands: readonly TaggedCommand[]
  readonly commandId: string
  readonly actAs: readonly string[]
  readonly userId?: string
  readonly readAs?: readonly string[]
  readonly workflowId?: string
  readonly deduplicationPeriod?: DeduplicationPeriod
  readonly submissionId?: string
  readonly synchronizerId?: string
}

/** Deduplication period (tagged union). */
export type DeduplicationPeriod =
  | { readonly DeduplicationDuration: { readonly seconds: number; readonly nanos?: number } }
  | { readonly DeduplicationOffset: { readonly value: number } }
  | { readonly Empty: Record<string, never> }

/** Submit-and-wait response. */
export type SubmitAndWaitResponse = {
  readonly updateId: string
  readonly completionOffset: number
}

/** Transaction shape for queries. */
export type TransactionShape =
  | 'TRANSACTION_SHAPE_ACS_DELTA'
  | 'TRANSACTION_SHAPE_LEDGER_EFFECTS'
  | 'TRANSACTION_SHAPE_UNSPECIFIED'

/** Event format for filtering. */
export type EventFormat = {
  readonly filtersByParty?: Record<string, { readonly cumulative: readonly CumulativeFilter[] }>
  readonly filtersForAnyParty?: { readonly cumulative: readonly CumulativeFilter[] }
  readonly verbose?: boolean
}

/** Cumulative filter entry. */
export type CumulativeFilter = {
  readonly identifierFilter: IdentifierFilter
}

/** Identifier filter (tagged union). */
export type IdentifierFilter =
  | {
      readonly TemplateFilter: {
        readonly value: {
          readonly templateId: string
          readonly includeCreatedEventBlob?: boolean
        }
      }
    }
  | {
      readonly InterfaceFilter: {
        readonly value: {
          readonly interfaceId: string
          readonly includeInterfaceView?: boolean
          readonly includeCreatedEventBlob?: boolean
        }
      }
    }
  | { readonly WildcardFilter: { readonly value: { readonly includeCreatedEventBlob?: boolean } } }
  | { readonly Empty: Record<string, never> }

/** Transaction format for queries. */
export type TransactionFormat = {
  readonly transactionShape: TransactionShape
  readonly eventFormat: EventFormat
}
