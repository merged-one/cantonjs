# Types API

Core Canton data types used across cantonjs.

## Contract Types

```typescript
/** Unique contract identifier (UTXO model). */
type ContractId = string

/** Fully qualified template identifier: packageId:moduleName:entityName */
type TemplateId = string

/** Event emitted when a contract is created. */
type CreatedEvent = {
  readonly contractId: ContractId
  readonly templateId: TemplateId
  readonly createArgument: Record<string, unknown>
  readonly signatories: readonly string[]
  readonly observers: readonly string[]
  readonly [key: string]: unknown
}

/** Event emitted when a contract is archived. */
type ArchivedEvent = {
  readonly contractId: ContractId
  readonly templateId: TemplateId
}

/** Event emitted when a choice is exercised. */
type ExercisedEvent = {
  readonly contractId: ContractId
  readonly templateId: TemplateId
  readonly choice: string
  readonly choiceArgument: Record<string, unknown>
  readonly exerciseResult: unknown
}

/** Tagged union of event types. */
type TaggedEvent =
  | { Created: CreatedEvent }
  | { Archived: ArchivedEvent }
  | { Exercised: ExercisedEvent }

/** An active contract with metadata. */
type ActiveContract = {
  readonly createdEvent: CreatedEvent
  readonly synchronizerId: string
  readonly reassignmentCounter: number
}
```

## Party Types

```typescript
type Party = string

type PartyDetails = {
  readonly party: Party
  readonly displayName: string
  readonly isLocal: boolean
}

type AllocatePartyRequest = {
  readonly identifierHint?: string
  readonly displayName?: string
}
```

## Transaction Types

```typescript
type JsTransaction = {
  readonly updateId: string
  readonly commandId: string
  readonly workflowId: string
  readonly offset: string
  readonly events: readonly TaggedEvent[]
}

type TaggedUpdate =
  | { Transaction: JsTransaction }
  | { Reassignment: Reassignment }
```

## Command Types

```typescript
type LedgerOffset = string

type CommandOptions = {
  readonly commandId?: string
  readonly workflowId?: string
  readonly signal?: AbortSignal
}

type QueryOptions = {
  readonly signal?: AbortSignal
}
```

## Reassignment Types

```typescript
type Reassignment = {
  readonly updateId: string
  readonly offset: string
  readonly events: readonly ReassignmentEvent[]
}

type ReassignmentEvent =
  | { AssignedEvent: AssignedEvent }
  | { UnassignedEvent: UnassignedEvent }

type AssignedEvent = {
  readonly source: string
  readonly target: string
  readonly unassignId: string
  readonly submitter: string
  readonly createdEvent: CreatedEvent
}

type UnassignedEvent = {
  readonly contractId: string
  readonly templateId: string
  readonly source: string
  readonly target: string
  readonly submitter: string
}
```

## Interactive Submission Types

```typescript
type PrepareSubmissionResponse = {
  readonly preparedTransaction: unknown
  readonly preparedTransactionHash: string
  readonly hashingSchemeVersion: string
}

type PartySignatures = {
  readonly party: string
  readonly signatures: readonly Signature[]
}

type Signature = {
  readonly format: SignatureFormat
  readonly signature: string
  readonly signedBy: string
}

type SignatureFormat = 'RAW'
```

## User Types

```typescript
type User = {
  readonly id: string
  readonly primaryParty: string
  readonly rights: readonly Right[]
}

type Right = {
  readonly kind: RightKind
  readonly party: string
}

type RightKind = 'CanActAs' | 'CanReadAs' | 'ParticipantAdmin'
```

## Package Types

```typescript
type PackageDetails = {
  readonly packageId: string
  readonly packageSize: number
  readonly knownSince: string
  readonly sourceDescription: string
}

type PackageStatus = 'REGISTERED' | 'UNKNOWN'
```
