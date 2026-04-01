# cantonjs Roadmap

> Development plan for cantonjs — "viem for Canton."
> Phases are sequenced to deliver value incrementally while building toward full Canton Ledger API V2 coverage.

**Date:** 2026-04-01
**Author:** Charles Dusek

---

## Current State

- **Phases 0–5 complete** (200 tests passing, CI green)
- Core library: LedgerClient, AdminClient, TestClient, streaming, codegen runtime
- Separate `cantonjs-codegen` package for DAR-to-TypeScript generation
- ADRs 0001–0007 written
- Next up: Phase 6 (Advanced Features)

---

## Phase 0: Foundation (Weeks 1-2)

> Project scaffolding, build system, CI/CD, core abstractions.

### Deliverables
- [ ] Package scaffolding (package.json, tsconfig, vitest, ESLint, Prettier)
- [ ] Build system (tsup — ESM + CJS dual output)
- [ ] Subpath exports structure (`cantonjs/ledger`, `cantonjs/admin`, `cantonjs/testing`, `cantonjs/chains`)
- [ ] CI pipeline (GitHub Actions: lint, type-check, test, bundle size tracking)
- [ ] CLAUDE.md with architecture rules
- [ ] llms.txt for AI-readability
- [ ] Core types: `Transport`, `Client`, `CantonjsError`, Canton data model types
- [ ] Transport abstraction: `jsonApi({ url })` with HTTP client
- [ ] Error hierarchy: `CantonjsError` base with `walk()`, `docsPath`, `metaMessages`
- [ ] Chain definitions: `localNet`, `devNet`, `testNet`, `mainNet`

### ADRs to Write
- 0001: TypeScript with function exports
- 0002: Transport abstraction (JSON API primary, gRPC optional)
- 0003: Party-scoped client architecture
- 0004: Error model aligned with cantonctl

### Exit Criteria
- `npm run build` produces ESM + CJS bundles
- `npm test` passes with core type tests
- Bundle size baseline established and tracked in CI

---

## Phase 1: LedgerClient Core (Weeks 3-5)

> Implement the primary client for contract operations — the heart of cantonjs.

### Deliverables
- [ ] `createLedgerClient({ party, token, transport })` factory
- [ ] Command submission: `submitAndWait`, `submitAndWaitForTransaction`
- [ ] Contract operations: `createContract(template, payload)`, `exerciseChoice(contractId, choice, args)`
- [ ] Active contract queries: `queryContracts(template, filter?)`
- [ ] Event queries: `getEventsByContractId(contractId)`
- [ ] Transaction lookups: `getTransactionById`, `getTransactionByOffset`
- [ ] State queries: `getLedgerEnd`, `getConnectedSynchronizers`
- [ ] JWT token management: token injection, expiry detection
- [ ] Request/response type definitions for all Ledger API V2 endpoints

### ADRs to Write
- 0005: Request/response type mapping strategy
- 0006: Command deduplication approach

### Exit Criteria
- Can create contracts, exercise choices, and query active contracts against a Canton sandbox
- All LedgerClient methods have unit tests (mock transport) and integration tests (sandbox)
- Type-safe request/response types for all wrapped endpoints

---

## Phase 2: Streaming & WebSocket (Weeks 6-7)

> Real-time contract subscriptions — critical for dApp UIs.

### Deliverables
- [ ] WebSocket transport layer for JSON API V2
- [ ] `streamContracts(template, filter?)` — active contract stream
- [ ] `streamUpdates(beginOffset)` — transaction update stream (flat + tree)
- [ ] `streamCompletions(parties)` — command completion stream
- [ ] Auto-reconnect with exponential backoff
- [ ] Offset tracking for stream resumption
- [ ] AbortSignal support for stream cancellation (aligns with cantonctl pattern)

### Exit Criteria
- Streams reconnect automatically after network interruption
- Streams resume from last offset after reconnection
- Integration tests verify streaming against Canton sandbox

---

## Phase 3: AdminClient & Package Management (Weeks 8-9)

> Node administration capabilities for tooling and infrastructure.

