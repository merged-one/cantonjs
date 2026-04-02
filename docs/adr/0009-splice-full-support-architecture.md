# ADR 0009: Splice Full-Support Architecture

**Status:** Accepted
**Date:** 2026-04-02
**Authors:** Charles Dusek

## Context

cantonjs already exposes a stable Canton Ledger API V2 core:

- `src/index.ts` exports the current public surface for `createLedgerClient`, `createAdminClient`, `createTestClient`, transports, chains, streaming, errors, and codegen runtime types.
- `src/clients/` is organized around party-scoped ledger access, admin operations, and sandbox testing.
- `src/transport/` provides the injected transport model (`jsonApi`, `grpc`, `fallback`) that everything else composes on top of.
- `src/chains/definitions.ts` already reserves a `scanUrl` field on `CantonChain`, but there is no Scan client yet.
- `packages/cantonjs-codegen/` and `packages/cantonjs-react/` are separate packages layered on top of the core package.

We now need a source-of-truth architecture for adding full Splice support without violating the existing design rules:

- function exports, not classes
- dependency injection through transports
- stable/public APIs first
- ESM-first, tree-shakeable subpath exports
- test-first implementation

The Splice surface is broader than the Canton Ledger API. It includes:

- stable standards and public docs, especially the Canton Network Token Standard (CIP-0056) and wallet interoperability boundaries such as CIP-0103
- public Splice HTTP APIs such as Scan and Validator endpoints
- product-specific Daml packages and HTTP endpoints that are explicitly internal or deprecated

The Splice docs make the direction clear:

- token-standard integrations work through the validator's Ledger API
- `splice-wallet` and `splice-wallet-payments` contain CC-specific workflows that are being replaced by token-standard workflows
- Scan documentation separates `external`, `internal`, and `deprecated` API references
- `splice-wallet-kernel` is a useful TypeScript ecosystem project, but its own README describes it as active early development rather than a finished stable foundation

## Baseline Status

This ADR is written on top of `origin/main` fast-forwarded locally on 2026-04-02.

Requested baseline commands were run before any production changes:

- `npm test` -> passed, 17 test files and 192 tests green
- `npm run typecheck` -> passed
- `npm run build` -> passed

These were the requested root-package checks only. No new runtime code was added in this milestone.

## Decision

Build Splice support natively in cantonjs on top of the existing transport, client, error, and subpath-export architecture.

Do not make `splice-wallet-kernel` the primary runtime dependency or abstraction layer for cantonjs.

Instead:

1. GA support in cantonjs must target stable/public surfaces directly.
2. Internal, deprecated, or product-specific Splice surfaces may exist only behind explicitly experimental imports.
3. The first stable Splice milestone is the token-standard path, not wallet-kernel interop.
4. We keep the existing single-package runtime strategy for core functionality and add subpaths instead of introducing new runtime npm packages immediately.

## Stable vs Unstable Surface Classification

| Surface | Examples | Classification | cantonjs policy |
|---|---|---|---|
| Canton Ledger API V2 and current core exports | `createLedgerClient`, `createAdminClient`, `createTestClient`, `jsonApi`, `streamUpdates`, existing chains | Stable/public | Remains GA and unchanged as the foundation |
| Stable Daml interfaces and standards | CIP-0056 token-standard interfaces, other standards-backed Daml interfaces | Stable/public target | Prefer for new GA Splice features |
| Public/external Splice HTTP APIs | documented external Scan endpoints, documented external validator endpoints | Public but product-specific | Eligible for GA only endpoint-by-endpoint after typed coverage and compatibility tests |
| Wallet interoperability boundaries | CIP-0103 provider integration, external-party auth boundaries | Public interop | Support as adapters at the boundary, but do not let them define the core runtime model |
| Additional Splice Daml APIs that are not standards-backed | `splice-wallet`, `splice-wallet-payments`, `splice-api-token-burn-mint-v1`, validator-specific workflow packages | Product-specific / unstable | Experimental-only until they have a stable public compatibility story |
| Internal or deprecated Splice HTTP APIs | Scan `internal`, Scan `deprecated`, internal user wallet APIs, deprecated transfer-offer flows | Internal/unstable | Experimental-only, never root-exported, must be called out in docs as unstable |

## GA vs Experimental Policy

Splice features may be marked GA only if all of the following are true:

1. The source surface is a stable standard, a Ledger API V2 endpoint, or a documented public/external Splice API.
2. The feature can be expressed using cantonjs's existing transport and error model without special hidden state.
3. The feature has deterministic unit-test coverage with injected transports.
4. The feature does not require consumers to understand Splice internals such as wallet-gateway stores, signing backends, or validator-private contracts.

A feature must remain experimental if any of the following are true:

1. The upstream docs label it `internal` or `deprecated`.
2. The feature depends on package-specific Splice workflows that upstream docs say are being replaced by token-standard workflows.
3. The only practical implementation path is through a still-evolving SDK or kernel layer rather than a stable public API.
4. The feature requires unstable Daml package names, package-specific template layouts, or validator-private operational assumptions.

Operational rule: internal Splice APIs may be implemented only under an explicit `experimental` namespace and must be documented as subject to breaking change in minor releases.

## Target Package Architecture

Keep the current package layout and extend it with Splice-focused subpaths inside the existing `cantonjs` package.

### Runtime shape

