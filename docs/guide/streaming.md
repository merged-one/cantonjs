# Streaming

cantonjs provides WebSocket-based streaming with the AsyncIterator pattern for real-time contract updates, transaction streams, and command completions.

## Stream Updates

Subscribe to transaction updates from a given offset:

```typescript
import { streamUpdates, jsonApi } from 'cantonjs'

const transport = jsonApi({ url: 'http://localhost:7575', token: jwt })
const controller = new AbortController()

const stream = streamUpdates(transport, {
  beginExclusive: '0',
  filter: { party: 'Alice::1234', templateIds: ['#pkg:Mod:T'] },
  signal: controller.signal,
})

for await (const update of stream) {
  console.log('Update:', update.updateId)
  for (const event of update.events) {
    if ('Created' in event) {
      console.log('Created:', event.Created.contractId)
    } else if ('Archived' in event) {
      console.log('Archived:', event.Archived.contractId)
    }
  }
}
```

## Stream Active Contracts

Get a snapshot of active contracts (bounded stream):

```typescript
import { streamContracts } from 'cantonjs'

const stream = streamContracts(transport, {
  filter: { party: 'Alice::1234', templateIds: ['#pkg:Mod:T'] },
  signal: controller.signal,
})

for await (const batch of stream) {
  for (const contract of batch.activeContracts) {
    console.log(contract.createdEvent.contractId)
  }
}
```

## Stream Completions

Monitor command completion status:

```typescript
import { streamCompletions } from 'cantonjs'

const stream = streamCompletions(transport, {
  parties: ['Alice::1234'],
  beginExclusive: '0',
  signal: controller.signal,
})

for await (const completion of stream) {
  console.log('Command:', completion.commandId, 'Status:', completion.status)
}
```

## Auto-Reconnect

`streamUpdates` and `streamCompletions` automatically reconnect on disconnect with exponential backoff:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Initial delay | 1 second | First reconnect attempt |
| Max delay | 30 seconds | Backoff ceiling |
| Factor | 2x | Exponential multiplier |
| Jitter | +/-25% | Randomization to prevent thundering herd |

Reconnection resumes from the last received offset, ensuring no updates are missed.

### Custom Reconnect Config

```typescript
const stream = streamUpdates(transport, {
  beginExclusive: '0',
  reconnect: {
    initialDelayMs: 500,
    maxDelayMs: 60_000,
    factor: 3,
    jitter: 0.1,
  },
  signal: controller.signal,
})
```

## Cancellation

All streams accept an `AbortSignal` for clean cancellation:

```typescript
const controller = new AbortController()

// Start streaming
const stream = streamUpdates(transport, {
  beginExclusive: '0',
  signal: controller.signal,
})

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30_000)

for await (const update of stream) {
  // Loop exits cleanly when aborted
}
```

## WebSocket URL

Convert an HTTP URL to a WebSocket URL:

```typescript
import { toWebSocketUrl } from 'cantonjs'

toWebSocketUrl('http://localhost:7575')   // 'ws://localhost:7575'
toWebSocketUrl('https://canton.prod.com') // 'wss://canton.prod.com'
```
