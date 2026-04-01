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
- [x] Package scaffolding (package.json, tsconfig, vitest, ESLint, Prettier)
- [x] Build system (tsup — ESM + CJS dual output)
- [x] Subpath exports structure (`cantonjs/ledger`, `cantonjs/admin`, `cantonjs/testing`, `cantonjs/chains`)
- [x] CI pipeline (GitHub Actions: lint, type-check, test, bundle size tracking)
- [x] CLAUDE.md with architecture rules
- [x] llms.txt for AI-readability
- [x] Core types: `Transport`, `Client`, `CantonjsError`, Canton data model types
- [x] Transport abstraction: `jsonApi({ url })` with HTTP client
- [x] Error hierarchy: `CantonjsError` base with `walk()`, `docsPath`, `metaMessages`
- [x] Chain definitions: `localNet`, `devNet`, `testNet`, `mainNet`

### ADRs Written
- 0001: TypeScript with function exports
- 0002: Transport abstraction (JSON API primary, gRPC optional)
- 0003: Party-scoped client architecture
- 0004: Error model aligned with cantonctl

### Exit Criteria — Met
- `npm run build` produces ESM + CJS bundles
- `npm test` passes with core type tests
- Bundle size baseline established and tracked in CI

---

## Phase 1: LedgerClient Core (Weeks 3-5)

> Implement the primary client for contract operations — the heart of cantonjs.

### Deliverables
- [x] `createLedgerClient({ party, token, transport })` factory
- [x] Command submission: `submitAndWait`, `submitAndWaitForTransaction`
- [x] Contract operations: `createContract(template, payload)`, `exerciseChoice(contractId, choice, args)`
- [x] Active contract queries: `queryContracts(template, filter?)`
- [x] Event queries: `getEventsByContractId(contractId)`
- [x] Transaction lookups: `getTransactionById`, `getTransactionByOffset`
- [x] State queries: `getLedgerEnd`, `getConnectedSynchronizers`
- [x] JWT token management: token injection, expiry detection
- [x] Request/response type definitions for all Ledger API V2 endpoints

### Exit Criteria — Met
- All LedgerClient methods implemented with unit tests (mock transport)
- Type-safe request/response types for all wrapped endpoints

---

## Phase 2: Streaming & WebSocket (Weeks 6-7)

> Real-time contract subscriptions — critical for dApp UIs.

### Deliverables
- [x] WebSocket transport layer for JSON API V2
- [x] `streamContracts(template, filter?)` — active contract stream
- [x] `streamUpdates(beginOffset)` — transaction update stream (flat + tree)
- [x] `streamCompletions(parties)` — command completion stream
- [x] Auto-reconnect with exponential backoff
- [x] Offset tracking for stream resumption
- [x] AbortSignal support for stream cancellation (aligns with cantonctl pattern)

### ADR Written
- 0005: Streaming architecture (AsyncIterator pattern)

### Exit Criteria — Met
- Streams reconnect automatically with exponential backoff (1s initial, 30s max, 2x factor, ±25% jitter)
- Streams resume from last offset after reconnection
- 46 streaming tests passing

---

## Phase 3: AdminClient & Package Management (Weeks 8-9)

> Node administration capabilities for tooling and infrastructure.

### Deliverables
- [x] `createAdminClient({ token, transport })` factory
- [x] Party management: `allocateParty`, `listParties`, `getParty`, `updateParty`
- [x] User management: `createUser`, `getUser`, `listUsers`, `deleteUser`, `grantRights`, `revokeRights`
- [x] Package management: `uploadDar`, `listPackages`, `getPackage`, `validateDar`
- [x] Package vetting: `getVettedPackages`, `updateVettedPackages`
- [x] Version service: `getLedgerApiVersion`
- [x] Pagination: `PaginatedResult<T>` with `page_size`/`page_token` for list endpoints
- [x] Identity Provider management: CRUD for IDP configs

### Exit Criteria — Met
- Full admin API coverage per Canton OpenAPI spec
- Pagination and IDP management functional

---

## Phase 4: TestClient & Testing Utilities (Weeks 10-11)

> First-class testing support — a key differentiator.

### Deliverables
- [x] `createTestClient({ transport })` factory extending LedgerClient + AdminClient
- [x] Sandbox lifecycle: `setupCantonSandbox()` with cantonctl integration
- [x] Time manipulation: `getTime()`, `setTime()`, `advanceTime(duration)`
- [x] Party helpers: `allocateParties(['Alice', 'Bob', 'Charlie'])`
- [x] Vitest integration: `setupCantonSandbox()` fixture
- [x] Mock transport: `createMockTransport()` with recorded response replay
- [x] Recording transport: `createRecordingTransport()` wrapper

### ADR Written
- 0006: Testing strategy (sandbox integration + mock transport)

### Exit Criteria — Met
- Sandbox fixture manages cantonctl lifecycle (start, health check, JWT, cleanup)
- Mock transport supports response sequences, error injection, and assertions
- 22 testing utility tests passing

---

## Phase 5: Codegen & Type Generation (Weeks 12-14)

> TypeScript type generation from Daml models — closing the type safety loop.

### Deliverables
- [x] `cantonjs-codegen` CLI tool (separate `packages/cantonjs-codegen/` package)
- [x] DAR file parsing (ZIP extraction of DALF files via JSZip)
- [x] DALF protobuf decoding with intern table resolution
- [x] Type generation: Daml records → TypeScript type aliases
- [x] Type generation: Daml variants → discriminated unions
- [x] Type generation: Daml enums → string union types
- [x] Type generation: Daml templates → companion const objects with templateId + choices
- [x] Template companion objects with `as const` support
- [x] `cantonjs/codegen` runtime support module (`TemplateDescriptor`, `InferPayload`, `InferChoiceArgs`)
- [ ] Integration with `cantonctl build` pipeline (deferred to Phase 6+)

### ADR Written
- 0007: Codegen architecture and output format

### Exit Criteria — Met
- CLI: `cantonjs-codegen --dar <path> --output <dir>`
- Type mapper: Daml-LF → TypeScript with precision preservation (Int64/Numeric → string)
- 29 codegen tests + 7 runtime type tests passing

---

## Phase 6: Advanced Features (Weeks 15-17)

> Interactive submission, reassignment, gRPC transport.

### Deliverables
- [x] Interactive submission: `prepareSubmission`, `executeSubmission` (external signing)
- [x] Signature types: `PartySignatures`, `Signature`, `SignatureFormat`
- [x] Reassignment support: `submitReassignment` with typed events
- [x] Reassignment types: `Reassignment`, `AssignedEvent`, `UnassignedEvent`, `ReassignmentCommand`
- [x] gRPC transport: `grpc({ url, grpcTransport })` — zero-dep via injected ConnectRPC client
- [x] Fallback transport: `fallback({ transports })` — retries on connection errors
- [ ] CIP-56 helpers: token holding queries, transfer instruction builders (deferred)
- [ ] cantonctl codegen integration: `cantonctl build` → cantonjs-codegen pipeline (deferred)

### Exit Criteria — Met
- Interactive submission prepare + execute working with mock transport
- Reassignment unassign + assign commands tested
- gRPC transport maps JSON API paths to gRPC service methods
- Fallback transport retries on ConnectionError/TimeoutError, throws on HttpError
- 21 new tests (192 total core)

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

### ADR to Write
- 0008: React integration architecture (three-layer pattern)

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
