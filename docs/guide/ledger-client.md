# LedgerClient

The `LedgerClient` is the primary interface for contract operations. It's scoped to a party identity via JWT.

## Creating a Client

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: jwt }),
  actAs: 'Alice::1234',
  readAs: ['Bob::5678'],  // optional additional read-only parties
})
```

## Contract Operations

### Create a Contract

```typescript
const created = await client.createContract(
  '#my-pkg:Main:Asset',
  { owner: 'Alice', value: '100' },
  { commandId: 'cmd-1', workflowId: 'wf-1' },  // optional
)

console.log(created.contractId)  // unique contract ID
```

### Exercise a Choice

```typescript
const tx = await client.exerciseChoice(
  '#my-pkg:Main:Asset',
  'contract-id-here',
  'Transfer',
  { newOwner: 'Bob' },
)

console.log(tx.updateId)  // transaction ID
console.log(tx.events)    // created/archived events
```

### Query Active Contracts

```typescript
const contracts = await client.queryContracts('#my-pkg:Main:Asset', {
  signal: controller.signal,  // optional cancellation
})

for (const contract of contracts) {
  console.log(contract.createdEvent.contractId)
  console.log(contract.createdEvent.createArgument)
}
```

## Transaction Queries

```typescript
// Get transaction by ID
const tx = await client.getTransactionById(updateId)

// Get transaction by offset
const tx2 = await client.getTransactionByOffset(offset)

// Get events for a specific contract
const events = await client.getEventsByContractId(contractId)
```

## State Queries

```typescript
// Get the latest ledger offset
const end = await client.getLedgerEnd()

// Get connected synchronizers
const syncs = await client.getConnectedSynchronizers()
```

## Advanced: Interactive Submission

For external signing workflows:

```typescript
// Step 1: Prepare (get hash for signing)
const prepared = await client.prepareSubmission(
  '#my-pkg:Main:Asset',
  { owner: 'Alice', value: '100' },
)

// Step 2: Sign externally
const signature = await externalSigner.sign(prepared.preparedTransactionHash)

// Step 3: Execute with signatures
const result = await client.executeSubmission(
  prepared.preparedTransaction,
  [{ party: 'Alice::1234', signatures: [signature] }],
)
```

## Advanced: Reassignment

Transfer contracts between synchronizers:

```typescript
const reassignment = await client.submitReassignment({
  UnassignCommand: {
    contractId: 'contract-id',
    source: 'sync-1',
    target: 'sync-2',
  },
})
```

## Command Options

All write operations accept optional `CommandOptions`:

| Option | Type | Description |
|--------|------|-------------|
| `commandId` | `string` | Idempotency key for the command |
| `workflowId` | `string` | Workflow correlation ID |
| `signal` | `AbortSignal` | Cancellation signal |
