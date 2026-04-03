# Changelog

All notable changes to cantonjs are documented in this file.

## [Unreleased]

## [0.2.0] - 2026-04-02

### Added

- **Documentation site** — VitePress-powered docs with getting started guide, API reference, examples, and migration guide from `@daml/ledger`
- Bundle size audit: core 5.08 KB, ledger subpath 1.1 KB (minified + brotli)
- Splice package architecture: `cantonjs-splice-scan`, `cantonjs-splice-validator`, `cantonjs-splice-interfaces`, `cantonjs-splice-token-standard`, and `cantonjs-wallet-adapters`
- Explicit stability tiers for Splice support: GA, legacy compatibility, and experimental
- Migration notes and compatibility policy pinned to Canton `3.4.x` and Splice `0.5.x`, with vendored Splice artifacts at `0.5.17`

### Changed

- The core `cantonjs` package remains the GA Canton Ledger API V2 foundation while Splice-specific APIs live in focused add-on packages
- Legacy `wallet-external` validator flows are now documented as legacy compatibility only and are not recommended for new transfer flows
- The release workflow now explicitly publishes the new Splice packages instead of limiting release automation to the root, codegen, and React packages

## [0.0.1] - 2026-04-01

### Added

#### Phase 0: Foundation
- Package scaffolding with ESM + CJS dual build (tsup)
- Subpath exports: `cantonjs/ledger`, `cantonjs/admin`, `cantonjs/testing`, `cantonjs/chains`, `cantonjs/codegen`
- CI pipeline: lint, type-check, test, bundle size tracking (Node.js 18 + 22)
- `Transport` interface with `jsonApi()` HTTP transport
- `CantonjsError` hierarchy with error codes (CJ1xxx-CJ6xxx), `metaMessages`, `docsPath`, `walk()`
- Chain definitions: `localNet`, `devNet`, `testNet`, `mainNet`
- ADRs 0001-0004: function exports, transport abstraction, party-scoped clients, error model

#### Phase 1: LedgerClient Core
- `createLedgerClient()` factory — party-scoped contract operations
- Contract operations: `createContract`, `exerciseChoice`, `queryContracts`
- Transaction queries: `getTransactionById`, `getTransactionByOffset`, `getEventsByContractId`
- State queries: `getLedgerEnd`, `getConnectedSynchronizers`
- JWT token management and AbortSignal support

#### Phase 2: Streaming
- WebSocket streaming with AsyncIterator pattern
- `streamUpdates()` — transaction update stream with auto-reconnect
- `streamContracts()` — active contract snapshot stream
- `streamCompletions()` — command completion stream
- Exponential backoff reconnect (1s initial, 30s max, 2x factor, +/-25% jitter)
- Offset-based stream resumption
- ADR 0005: streaming architecture

#### Phase 3: AdminClient
- `createAdminClient()` factory — node administration
- Party management: `allocateParty`, `listParties`, `getParty`, `updateParty`
- User management: `createUser`, `getUser`, `listUsers`, `deleteUser`, `grantRights`, `revokeRights`
- Package management: `uploadDar`, `listPackages`, `getPackage`, `validateDar`
- Package vetting: `getVettedPackages`, `updateVettedPackages`
- Identity Provider management: CRUD for IDP configs
- Pagination: `PaginatedResult<T>` with `page_size`/`page_token`

#### Phase 4: TestClient
- `createTestClient()` factory — extends LedgerClient + AdminClient
- `setupCantonSandbox()` — vitest fixture with cantonctl integration
- `createMockTransport()` — response sequences, error injection, call assertions
- `createRecordingTransport()` — request/response recording for replay
- Time manipulation: `getTime`, `setTime`, `advanceTime`
- ADR 0006: testing strategy

#### Phase 5: Codegen
- `cantonjs-codegen` CLI package — DAR-to-TypeScript code generation
- DAR parsing: ZIP extraction, DALF protobuf decoding, intern table resolution
- Type generation: records, variants, enums, templates with choices
- Runtime support: `TemplateDescriptor`, `InferPayload`, `InferChoiceArgs`
- ADR 0007: codegen architecture

#### Phase 6: Advanced Features
- Interactive submission: `prepareSubmission`, `executeSubmission` (external signing)
- Reassignment: `submitReassignment` with typed `AssignedEvent`/`UnassignedEvent`
- `grpc()` transport — zero-dependency via injected ConnectRPC client
- `fallback()` transport — failover with retry on connection errors
- Node.js 18 UUID compatibility fix

#### Phase 7: React Integration
- `cantonjs-react` package — React hooks for Canton dApps
- `CantonProvider` — context provider wrapping TanStack QueryClientProvider
- `useContracts()` — query hook with automatic caching
- `useCreateContract()` — mutation hook with cache invalidation
- `useExercise()` — mutation hook with cache invalidation
- `useStreamContracts()` — polling-based streaming hook
- `useCantonClient()` / `useParty()` — context access hooks
- ADR 0008: React integration architecture

### Test Coverage
- 237 tests across 3 packages (192 core + 29 codegen + 16 React)
- All tests passing on Node.js 18 and 22
