# Streaming Updates

This example demonstrates real-time contract subscriptions using cantonjs streaming.

## Basic Update Stream

Subscribe to all transaction updates:

```typescript
import { createLedgerClient, jsonApi, streamUpdates } from 'cantonjs'

const transport = jsonApi({
  url: 'http://localhost:7575',
  token: jwt,
})

const controller = new AbortController()

// Stream from the beginning
const stream = streamUpdates(transport, {
  beginExclusive: '0',
  signal: controller.signal,
})

for await (const update of stream) {
  console.log(`Transaction ${update.updateId} at offset ${update.offset}`)

  for (const event of update.events) {
    if ('Created' in event) {
      console.log(`  + Created ${event.Created.templateId}`)
      console.log(`    Contract: ${event.Created.contractId}`)
    }
    if ('Archived' in event) {
      console.log(`  - Archived ${event.Archived.contractId}`)
    }
  }
}
```

## Filtered Stream

Subscribe to a specific template and party:

```typescript
const stream = streamUpdates(transport, {
  beginExclusive: '0',
  filter: {
    party: 'Alice::1234',
    templateIds: ['#my-pkg:Main:Asset'],
  },
  signal: controller.signal,
})

for await (const update of stream) {
  // Only receives Asset template events visible to Alice
}
```

## Active Contract Snapshot

Get all currently active contracts:

```typescript
import { streamContracts } from 'cantonjs'

const stream = streamContracts(transport, {
  filter: {
    party: 'Alice::1234',
    templateIds: ['#my-pkg:Main:Asset'],
  },
  signal: controller.signal,
})

const allContracts = []

for await (const batch of stream) {
  allContracts.push(...batch.activeContracts)
  console.log(`Received batch of ${batch.activeContracts.length} contracts`)
}

console.log(`Total active contracts: ${allContracts.length}`)
```

## Command Completions

Monitor command completion status:

```typescript
import { streamCompletions } from 'cantonjs'

const completions = streamCompletions(transport, {
  parties: ['Alice::1234'],
  beginExclusive: '0',
  signal: controller.signal,
})

for await (const completion of completions) {
  if (completion.status === 'SUCCEEDED') {
    console.log(`Command ${completion.commandId} succeeded`)
  } else {
    console.log(`Command ${completion.commandId} failed: ${completion.status}`)
  }
}
```

## Live Dashboard Pattern

Combine initial snapshot with live updates for a dashboard:

```typescript
import { streamContracts, streamUpdates } from 'cantonjs'

const controller = new AbortController()
let contracts: Map<string, ActiveContract> = new Map()

// Step 1: Load initial state
let latestOffset = '0'
const snapshot = streamContracts(transport, {
  filter: { party: 'Alice::1234', templateIds: ['#my-pkg:Main:Asset'] },
  signal: controller.signal,
})

for await (const batch of snapshot) {
  for (const contract of batch.activeContracts) {
    contracts.set(contract.createdEvent.contractId, contract)
  }
  latestOffset = batch.offset
}

console.log(`Loaded ${contracts.size} contracts, now streaming live...`)

// Step 2: Subscribe to live updates from the snapshot offset
const live = streamUpdates(transport, {
  beginExclusive: latestOffset,
  filter: { party: 'Alice::1234', templateIds: ['#my-pkg:Main:Asset'] },
  signal: controller.signal,
})

for await (const update of live) {
  for (const event of update.events) {
    if ('Created' in event) {
      contracts.set(event.Created.contractId, {
        createdEvent: event.Created,
        synchronizerId: '',
        reassignmentCounter: 0,
      })
    }
    if ('Archived' in event) {
      contracts.delete(event.Archived.contractId)
    }
  }

  console.log(`Active contracts: ${contracts.size}`)
}
```

## Graceful Shutdown

```typescript
// Handle process shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...')
  controller.abort()
})

process.on('SIGTERM', () => {
  controller.abort()
})
```

## Custom Reconnect Config

```typescript
const stream = streamUpdates(transport, {
  beginExclusive: '0',
  reconnect: {
    initialDelayMs: 500,     // Start with 500ms delay
    maxDelayMs: 60_000,      // Cap at 60 seconds
    factor: 3,               // Triple the delay each attempt
    jitter: 0.1,             // +/-10% randomization
  },
  signal: controller.signal,
})
```