### Deliverables
- [ ] `createAdminClient({ token, transport })` factory
- [ ] Party management: `allocateParty`, `listParties`, `getParty`, `updateParty`
- [ ] User management: `createUser`, `getUser`, `listUsers`, `deleteUser`, `grantRights`, `revokeRights`
- [ ] Package management: `uploadDar`, `listPackages`, `getPackage`, `validateDar`
- [ ] Package vetting: `updateVettedPackages`
- [ ] Version service: `getLedgerApiVersion`

### Exit Criteria
- Can allocate parties, manage users, and upload DARs programmatically
- AdminClient integrates cleanly with cantonctl workflows (shared JWT, same Canton instance)

---

## Phase 4: TestClient & Testing Utilities (Weeks 10-11)

> First-class testing support — a key differentiator.

### Deliverables
- [ ] `createTestClient({ transport })` factory extending LedgerClient + AdminClient
- [ ] Sandbox lifecycle: `startSandbox()`, `stopSandbox()`, `resetSandbox()`
- [ ] Time manipulation: `getTime()`, `setTime()`, `advanceTime(duration)`
- [ ] Party helpers: `allocateParties(['Alice', 'Bob', 'Charlie'])`
- [ ] Vitest integration: `setupCantonSandbox()` fixture
- [ ] Jest integration: `setupCantonSandbox()` fixture
- [ ] Mock transport: recorded response replay for unit tests

### ADRs to Write
- 0007: Testing strategy (sandbox integration + mock transport)

### Exit Criteria
- dApp developers can write tests with `createTestClient` and have sandbox lifecycle managed automatically
- Test helpers work with both vitest and jest
- cantonjs's own test suite demonstrates the testing patterns

---

## Phase 5: Codegen & Type Generation (Weeks 12-14)

> TypeScript type generation from Daml models — closing the type safety loop.

### Deliverables
- [ ] `cantonjs-codegen` CLI tool (separate package if deps are heavy)
- [ ] DAR file parsing (extract Daml-LF packages)
- [ ] Type generation: Daml records → TypeScript interfaces
- [ ] Type generation: Daml variants → discriminated unions
- [ ] Type generation: Daml enums → string union types
- [ ] Type generation: Daml templates → typed contract + choice functions
- [ ] Template companion objects with `as const` support
- [ ] `cantonjs/codegen` runtime support module
- [ ] Integration with `cantonctl build` pipeline

### ADRs to Write
- 0008: Codegen architecture and output format

### Exit Criteria
- Given a DAR file, generates TypeScript types that provide full autocomplete for template fields and choice arguments
- Generated types work seamlessly with `createContract<T>` and `exerciseChoice<T, C>` generics
- Codegen integrates with cantonctl's build pipeline

---

## Phase 6: Advanced Features (Weeks 15-17)

> Interactive submission, reassignment, gRPC transport.

### Deliverables
- [ ] Interactive submission: `prepareSubmission`, `executeSubmission` (external signing)
- [ ] Signature utilities for external signing workflow
- [ ] Reassignment support: `submitReassignment` (cross-synchronizer)
- [ ] gRPC transport via ConnectRPC: `grpc({ url })`
- [ ] Fallback transport: `fallback([transport1, transport2])`
- [ ] IDP management: identity provider CRUD
- [ ] CIP-56 helpers: token holding queries, transfer instruction builders

### Exit Criteria
- External signing workflow works end-to-end
- gRPC transport passes same test suite as JSON API transport
- Fallback transport correctly handles primary failure

---

## Phase 7: React Integration (Weeks 18-20)

> `cantonjs-react` — React hooks for Canton dApps.

### Deliverables
- [ ] `cantonjs-react` package (separate npm package)
- [ ] `CantonProvider` context component
- [ ] `useContracts(template, filter?)` — query hook with caching
- [ ] `useExercise(template, choice)` — mutation hook
- [ ] `useCreateContract(template)` — mutation hook
- [ ] `useParty()` — current party context
- [ ] `useStreamContracts(template, filter?)` — streaming subscription hook
- [ ] `useLedgerClient()` — escape hatch for direct client access
- [ ] TanStack Query integration (peer dependency)
- [ ] Optimistic update support for exercises
- [ ] CIP-0103 wallet connection hook: `useWalletConnect()`

