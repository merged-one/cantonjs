# Implementation Plan

> Concrete next steps for cantonjs, prioritized and sequenced.
> This is a living document — update as work progresses.

**Date:** 2026-04-01
**Author:** Charles Dusek

---

## Current State

| Phase | Status | Tests | Notes |
|-------|--------|-------|-------|
| Phase 0: Foundation | 95% | 43 passing | ESLint config missing (blocks CI) |
| Phase 1: LedgerClient Core | 70% | 11 tests | Core methods implemented, AdminClient/TestClient untested |
| Phase 2: Streaming | Not started | — | WebSocket transport needed |
| Phase 3: AdminClient | Stub only | — | Methods implemented, no tests |
| Phase 4: TestClient | Stub only | — | Sandbox integration needed |

---

## Step 1: Fix CI — ESLint Configuration

**Priority:** BLOCKING
**Complexity:** S (1-2 hours)
**Depends on:** Nothing

### Problem
ESLint 9.x requires flat config (`eslint.config.js`). The CI lint step fails because no config exists.

### Files to Create
- `eslint.config.js` — flat config with `@typescript-eslint` v8

### Files to Modify
- `package.json` — update lint script if needed (remove `--ext .ts` flag, not supported in flat config)
- Any source files with lint violations

### Test Strategy
- Run `npm run lint` locally until clean
- Verify CI passes

### Exit Criteria
- `npm run lint` passes
- `npm run size` passes
- GitHub Actions CI green on Node 18 and 22

---

## Step 2: Complete Phase 1 — Test Coverage

**Priority:** HIGH
**Complexity:** M (3-4 hours)
**Depends on:** Step 1

### Work Items

#### 2a. AdminClient Tests
Create `src/clients/createAdminClient.test.ts` covering:
- `allocateParty()` — request shape matches OpenAPI spec (partyIdHint, not identifierHint)
- `listParties()` — with and without filter query param
- `getParty()` — URL encoding of party ID
- `getParticipantId()` — simple GET
- `createUser()` — nested Right/Kind tagged union structure
- `getUser()`, `listUsers()`, `deleteUser()` — CRUD
- `grantRights()`, `revokeRights()` — rights array handling
- `uploadDar()` — Content-Type: application/octet-stream, binary body
- `validateDar()` — same as upload but different endpoint
- `listPackages()` — packageIds array
- `getLedgerApiVersion()` — version string

#### 2b. TestClient Tests
Create `src/clients/createTestClient.test.ts` covering:
- Factory composition (has LedgerClient + AdminClient methods)
- `getTime()` — parses ISO string to Date
- `setTime()` — sends current + new time
- `advanceTime()` — calls getTime then setTime with delta
- `allocateParties()` — batch allocation with Promise.all

#### 2c. Missing LedgerClient Tests
Add to `src/clients/createLedgerClient.test.ts`:
- `getEventsByContractId()` — request shape
- `createContract()` with custom commandId and workflowId
- `exerciseChoice()` with AbortSignal

### Exit Criteria
- All client methods have at least one test
- 70+ tests passing
- No untested public methods

---

## Step 3: Phase 2 — WebSocket Streaming

**Priority:** HIGH
**Complexity:** L (1-2 weeks)
**Depends on:** Step 2

### Research Needed
- Canton AsyncAPI spec (available at `/docs/asyncapi` on running nodes)
- WebSocket message framing for `/v2/updates`, `/v2/state/active-contracts`, `/v2/commands/completions`
- Reconnection semantics — does Canton support offset-based resumption over WebSocket?

### Files to Create
- `src/transport/websocket.ts` — WebSocket transport factory
- `src/transport/websocket.test.ts` — tests with mock WebSocket
- `src/streaming/streamUpdates.ts` — update stream with auto-reconnect
- `src/streaming/streamContracts.ts` — active contract stream
- `src/streaming/streamCompletions.ts` — completion stream
- `src/streaming/index.ts` — barrel export
- `docs/adr/0005-streaming-architecture.md`

### Key Design Decisions
- Use `AsyncIterator` pattern (for-await-of) or EventEmitter/Observable?
  - Recommendation: **AsyncIterator** — aligns with modern JS, works with AbortSignal
- Reconnection strategy: exponential backoff with jitter
- Offset tracking: store last seen offset, resume from there

### API Shape (Proposed)
```typescript
// AsyncIterator pattern
const stream = streamUpdates(transport, {
  beginExclusive: 0,
  updateFormat: { includeTransactions: { ... } },
  signal: controller.signal,
})

for await (const update of stream) {
  // process update
}
```

### Test Strategy
- Mock WebSocket class for unit tests
- Test reconnection logic with simulated disconnects
- Test offset tracking across reconnections
- Integration tests against Canton sandbox (Phase 4)

### Exit Criteria
- `streamUpdates()`, `streamContracts()`, `streamCompletions()` functional
- Auto-reconnect with exponential backoff
- AbortSignal cancellation
- Offset-based resumption

---

## Step 4: Phase 3 — AdminClient Completions

**Priority:** MEDIUM
**Complexity:** M (3-5 days)
**Depends on:** Step 2

### Work Items

