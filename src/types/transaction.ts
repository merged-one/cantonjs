/**
 * Canton transaction and update types.
 *
 * Updates are the primary way to observe ledger changes. They contain
 * transactions (created/archived events), reassignments, and topology changes.
 */

import type { ArchivedEvent, CreatedEvent, ExercisedEvent, Event } from './contract.js'
import type { LedgerOffset } from './command.js'

/** A flat transaction containing created and archived events. */
export type Transaction = {
  readonly updateId: string
  readonly commandId: string
  readonly workflowId: string
  readonly effectiveAt: string
  readonly events: readonly Event[]
  readonly offset: LedgerOffset
  readonly synchronizerId: string
  readonly traceContext?: Record<string, string>
}

/** A transaction tree with full exercise hierarchy. */
export type TransactionTree = {
  readonly updateId: string
  readonly commandId: string
  readonly workflowId: string
  readonly effectiveAt: string
  readonly eventsById: Record<string, CreatedEvent | ExercisedEvent | ArchivedEvent>
  readonly rootEventIds: readonly string[]
  readonly offset: LedgerOffset
  readonly synchronizerId: string
  readonly traceContext?: Record<string, string>
}

/** A reassignment event (contract transfer between synchronizers). */
export type Reassignment = {
  readonly updateId: string
  readonly commandId: string
  readonly offset: LedgerOffset
  readonly event: AssignEvent | UnassignEvent
}

export type AssignEvent = {
  readonly type: 'assign'
  readonly source: string
  readonly target: string
  readonly createdEvent: CreatedEvent
}

export type UnassignEvent = {
  readonly type: 'unassign'
  readonly source: string
  readonly target: string
  readonly contractId: string
}

/** Union of update types from the update stream. */
export type Update = Transaction | Reassignment

/** Shape of transaction updates. */
export type TransactionShape = 'ACS_DELTA' | 'LEDGER_EFFECTS'
