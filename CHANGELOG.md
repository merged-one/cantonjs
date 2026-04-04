# Changelog

All notable changes to cantonjs are documented in this file.

## [Unreleased]

### Changed

- **Positioning reset:** the repo is now documented explicitly as the application-side TypeScript SDK for direct Canton participant Ledger API V2 work.
  New docs include named target users, package-boundary guidance, persona-led examples, and CI guards against messaging drift.
- **Package mental model** is now explicit:
  `cantonjs` is the core SDK;
  `cantonjs-react` and `cantonjs-codegen` are optional convenience packages;
  public/stable Splice surfaces live in focused add-ons;
  `cantonjs-wallet-adapters` remains experimental edge interop.
- **Splice add-on scope:** selected stable/public Splice support is now documented as add-on scope only.
  Internal validator routes, wallet-internal flows, and other private operator surfaces remain outside the main GA story.
- **Migration notes** for the positioning reset now cover the canonical role of DPM, Quickstart, the official dApp SDK / dApp API / Wallet Gateway, and the official Wallet SDK.

### Unchanged

- No runtime API names changed as part of the positioning reset.
- Existing package entrypoints remain the same.
  This milestone changes repo story, package boundaries, examples, and release guidance rather than expanding the runtime surface.

## [0.3.1] - 2026-04-03

### Fixed

- The release workflow now publishes Splice packages from their package directories instead of invoking `npm publish` through `--prefix`, which attempted to republish the root `cantonjs` package
- Release workflow documentation tests now assert the explicit Splice package allowlist against the current `cd ... && npm publish` workflow structure

## [0.3.0] - 2026-04-03

### Added

- Splice package architecture: `cantonjs-splice-scan`, `cantonjs-splice-validator`, `cantonjs-splice-interfaces`, `cantonjs-splice-token-standard`, and `cantonjs-wallet-adapters`
- Public Splice support packages for Scan, validator, interfaces, token-standard helpers, and wallet adapters
- Explicit stability tiers for Splice support: GA, legacy compatibility, and experimental
- Migration notes and compatibility policy pinned to Canton `3.4.x` and Splice `0.5.x`, with vendored Splice artifacts at `0.5.17`
- Auth provider abstraction for core transports
- Expanded network presets and Splice-focused documentation examples
- README snippet validation to keep documented TypeScript examples syntax-checked in CI

### Changed

- The core `cantonjs` package remains the GA Canton Ledger API V2 foundation while Splice-specific APIs live in focused add-on packages
- Legacy `wallet-external` validator flows are now documented as legacy compatibility only and are not recommended for new transfer flows
- The release workflow now explicitly publishes the new Splice packages instead of limiting release automation to the root, codegen, and React packages
- CI parity is tighter across packages with enforced documented coverage exclusions and repo-wide 100% coverage gates

### Fixed

- Token-standard package tests now resolve sibling sources on fresh checkouts instead of requiring prebuilt `dist/` artifacts
- `setupCantonSandbox()` now treats blank auth tokens as missing and falls back to `cantonctl auth token`
- README examples now match the current codegen, mock transport, React, and sandbox testing APIs

## [0.2.0] - 2026-04-02

### Added

- **Documentation site** — VitePress-powered docs with getting started guide, API reference, examples, and migration guide from `@daml/ledger`
- Bundle size audit: core 5.08 KB, ledger subpath 1.1 KB (minified + brotli)

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
