/**
 * Canton transaction and update types.
 *
 * Updates are the primary way to observe ledger changes. They use tagged
 * discriminated unions on the wire:
 *   { "Transaction": { "value": JsTransaction } }
 *   | { "Reassignment": Reassignment }
 *   | { "OffsetCheckpoint": { "value": OffsetCheckpoint } }
 *   | { "TopologyTransaction": TopologyTransaction }
 */

import type { TaggedEvent } from './contract.js'

/** A transaction from the ledger (wire format). */
export type JsTransaction = {
  readonly updateId: string
  readonly commandId?: string
  readonly workflowId?: string
  readonly effectiveAt: string
  readonly events: readonly TaggedEvent[]
  readonly offset: number
  readonly synchronizerId: string
  readonly recordTime: string
  readonly traceContext?: Record<string, string>
  readonly externalTransactionHash?: string
  readonly paidTrafficCost?: number
}

/** An offset checkpoint from the update stream. */
export type OffsetCheckpoint = {
  readonly offset: number
  readonly synchronizerTimes?: readonly {
    readonly synchronizerId: string
    readonly recordTime: string
  }[]
}

/** Tagged update union as it appears on the wire. */
export type TaggedUpdate =
  | { readonly Transaction: { readonly value: JsTransaction } }
  | { readonly Reassignment: unknown }
  | { readonly OffsetCheckpoint: { readonly value: OffsetCheckpoint } }
  | { readonly TopologyTransaction: unknown }

/** Update format for streaming requests. */
export type UpdateFormat = {
  readonly includeTransactions?: {
    readonly transactionShape:
      | 'TRANSACTION_SHAPE_ACS_DELTA'
      | 'TRANSACTION_SHAPE_LEDGER_EFFECTS'
    readonly eventFormat: import('./command.js').EventFormat
  }
  readonly includeReassignments?: import('./command.js').EventFormat
  readonly includeTopologyEvents?: unknown
}
