/**
 * Core Canton contract types.
 *
 * Canton uses a UTXO model: contracts are created and archived, never mutated.
 * Each contract is identified by a unique ContractId and belongs to a template.
 */

/** Unique identifier for a contract instance on the ledger. */
export type ContractId<T = unknown> = string & { readonly __contractId: T }

/**
 * Fully qualified template identifier.
 * Format: `packageId:moduleName:entityName`
 */
export type TemplateId = `${string}:${string}:${string}`

/** A contract on the ledger with its payload and metadata. */
export type Contract<TPayload = Record<string, unknown>> = {
  readonly templateId: TemplateId
  readonly contractId: ContractId<TPayload>
  readonly payload: TPayload
  readonly signatories: readonly string[]
  readonly observers: readonly string[]
  readonly createdAt: string
}

/** A created event from the ledger. */
export type CreatedEvent<TPayload = Record<string, unknown>> = {
  readonly templateId: TemplateId
  readonly contractId: ContractId<TPayload>
  readonly payload: TPayload
  readonly signatories: readonly string[]
  readonly observers: readonly string[]
  readonly createdAt: string
  readonly contractKey?: unknown
  readonly interfaceViews?: Record<string, unknown>
}

/** An archived event from the ledger. */
export type ArchivedEvent = {
  readonly templateId: TemplateId
  readonly contractId: ContractId
}

/** An exercised event from a transaction tree. */
export type ExercisedEvent = {
  readonly templateId: TemplateId
  readonly contractId: ContractId
  readonly choice: string
  readonly argument: unknown
  readonly result: unknown
  readonly consuming: boolean
  readonly childEventIds: readonly string[]
  readonly actingParties: readonly string[]
}

/** Union of ledger events. */
export type Event = CreatedEvent | ArchivedEvent
