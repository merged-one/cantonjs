# Implementation Plan

> Concrete next steps for cantonjs, prioritized and sequenced.
> This is a living document — update as work progresses.

**Date:** 2026-04-01
**Author:** Charles Dusek

---

## Current State

| Phase | Status | Tests | Notes |
|-------|--------|-------|-------|
| Phase 0: Foundation | **COMPLETE** | 74 passing | ESLint, build, size tracking all working |
| Phase 1: LedgerClient Core | **COMPLETE** | 74 passing | All client methods implemented and tested |
| Phase 2: Streaming | **COMPLETE** | 128 passing | AsyncIterable streams, auto-reconnect, offset tracking |
| Phase 3: AdminClient | **COMPLETE** | 142 passing | Pagination, IDP, package vetting, state queries |
| Phase 4: TestClient | **COMPLETE** | 164 passing | Sandbox fixture, mock/recording transport, cantonctl integration |
| Phase 5: Codegen | **COMPLETE** | 200 passing | DAR parser, type mapper, code emitter, CLI, cantonjs-codegen package |

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

## Step 7: Phase 6 — Advanced Features

**Priority:** HIGH
**Complexity:** L (1-2 weeks)
**Depends on:** Step 6

### Work Items

#### 7a. Interactive Submission (External Signing)
- `prepareSubmission(commands)` — returns a prepared submission with hash to sign
- `executeSubmission(prepared, signature)` — submit with external signature
- Supports HSM and hardware wallet workflows
- Files: `src/ledger/interactiveSubmission.ts`, tests

#### 7b. Reassignment Support
- `submitReassignment({ contractId, source, target })` — cross-synchronizer transfer
- `unassignContract()` + `assignContract()` — two-step reassignment
- Files: `src/ledger/reassignment.ts`, tests

#### 7c. gRPC Transport (ConnectRPC)
- `grpc({ url })` transport factory using connect-es
- Must pass same test suite as JSON API transport
- Files: `src/transport/grpc.ts`, `src/transport/grpc.test.ts`

#### 7d. Fallback Transport
- `fallback([primary, secondary])` — tries primary, falls back to secondary
- Files: `src/transport/fallback.ts`, tests

### Exit Criteria
- Interactive submission works end-to-end
- gRPC transport passes full test suite
- Reassignment tested with mock transport

---

## Step 8: Phase 7 — React Integration

**Priority:** MEDIUM
**Complexity:** L (1-2 weeks)
**Depends on:** Step 7

### Work Items

#### 8a. Package Scaffold
- `packages/cantonjs-react/` — separate npm package
- Peer deps: react 18+, @tanstack/react-query 5+, cantonjs
- Files: package.json, tsconfig, barrel exports

#### 8b. Context Provider
- `CantonProvider` — wraps QueryClientProvider + canton config
- `useCantonClient()` — access LedgerClient from context
- `useParty()` — current party identity

#### 8c. Query Hooks
- `useContracts(template, filter?)` — TanStack Query wrapper for queryContracts
- `useContractById(contractId)` — single contract lookup
- `useStreamContracts(template, filter?)` — streaming subscription via useEffect + AsyncIterator

#### 8d. Mutation Hooks
- `useCreateContract(template)` — returns `{ create, isPending, error }`
- `useExercise(template, choice)` — returns `{ exercise, isPending, error }`
- Optimistic update support via TanStack Query's `onMutate`

### Exit Criteria
- React developers can build Canton dApps with familiar hook patterns
- TanStack Query provides caching/deduplication
- Streaming hooks auto-update UI

---

## Step 9: Phase 8 — Documentation & Release

**Priority:** MEDIUM
**Complexity:** M (1 week)
**Depends on:** Step 8

### Work Items
- Documentation site (VitePress or Starlight)
- Getting started guide, API reference
- Migration guide from @daml/ledger
- Example projects: basic CLI, streaming dApp, React full-stack
- Bundle size audit and optimization
- Version bump to 1.0.0

---

## Immediate Action Items

1. **Begin Phase 6** — Interactive submission and gRPC transport
2. **Add integration tests** — Run against Canton sandbox with cantonctl
3. **Plan cantonctl codegen integration** — `cantonctl build` → cantonjs-codegen pipeline

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
