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

Default CI keeps integration coverage local: fixture-backed HTTP servers for the Splice packages and a sandbox helper integration test that exercises request-scoped auth/session wiring without calling public endpoints.

When you want participant-style integration locally, use `setupCantonSandbox()` directly:

```typescript
import { setupCantonSandbox } from 'cantonjs/testing'
import { describe, it, expect } from 'vitest'

describe('integration tests', () => {
  it('connects through a request-scoped session', async () => {
    const sandbox = await setupCantonSandbox({
      timeout: 60_000,
      session: async () => ({
        token: await getFreshParticipantJwt(),
      }),
    })

    try {
      const currentTime = await sandbox.client.getTime()
      expect(currentTime).toBeInstanceOf(Date)
    } finally {
      await sandbox.teardown()
    }
  })
})
```

The sandbox fixture handles:
- Starting Canton sandbox via `cantonctl dev`
- Health check polling until ready
- JWT token generation when no `token`, `auth`, or `session` is provided
- Cleanup on test completion

## Coverage Policy

Coverage gates apply only to the included runtime surface. Exclusions are allowed only for:
- generated code
- barrel re-exports
- test files
- pure type-only modules
- narrowly documented, genuinely unreachable branches

Every `coverage.exclude` entry and every inline `v8 ignore` comment must be listed in [`EXCLUSIONS.md`](../../EXCLUSIONS.md) with a concrete reason.

Run the enforcement check directly when you touch tests, coverage config, or inline ignores:

```bash
npm run verify:coverage-exclusions
```

## Local CI-equivalent checks

This repo is not an npm workspace, so install the root and package dependencies explicitly before running the full offline validation set:

```bash
npm ci
npm --prefix packages/cantonjs-codegen ci
npm --prefix packages/cantonjs-react ci
npm --prefix packages/cantonjs-splice-interfaces ci
npm --prefix packages/cantonjs-splice-scan ci
npm --prefix packages/cantonjs-splice-validator ci
npm --prefix packages/cantonjs-splice-token-standard ci
npm --prefix packages/cantonjs-wallet-adapters ci
```

Then run the same default-safe checks used in CI:

```bash
npm run verify:coverage-exclusions
npm run verify:ci:pr
npm run test:coverage:all
```

`npm run verify:generated-artifacts` regenerates the OpenAPI and DAR-derived outputs against the vendored Splice artifacts only. It does not reach live upstream endpoints.

## Live And Localnet Smoke Checks

Default CI never depends on public Scan, validator, or participant endpoints.

For opt-in smoke coverage against live or localnet environments, use the manual/nightly GitHub workflow at `.github/workflows/integration-splice.yml` or run the same smoke script locally:

```bash
SPLICE_SCAN_URL=https://scan.example.com/api/scan npm run test:live:splice

CANTON_JSON_API_URL=http://localhost:7575 \
CANTON_JWT=... \
npm run test:live:splice

SPLICE_VALIDATOR_URL=https://validator.example.com/api/validator \
SPLICE_VALIDATOR_TOKEN=... \
npm run test:live:splice
```

Any unset target is skipped, so you can point the smoke run at only the environments you actually want to exercise.

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
