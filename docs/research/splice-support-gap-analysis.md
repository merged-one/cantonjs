# Splice Support Gap Analysis

**Date:** 2026-04-02
**Related ADR:** [ADR 0009](../adr/0009-splice-full-support-architecture.md)

## Purpose

This document inventories what cantonjs already has, what Splice support would require, and which pieces should remain out of scope until the ADR-driven implementation phases start.

## Current Repo Coverage

### Core runtime

- `src/index.ts` exports the current GA surface for clients, transport, errors, chains, streaming, and codegen runtime types.
- `src/clients/createLedgerClient.ts` already covers the ledger interaction model that token-standard helpers should build on.
- `src/clients/createAdminClient.ts` and `src/clients/createTestClient.ts` cover Canton admin and sandbox flows, not Splice app APIs.
- `src/transport/` already provides the right seam for Scan or Validator HTTP clients.
- `src/chains/definitions.ts` already contains an optional `scanUrl`, which is a useful anchor for future public Scan support.

### Extra packages

- `packages/cantonjs-codegen/` can already generate Daml-based TypeScript and is the natural place to improve stable token-interface ergonomics.
- `packages/cantonjs-react/` is intentionally generic and should remain downstream of the core Splice runtime rather than becoming the first integration surface.

### CI and docs

- Root CI runs `typecheck`, `lint`, `test`, `build`, and `size`.
- Existing ADRs define the current architectural baseline through React integration.

## What Is Missing for Splice

### Token standard

Missing today:

- stable typed helpers for CIP-0056 interfaces
- token-standard transaction parsers and contract selectors
- high-level factory and non-factory choice helpers built on the existing ledger client
- fixtures or golden tests that validate stable token-standard payload shapes

Why this is the first target:

- upstream docs say token-standard integrations work directly through the validator Ledger API
- upstream docs also say older wallet-specific workflows are being replaced by token-standard workflows

### Scan

Missing today:

- a public Scan client
- typed response models for documented external Scan endpoints
- chain metadata population from public Scan endpoints
- explicit exclusion of internal/deprecated Scan endpoints from GA exports

### Validator

Missing today:

- a validator HTTP client abstraction
- classification of public vs internal validator endpoints
- a stable command model for validator-specific write operations
- explicit experimental fences for wallet-internal or validator-internal endpoints

### Wallet interop

Missing today:

- CIP-0103-specific adapters or examples
- any interop layer with `splice-wallet-kernel`
- policy for when external-party or wallet-provider flows are stable enough for GA support

## Key Gaps by Existing Module

| Area | Current state | Gap for Splice support |
|---|---|---|
| `src/clients/` | Ledger/Admin/Test are Canton-native only | Need Splice-specific clients layered on the same transport model |
| `src/transport/` | Generic transport seam exists | Need Scan/Validator clients using the same seam, not bespoke fetch code |
| `src/chains/definitions.ts` | `scanUrl` exists, network URLs mostly placeholders outside localnet | Need environment-aware public Splice metadata and documentation |
| `src/codegen/` + `packages/cantonjs-codegen/` | Generic Daml type support | Need stable token-interface ergonomics, fixtures, and examples |
| `packages/cantonjs-react/` | Generic ledger hooks and polling stream | Need to wait until core Splice APIs settle before adding Splice hooks |
| docs | Broad Canton coverage | Need Splice-specific guides, API docs, and experimental policy docs |

## Risks

### Architecture risk

Using `splice-wallet-kernel` as the primary dependency would force cantonjs to inherit gateway, provider, and wallet-kernel abstractions that do not match the current repo's transport-first design.

### Stability risk

Splice docs explicitly distinguish external/public APIs from internal/deprecated ones. Any attempt to flatten those distinctions into a single GA surface would create avoidable churn.

### Scope risk

"Full Splice support" can easily expand into wallet-gateway internals, signing-provider integrations, validator operations, and package-specific Daml workflows. ADR 0009 narrows the first stable path to token standard plus documented public APIs.

## Recommended Write Scope for the Next Implementation Milestones

1. Add `src/splice/token-standard/` first.
2. Add `src/splice/scan/` second, but only for public/external endpoints.
3. Add `src/splice/validator/` only after public endpoint classification is frozen.
4. Add `src/splice/experimental/` for internal/deprecated or kernel-interop work.
5. Delay `packages/cantonjs-react/` additions until at least token-standard and Scan runtime APIs stabilize.

## Commands Run for This Planning Pass

- `git fetch origin`
- `git checkout main`
- `git pull --ff-only origin main`
- `git checkout -b feat/splice-full-support-cantonjs`
- `git status`
- `find src packages docs .github/workflows -maxdepth 3 -type f | sort | sed -n '1,250p'`
- `git grep -n "createLedgerClient\\|createAdminClient\\|createTestClient\\|streamUpdates\\|json-api\\|fallback\\|localNet\\|devNet\\|testNet\\|mainNet"`
- `npm test`
- `npm run typecheck`
- `npm run build`

## Baseline Result

- root `npm test`: passed, 192 tests
- root `npm run typecheck`: passed
- root `npm run build`: passed

No production implementation code was added in this pass.