### ADRs to Write
- 0009: React integration architecture (three-layer pattern)

### Exit Criteria
- React developers can build Canton dApps with familiar hook patterns
- TanStack Query provides automatic caching, deduplication, and refetching
- Streaming hooks auto-reconnect and update UI in real-time

---

## Phase 8: Documentation & Polish (Weeks 21-23)

> Production-ready documentation, examples, and DX polish.

### Deliverables
- [ ] Documentation site (VitePress or Starlight)
- [ ] Getting started guide
- [ ] API reference (auto-generated from TSDoc)
- [ ] Migration guide from @daml/ledger
- [ ] Example projects: basic contract interaction, streaming dApp, full-stack with React
- [ ] Bundle size optimization audit
- [ ] Performance benchmarks (JSON API vs gRPC)
- [ ] CHANGELOG.md
- [ ] Version bump to 1.0.0
- [ ] Agentic documentation system (aligned with cantonctl's approach)
- [ ] MCP server for cantonjs operations

### Exit Criteria
- Documentation site live with complete API reference
- Example projects demonstrate all major use cases
- Bundle size tracked and optimized

---

## Phase 9: Ecosystem & Community (Ongoing)

> Growing the Canton developer ecosystem.

### Deliverables
- [ ] Integration with cantonctl's `init` templates (scaffold projects that use cantonjs)
- [ ] Integration with `create-canton-app` scaffolding
- [ ] VS Code extension support (TypeScript language service for generated types)
- [ ] Plugin system for custom transports and middleware
- [ ] Community template contributions
- [ ] Conference talks and blog posts

### Success Metrics (6 months)
- 500+ weekly npm downloads
- 50+ projects using cantonjs
- 200+ GitHub stars

### Success Metrics (24 months)
- 5,000+ weekly npm downloads
- 500+ projects
- 2,000+ GitHub stars
- cantonjs-react used in majority of Canton dApps

---

## Dependencies & Coordination

### cantonctl Integration Points
| cantonctl Feature | cantonjs Dependency |
|-------------------|---------------------|
| `cantonctl auth` JWT generation | cantonjs consumes same JWT format |
| `cantonctl build` DAR output | cantonjs codegen consumes DAR files |
| `cantonctl dev` sandbox | cantonjs TestClient connects to sandbox |
| `cantonctl test` framework | cantonjs testing utilities complement it |
| `cantonctl deploy` pipeline | cantonjs AdminClient can verify deployments |
| Error code ranges E1xxx-E8xxx | cantonjs uses complementary ranges |

### External Dependencies
| Dependency | Purpose | Phase |
|-----------|---------|-------|
| Canton sandbox | Integration testing | 1+ |
| ConnectRPC (connect-es) | gRPC transport | 6 |
| TanStack Query | React hooks | 7 |
| tsup / unbuild | ESM + CJS builds | 0 |
| size-limit | Bundle tracking | 0 |
| vitest | Testing | 0 |

---

## Resource Estimate

| Phase | Effort | Cumulative |
|-------|--------|-----------|
| Phase 0: Foundation | 2 weeks | 2 weeks |
| Phase 1: LedgerClient | 3 weeks | 5 weeks |
| Phase 2: Streaming | 2 weeks | 7 weeks |
| Phase 3: AdminClient | 2 weeks | 9 weeks |
| Phase 4: TestClient | 2 weeks | 11 weeks |
| Phase 5: Codegen | 3 weeks | 14 weeks |
| Phase 6: Advanced | 3 weeks | 17 weeks |
| Phase 7: React | 3 weeks | 20 weeks |
| Phase 8: Docs & Polish | 3 weeks | 23 weeks |
| Phase 9: Ecosystem | Ongoing | — |

**Estimated time to v1.0:** ~23 weeks (single developer)