#### 4a. Pagination Support
- Add `pageSize` and `pageToken` parameters to `listParties()` and `listUsers()`
- Return `nextPageToken` in responses
- Consider a `paginate()` helper that auto-follows pages

#### 4b. Identity Provider Management
Add to AdminClient:
- `createIdentityProvider(config)` — POST `/v2/identity-provider-configs`
- `getIdentityProvider(id)` — GET
- `updateIdentityProvider(id, config)` — PATCH
- `deleteIdentityProvider(id)` — DELETE
- `listIdentityProviders()` — GET

#### 4c. Package Vetting
Add to AdminClient:
- `getVettedPackages()` — GET `/v2/package-vetting`
- `updateVettedPackages(packages)` — POST `/v2/package-vetting`

#### 4d. Connected Synchronizers
Add to LedgerClient:
- `getConnectedSynchronizers()` — GET `/v2/state/connected-synchronizers`
- `getLatestPrunedOffsets()` — GET `/v2/state/latest-pruned-offsets`

### Files to Create/Modify
- `src/clients/createAdminClient.ts` — add IDP + vetting methods
- `src/clients/createAdminClient.test.ts` — tests for new methods
- `src/clients/createLedgerClient.ts` — add state query methods
- `src/types/idp.ts` — identity provider types
- `src/types/index.ts` — export new types

### Exit Criteria
- Full admin API coverage per Canton OpenAPI spec
- Pagination works for list endpoints
- IDP management functional

---

## Step 5: Phase 4 — TestClient & Testing Utilities

**Priority:** MEDIUM
**Complexity:** L (1-2 weeks)
**Depends on:** Step 3

### Work Items

#### 5a. Sandbox Lifecycle Helpers
- `setupCantonSandbox()` — vitest fixture that starts sandbox, returns configured TestClient, cleans up
- Detect sandbox readiness via health check (`GET /livez`)
- Configurable port, timeout

#### 5b. Mock Transport with Replay
- `createMockTransport(recordings)` — replay recorded request/response pairs
- `recordTransport(transport)` — wrapper that records all requests for later replay
- Useful for offline unit testing of dApp code

#### 5c. Integration Test Suite
- Write integration tests that run against a real Canton sandbox
- Separate vitest project config (like cantonctl's `e2e-sandbox`)
- Test full create → exercise → query → archive lifecycle
- Test party allocation → user creation → rights management

### Files to Create
- `src/testing/setupSandbox.ts` — sandbox lifecycle
- `src/testing/mockTransport.ts` — recording/replay transport
- `src/testing/index.ts` — update barrel
- `vitest.config.ts` — add integration test project
- `test/integration/ledger.test.ts` — integration tests
- `test/integration/admin.test.ts` — admin integration tests
- `docs/adr/0006-testing-strategy.md`

### Exit Criteria
- `setupCantonSandbox()` fixture works with vitest
- Mock transport can record and replay
- Integration tests pass against Canton sandbox
- Testing utilities documented

---

## Step 6: Phase 5 — Codegen from Daml

**Priority:** MEDIUM
**Complexity:** XL (2-3 weeks)
**Depends on:** Step 5

### Research Needed
- DAR file format (ZIP containing DALF protobuf files)
- Daml-LF protobuf schema for type extraction
- Existing `daml codegen js` output for comparison
- How `#package-name:Module:Entity` template IDs map to generated types

### Work Items
- DAR file parser (unzip + protobuf decode)
- Type mapper (Daml types → TypeScript types)
- Code generator (produce .ts files from Daml models)
- CLI tool (`cantonjs-codegen` or `npx cantonjs codegen`)
- Runtime support module (`cantonjs/codegen`)

### Files to Create
- `src/codegen/` — codegen module
- `packages/cantonjs-codegen/` — CLI package (if separate)
- `docs/adr/0007-codegen-architecture.md`

### This Is the Largest Single Phase
- Consider splitting into sub-phases
- Start with type generation only (no CLI)
- Add CLI wrapper after types are proven

---

## ADR Schedule

| ADR | Topic | Write At |
|-----|-------|----------|
| 0005 | Streaming architecture (AsyncIterator vs Observable) | Step 3 |
| 0006 | Testing strategy (sandbox + mock transport) | Step 5 |
| 0007 | Codegen architecture and output format | Step 6 |
| 0008 | Pagination and list endpoint patterns | Step 4 |
| 0009 | React integration (three-layer pattern) | Phase 7 |

---

## Immediate Action Items

1. **Create ESLint config** → unblock CI
2. **Write AdminClient + TestClient tests** → complete Phase 1
3. **Run `npm run size`** → establish bundle size baseline
4. **Begin WebSocket streaming research** → prep Phase 2

---

## Success Metrics

| Milestone | Target | Metric |
|-----------|--------|--------|
| Phase 1 complete | Week 2 | 70+ tests, CI green, all client methods tested |
| Phase 2 complete | Week 4 | Streaming works, auto-reconnect, 100+ tests |
| Phase 3 complete | Week 6 | Full admin API coverage, pagination |
| Phase 4 complete | Week 8 | Integration tests against sandbox, test utilities |
| Phase 5 complete | Week 11 | Codegen from DAR files, typed contract APIs |
| v1.0 release | Week 23 | Docs site, examples, React hooks, 90%+ coverage |
