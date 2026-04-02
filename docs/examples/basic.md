# Basic Contract Operations

This example demonstrates core contract operations: creating contracts, exercising choices, and querying active contracts.

## Setup

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'

const transport = jsonApi({
  url: 'http://localhost:7575',
  token: 'your-jwt-token',
})

const alice = createLedgerClient({
  transport,
  actAs: 'Alice::1234',
})
```

## Creating a Contract

```typescript
const created = await alice.createContract(
  '#my-pkg:Main:Asset',
  {
    owner: 'Alice::1234',
    value: '1000',
    description: 'My first Canton asset',
  },
)

console.log('Created contract:', created.contractId)
console.log('Template:', created.templateId)
```

## Querying Active Contracts

```typescript
const assets = await alice.queryContracts('#my-pkg:Main:Asset')

console.log(`Found ${assets.length} active assets:`)
for (const asset of assets) {
  const { contractId, createArgument } = asset.createdEvent
  console.log(`  ${contractId}: ${JSON.stringify(createArgument)}`)
}
```

## Exercising a Choice

```typescript
const tx = await alice.exerciseChoice(
  '#my-pkg:Main:Asset',
  created.contractId,
  'Transfer',
  { newOwner: 'Bob::5678' },
)

console.log('Transfer transaction:', tx.updateId)
console.log('Events:', tx.events.length)

// Check the resulting events
for (const event of tx.events) {
  if ('Archived' in event) {
    console.log('  Archived:', event.Archived.contractId)
  }
  if ('Created' in event) {
    console.log('  Created:', event.Created.contractId)
  }
}
```

## Multi-Party Scenario

```typescript
const bob = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: bobJwt }),
  actAs: 'Bob::5678',
})

// Bob queries his assets (including the one Alice transferred)
const bobAssets = await bob.queryContracts('#my-pkg:Main:Asset')
console.log(`Bob has ${bobAssets.length} assets`)
```

## With Codegen

For type-safe operations, use generated types:

```typescript
import { Asset } from './generated/Main.js'

// Type-checked template ID and arguments
const created = await alice.createContract(Asset.templateId, {
  owner: 'Alice::1234',  // TS will check this matches the Asset type
  value: '1000',
})

// Type-checked choice exercise
const tx = await alice.exerciseChoice(
  Asset.templateId,
  created.contractId,
  Asset.choices.Transfer.name,
  { newOwner: 'Bob::5678' },
)
```

## Error Handling

```typescript
import { CommandRejectedError, ContractNotFoundError } from 'cantonjs'

try {
  await alice.exerciseChoice(
    '#my-pkg:Main:Asset',
    'nonexistent-contract-id',
    'Transfer',
    { newOwner: 'Bob::5678' },
  )
} catch (error) {
  if (error instanceof ContractNotFoundError) {
    console.log('Contract does not exist or is not visible to Alice')
  } else if (error instanceof CommandRejectedError) {
    console.log('Ledger rejected the command:', error.metaMessages)
  }
}
```

## With AbortSignal

```typescript
const controller = new AbortController()

// Set a timeout
setTimeout(() => controller.abort(), 5_000)

try {
  const contracts = await alice.queryContracts('#my-pkg:Main:Asset', {
    signal: controller.signal,
  })
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Query was cancelled')
  }
}
```
