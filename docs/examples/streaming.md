# Participant Stream Worker

| Example profile | |
| --- | --- |
| Audience | Integration and data teams with participant access |
| Data scope | Participant-private |
| Depends on | Participant Ledger API V2 streams |

This example shows how to build a long-running worker that projects participant-private ledger events into another system.

Use this when your team owns participant access and needs streaming, replay, and completion monitoring. If your use case is public network history rather than participant-private events, use [Public Scan Dashboard](/examples/public-scan-dashboard) instead.

## Create A Shared Transport

```typescript
import { jsonApi } from 'cantonjs'

const transport = jsonApi({
  url: process.env.CANTON_JSON_API_URL ?? 'http://localhost:7575',
  token: process.env.CANTON_JWT ?? 'your-jwt-token',
})
```

## Load A Snapshot First

```typescript
import { streamContracts } from 'cantonjs'

const controller = new AbortController()
const contracts = new Map<string, unknown>()

let latestOffset = '0'
const snapshot = streamContracts(transport, {
  filter: {
    party: 'Alice::1234',
    templateIds: ['#my-pkg:Main:Asset'],
  },
  signal: controller.signal,
})

for await (const batch of snapshot) {
  for (const contract of batch.activeContracts) {
    contracts.set(contract.createdEvent.contractId, contract.createdEvent.createArgument)
  }
  latestOffset = batch.offset
}
```

## Follow Live Updates

```typescript
import { streamUpdates } from 'cantonjs'

const live = streamUpdates(transport, {
  beginExclusive: latestOffset,
  filter: {
    party: 'Alice::1234',
    templateIds: ['#my-pkg:Main:Asset'],
  },
  signal: controller.signal,
})

for await (const update of live) {
  for (const event of update.events) {
    if ('Created' in event) {
      contracts.set(event.Created.contractId, event.Created.createArgument)
    }
    if ('Archived' in event) {
      contracts.delete(event.Archived.contractId)
    }
  }

  console.log('projected asset count', contracts.size)
  console.log('last processed update', update.updateId)
}
```

## Monitor Command Completions Separately

```typescript
import { streamCompletions } from 'cantonjs'

const completions = streamCompletions(transport, {
  parties: ['Alice::1234'],
  beginExclusive: '0',
  signal: controller.signal,
})

for await (const completion of completions) {
  if (completion.status === 'SUCCEEDED') {
    console.log(`command ${completion.commandId} succeeded`)
  } else {
    console.log(`command ${completion.commandId} failed: ${completion.status}`)
  }
}
```

## Shut Down Cleanly

```typescript
process.on('SIGINT', () => controller.abort())
process.on('SIGTERM', () => controller.abort())
```

## Tune Reconnect Behavior

```typescript
const live = streamUpdates(transport, {
  beginExclusive: latestOffset,
  reconnect: {
    initialDelayMs: 500,
    maxDelayMs: 60_000,
    factor: 3,
    jitter: 0.1,
  },
  signal: controller.signal,
})
```
