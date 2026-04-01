/**
 * Core Canton contract types.
 *
 * Canton uses a UTXO model: contracts are created and archived, never mutated.
 * Each contract is identified by a unique ContractId and belongs to a template.
 *
 * Events on the wire use tagged discriminated unions:
 *   { "CreatedEvent": {...} } | { "ArchivedEvent": {...} } | { "ExercisedEvent": {...} }
 */

/** Unique identifier for a contract instance on the ledger. */
export type ContractId<T = unknown> = string & { readonly __contractId: T }

/**
 * Template identifier string.
 * Supports two formats:
 *   - `#package-name:Module:Entity` (preferred, package-name reference)
 *   - `packageId:Module:Entity` (deprecated package-id reference)
 */
export type TemplateId = string & { readonly __templateId: true }

/** A created event from the ledger (wire format). */
export type CreatedEvent = {
  readonly offset: number
  readonly nodeId: number
  readonly contractId: string
  readonly templateId: string
  readonly packageName: string
  readonly representativePackageId: string
  readonly createArgument: Record<string, unknown>
  readonly signatories: readonly string[]
  readonly witnessParties: readonly string[]
  readonly acsDelta: boolean
  readonly createdAt: string
  readonly contractKey?: Record<string, unknown>
  readonly createdEventBlob?: string
  readonly interfaceViews?: readonly InterfaceView[]
  readonly observers?: readonly string[]
}

/** An archived event from the ledger (wire format). */
export type ArchivedEvent = {
  readonly offset: number
  readonly nodeId: number
  readonly contractId: string
  readonly templateId: string
  readonly packageName: string
  readonly witnessParties: readonly string[]
  readonly implementedInterfaces?: readonly string[]
}

/** An exercised event from a transaction tree (wire format). */
export type ExercisedEvent = {
  readonly offset: number
  readonly nodeId: number
  readonly contractId: string
  readonly templateId: string
  readonly choice: string
  readonly choiceArgument: Record<string, unknown>
  readonly consuming: boolean
  readonly lastDescendantNodeId: number
  readonly packageName: string
  readonly acsDelta: boolean
  readonly actingParties: readonly string[]
  readonly witnessParties: readonly string[]
  readonly interfaceId?: string
  readonly exerciseResult?: unknown
  readonly implementedInterfaces?: readonly string[]
}

/** Interface view attached to a created event. */
export type InterfaceView = {
  readonly interfaceId: string
  readonly viewValue: Record<string, unknown>
}

/**
 * Tagged event union as it appears on the wire.
 * Canton uses { "CreatedEvent": {...} } | { "ArchivedEvent": {...} } | ...
 */
export type TaggedEvent =
  | { readonly CreatedEvent: CreatedEvent }
  | { readonly ArchivedEvent: ArchivedEvent }
  | { readonly ExercisedEvent: ExercisedEvent }

/** A contract from the active contract set. */
export type ActiveContract = {
  readonly createdEvent: CreatedEvent
  readonly synchronizerId: string
  readonly reassignmentCounter: number
}

/**
 * Tagged contract entry from active contracts query.
 * { "JsActiveContract": ... } | { "JsEmpty": {} } | ...
 */
export type ContractEntry =
  | { readonly JsActiveContract: ActiveContract }
  | { readonly JsEmpty: Record<string, never> }
  | { readonly JsIncompleteAssigned: unknown }
  | { readonly JsIncompleteUnassigned: unknown }
