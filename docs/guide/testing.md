# Testing

cantonjs provides first-class testing utilities: mock transports, recording transports, and Canton sandbox fixtures.

## Mock Transport

Create transports with pre-programmed responses for unit tests:

```typescript
import { createMockTransport } from 'cantonjs/testing'

const transport = createMockTransport({
  responses: [
    { contractId: 'contract-1', templateId: '#pkg:Mod:T' },
    { contractId: 'contract-2', templateId: '#pkg:Mod:T' },
  ],
})

const client = createLedgerClient({ transport, actAs: 'Alice::1234' })
const created = await client.createContract('#pkg:Mod:T', { owner: 'Alice' })
// Returns first response: { contractId: 'contract-1', ... }
```

### Response Sequences

Mock transport serves responses in order:

```typescript
const transport = createMockTransport({
  responses: [
    firstResponse,   // returned on first call
    secondResponse,  // returned on second call
  ],
})
```

### Error Injection

```typescript
import { ConnectionError } from 'cantonjs'

const transport = createMockTransport({
  responses: [
    new ConnectionError({ message: 'Network down' }),
    successResponse,  // succeeds on retry
  ],
})
```

### Call Assertions

```typescript
const transport = createMockTransport({ responses: [response] })

await client.createContract('#pkg:Mod:T', { owner: 'Alice' })

// Assert what was called
expect(transport.calls).toHaveLength(1)
expect(transport.calls[0].path).toBe('/v2/commands/submit-and-wait')
expect(transport.calls[0].body).toMatchObject({
  commands: expect.any(Array),
})
```

## Recording Transport

Wrap a real transport to record all exchanges for replay:

```typescript
import { createRecordingTransport } from 'cantonjs/testing'

const recording = createRecordingTransport(realTransport)
const client = createLedgerClient({ transport: recording, actAs: 'Alice::1234' })

// Use normally — all requests/responses are recorded
await client.queryContracts('#pkg:Mod:T')

// Access recordings
console.log(recording.exchanges)
// [{ request: { method: 'POST', path: '...' }, response: [...] }]
```

## Canton Sandbox Fixture

Integration testing with a real Canton sandbox via cantonctl:

```typescript
import { setupCantonSandbox } from 'cantonjs/testing'
import { describe, it, expect } from 'vitest'

describe('integration tests', () => {
  const sandbox = setupCantonSandbox({
    cantonctlPath: 'cantonctl',  // or full path
    timeout: 60_000,
  })

  it('creates a contract on the sandbox', async () => {
    const client = sandbox.client

    const created = await client.createContract('#pkg:Mod:T', {
      owner: client.actAs,
      value: '100',
    })

    expect(created.contractId).toBeDefined()
  })
})
```

The sandbox fixture handles:
- Starting Canton sandbox via `cantonctl dev`
- Health check polling until ready
- JWT token generation
- Cleanup on test completion

## No `vi.mock()`

cantonjs tests never use `vi.mock()`. All dependencies are injected through function parameters:

```typescript
// Good — dependency injection
const transport = createMockTransport({ responses: [response] })
const client = createLedgerClient({ transport, actAs: 'Alice::1234' })

// Bad — module mocking
vi.mock('./transport')  // Never do this
```

This makes tests simpler, more predictable, and easier to reason about.
