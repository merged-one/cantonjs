# Implementation Plan

> Concrete next steps for cantonjs, prioritized and sequenced.
> This is a living document — update as work progresses.

**Date:** 2026-04-01
**Author:** Charles Dusek

---

## Current State

| Phase | Status | Tests (cumulative) | Notes |
|-------|--------|-------------------|-------|
| Phase 0: Foundation | **COMPLETE** | 74 | ESLint, build, size tracking, core abstractions |
| Phase 1: LedgerClient Core | **COMPLETE** | 74 | All client methods implemented and tested |
| Phase 2: Streaming | **COMPLETE** | 128 | AsyncIterable streams, auto-reconnect, offset tracking |
| Phase 3: AdminClient | **COMPLETE** | 142 | Pagination, IDP, package vetting, state queries |
| Phase 4: TestClient | **COMPLETE** | 171 | Sandbox fixture, mock/recording transport, cantonctl integration |
| Phase 5: Codegen | **COMPLETE** | 200 (171 + 29) | DAR parser, type mapper, code emitter, CLI (`cantonjs-codegen` package) |
| Phase 6: Advanced | **COMPLETE** | 221 (192 + 29) | Fallback/gRPC transports, reassignment, interactive submission |

Test counts: 192 in core `cantonjs` package, 29 in `packages/cantonjs-codegen`.

### ADRs Written

| ADR | Topic | Phase |
|-----|-------|-------|
| 0001 | TypeScript with function exports | 0 |
| 0002 | Transport abstraction (JSON API primary, gRPC optional) | 0 |
| 0003 | Party-scoped client architecture | 0 |
| 0004 | Structured error model aligned with cantonctl | 0 |
| 0005 | Streaming architecture (AsyncIterator pattern) | 2 |
| 0006 | Testing strategy (sandbox + mock transport) | 4 |
| 0007 | Codegen architecture and output format | 5 |

### Key Commits

| Commit | Phase | Description |
|--------|-------|-------------|
| `77f8b7a` | 0 | Project foundation with core abstractions |
| `e4dddbc` | 1 | Full test coverage for all clients |
| `ed03c24` | 2 | WebSocket streaming with AsyncIterable pattern |
| `036bdfa` | 3 | AdminClient pagination, IDP, package vetting |
| `c7df451` | 4 | Testing utilities with cantonctl integration |
| `69daf36` | 5 | Codegen pipeline for DAR-to-TypeScript generation |
| `6779c5e` | 6 | Advanced features: transports, reassignment, interactive submission |

---

## Next: Phase 7 — React Integration

**Priority:** MEDIUM
**Complexity:** L (1-2 weeks)
**Depends on:** Phase 6

### 7a. Package Scaffold
- `packages/cantonjs-react/` — separate npm package
- Peer deps: react 18+, @tanstack/react-query 5+, cantonjs
- Files: package.json, tsconfig, barrel exports

### 7b. Context Provider
- `CantonProvider` — wraps QueryClientProvider + canton config
- `useCantonClient()` — access LedgerClient from context
- `useParty()` — current party identity

### 7c. Query Hooks
- `useContracts(template, filter?)` — TanStack Query wrapper for queryContracts
- `useContractById(contractId)` — single contract lookup
- `useStreamContracts(template, filter?)` — streaming subscription via useEffect + AsyncIterator

### 7d. Mutation Hooks
- `useCreateContract(template)` — returns `{ create, isPending, error }`
- `useExercise(template, choice)` — returns `{ exercise, isPending, error }`
- Optimistic update support via TanStack Query's `onMutate`

### ADR to Write
- 0008: React integration architecture (three-layer pattern)

### Exit Criteria
- React developers can build Canton dApps with familiar hook patterns
- TanStack Query provides caching/deduplication
- Streaming hooks auto-update UI

---

## Phase 8 — Documentation & Release

**Priority:** MEDIUM
**Complexity:** M (1 week)
**Depends on:** Phase 7

### Work Items
- Documentation site (VitePress or Starlight)
- Getting started guide, API reference
- Migration guide from @daml/ledger
- Example projects: basic CLI, streaming dApp, React full-stack
- Bundle size audit and optimization
- Version bump to 1.0.0

---

## Immediate Action Items

1. **Begin Phase 7** — React hooks package (`packages/cantonjs-react/`)
2. **Add integration tests** — Run against Canton sandbox with cantonctl
3. **Plan cantonctl codegen integration** — `cantonctl build` → cantonjs-codegen pipeline

---

## Success Metrics

| Milestone | Target | Metric |
|-----------|--------|--------|
| Phase 5 complete | ✅ Done | 200 tests, codegen from DAR files |
| Phase 6 complete | ✅ Done | 221 tests, interactive submission, gRPC, reassignment |
| Phase 7 complete | Next | React hooks, TanStack Query integration |
| v1.0 release | After 8 | Docs site, examples, 90%+ coverage |