```text
cantonjs
  current root exports remain generic Canton core

cantonjs/splice/token-standard
  stable token-standard descriptors, query helpers, command builders, parsers

cantonjs/splice/scan
  stable public Scan client and typed response models

cantonjs/splice/validator
  public validator client surface only after stability criteria are met

cantonjs/splice/experimental
  internal/deprecated Scan or Validator endpoints
  kernel interop adapters
  package-specific Splice workflow helpers
```

### Source layout

```text
src/
  splice/
    token-standard/
    scan/
    validator/
    experimental/
```

### Package interaction rules

- `src/index.ts` should not immediately re-export all Splice helpers from the root entrypoint. Splice support should start as opt-in subpath imports.
- `packages/cantonjs-codegen/` should remain the codegen package. Its role is to support stable Daml interfaces, fixtures, and descriptor ergonomics for token-standard contracts.
- `packages/cantonjs-react/` should not grow Splice-specific hooks until the core Splice runtime APIs settle. React hooks are a follow-on milestone, not the foundation.
- No new runtime npm package is created in the first implementation wave. We keep versioning and tree-shaking aligned with the repo's current single-package runtime strategy.

## Native Build vs `splice-wallet-kernel` Interop

| Dimension | Build natively in cantonjs | Interop over `splice-wallet-kernel` |
|---|---|---|
| Fit with current architecture | Strong. Reuses transports, errors, streaming, testing, and subpath patterns already in the repo. | Weak. Introduces another framework and its own gateway/kernel abstractions. |
| Upstream stability | Can target stable Ledger API V2, standards-backed Daml interfaces, and documented public endpoints directly. | The kernel README describes active early development; stability is not yet the right anchor for cantonjs GA APIs. |
| Browser + Node reach | Matches cantonjs's current transport-injection model. | Pulls in wallet/gateway concepts optimized for wallet providers and validator mediation. |
| Testability | Straightforward mock transport testing with existing patterns. | Harder to isolate because the abstraction boundary moves above the transport layer. |
| Long-term ownership | cantonjs controls its own public API and can evolve with Canton and Splice standards directly. | cantonjs becomes a wrapper around another moving TypeScript project. |
| Time-to-first prototype | Slower for some wallet-specific workflows. | Faster for experiments that mirror wallet-kernel use cases. |

### Recommendation

Choose native cantonjs implementations as the primary architecture.

Use `splice-wallet-kernel` only as:

- a research reference
- a source of interoperability examples
- an optional experimental adapter target for wallet-provider scenarios

Do not make it the basis of the GA cantonjs Splice surface.

## Implementation Milestones

This ADR is the source of truth for Splice-related milestones after Phase 8.

### Milestone 0: Architecture freeze

- complete this ADR
- capture repo gap analysis
- confirm baseline root test, typecheck, and build status

### Milestone 1: Stable-surface inventory

- freeze the exact public token-standard interfaces and public Scan/Validator endpoints we will target
- record which upstream surfaces are `external`, `internal`, or `deprecated`
- define the first export map for `cantonjs/splice/*`

### Milestone 2: Token-standard foundation

- add `src/splice/token-standard/`
- build typed token-standard query and command helpers directly on `createLedgerClient`
- extend codegen ergonomics only where it helps stable interface consumption
- keep this milestone GA-targeted

### Milestone 3: Public Scan client

- add `src/splice/scan/` for documented public/external endpoints only
- wire public network metadata into chain definitions where appropriate
- keep internal/deprecated Scan APIs out of GA exports

### Milestone 4: Validator client

- add `src/splice/validator/` for documented public validator endpoints
- start experimental if there is any unresolved stability ambiguity
- keep validator-internal and wallet-internal flows in `experimental`

### Milestone 5: Experimental interop layer

- add `src/splice/experimental/` adapters for internal APIs or `splice-wallet-kernel` interop
- document exact instability and versioning expectations
- do not promote to GA without upstream stability evidence

### Milestone 6: React and end-to-end ergonomics

- add opt-in `cantonjs-react` hooks only after the runtime surface stabilizes
- add integration fixtures and docs for LocalNet and public environments
- update docs, examples, and CI coverage for the new subpaths

## Consequences

### Positive

- Preserves the repo's current architecture instead of introducing a parallel SDK stack.
- Aligns GA features with stable public APIs and stable Daml interfaces.
- Avoids coupling cantonjs to Splice internals that upstream docs already expect to change.
- Keeps root-package ergonomics coherent with current `clients`, `transport`, `chains`, `codegen`, and `react` layers.

### Negative

- Native implementation is more work up front than wrapping an existing kernel.
- Some wallet-specific workflows may remain experimental longer.
- Public Validator and Scan support may ship in stages because stability differs by endpoint group.

## References

Local repo references inspected for this ADR:

- `README.md`
- `package.json`
- `src/index.ts`
- `src/clients/createLedgerClient.ts`
- `src/clients/createAdminClient.ts`
- `src/clients/createTestClient.ts`
- `src/transport/*`
- `src/chains/definitions.ts`
- `packages/cantonjs-codegen/*`
- `packages/cantonjs-react/*`
- `docs/*`
- `.github/workflows/*`

Primary external references:

- Splice Token Standard docs: <https://docs.global.canton.network.sync.global/app_dev/token_standard/index.html>
- Splice architecture docs: <https://docs.global.canton.network.sync.global/background/architecture.html>
- `splice-wallet-kernel` repository: <https://github.com/hyperledger-labs/splice-wallet-kernel>
