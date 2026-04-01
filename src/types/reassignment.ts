/**
 * Canton reassignment types.
 *
 * Reassignments transfer contracts between synchronizers (domains).
 * A reassignment consists of an unassign from the source synchronizer
 * followed by an assign to the target synchronizer.
 */

/** A reassignment event from the update stream. */
export type Reassignment = {
  readonly updateId: string
  readonly commandId?: string
  readonly workflowId?: string
  readonly offset: number
  readonly events: readonly ReassignmentEvent[]
  readonly traceContext?: Record<string, string>
  readonly recordTime: string
}

/** Tagged reassignment event: either an assign or unassign. */
export type ReassignmentEvent =
  | { readonly AssignedEvent: AssignedEvent }
  | { readonly UnassignedEvent: UnassignedEvent }

/** Contract assigned to a target synchronizer. */
export type AssignedEvent = {
  readonly source: string
  readonly target: string
  readonly unassignId: string
  readonly submitter: string
  readonly reassignmentCounter: number
  readonly createdEvent: import('./contract.js').CreatedEvent
}

/** Contract unassigned from a source synchronizer. */
export type UnassignedEvent = {
  readonly unassignId: string
  readonly contractId: string
  readonly templateId: string
  readonly packageName: string
  readonly source: string
  readonly target: string
  readonly submitter: string
  readonly reassignmentCounter: number
  readonly assignmentExclusivity?: string
  readonly witnessParties: readonly string[]
}

/** Reassignment command for submitting a contract transfer. */
export type ReassignmentCommand =
  | { readonly UnassignCommand: UnassignCommand }
  | { readonly AssignCommand: AssignCommand }

/** Command to unassign a contract from its current synchronizer. */
export type UnassignCommand = {
  readonly contractId: string
  readonly source: string
  readonly target: string
}

/** Command to assign a previously unassigned contract to a target synchronizer. */
export type AssignCommand = {
  readonly unassignId: string
  readonly source: string
  readonly target: string
}
