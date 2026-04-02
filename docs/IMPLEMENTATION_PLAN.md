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
| Phase 7: React | **COMPLETE** | 237 (192 + 29 + 16) | CantonProvider, hooks, TanStack Query, polling stream |
| Phase 8: Docs & Polish | **COMPLETE** | 237 | VitePress site, guides, API ref, migration guide, CHANGELOG |

Test counts: 192 in core `cantonjs` package, 29 in `packages/cantonjs-codegen`, 16 in `packages/cantonjs-react`.

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
| 0008 | React integration architecture | 7 |

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
| (pending) | 7 | React integration: cantonjs-react hooks package |
| (pending) | 8 | Documentation site, CHANGELOG, bundle size audit |

---

## Next: Phase 8 — Documentation & Release

---

## Next: Phase 9 — Ecosystem & Community

**Priority:** LOW
**Complexity:** Ongoing
**Depends on:** Phase 8

---

## Immediate Action Items

1. **Integration tests** — Run against Canton sandbox with cantonctl
2. **cantonctl codegen integration** — `cantonctl build` → cantonjs-codegen pipeline
3. **Version bump to 1.0.0** — After ecosystem validation

---

## Success Metrics

| Milestone | Target | Metric |
|-----------|--------|--------|
| Phase 5 complete | ✅ Done | 200 tests, codegen from DAR files |
| Phase 6 complete | ✅ Done | 221 tests, interactive submission, gRPC, reassignment |
| Phase 7 complete | ✅ Done | 237 tests, React hooks, TanStack Query integration |
| Phase 8 complete | ✅ Done | VitePress docs site, CHANGELOG, migration guide |
| v1.0 release | After validation | Integration tests, ecosystem tooling |
