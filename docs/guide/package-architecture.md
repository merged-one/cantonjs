# Package Architecture

`cantonjs` is organized around one primary product story and three supporting layers:

- **Core** for participant Ledger API V2 application work
- **Optional convenience packages** for React state and DAR-to-TypeScript generation around that core
- **Add-ons** for public/stable Splice surfaces that fit the same app-side story
- **Adapters** for thin edge interop with official wallet tooling

This split is intentional. The repo is not trying to wrap every Canton, Splice, validator, or wallet surface under one promise.

If you used `cantonjs` before this reset, read [Migration notes](/MIGRATING_TO_SPLICE_SUPPORT) first. The package story changed; runtime API names did not.

## Official Wallet And dApp Interop Strategy

`cantonjs` does not compete with the official wallet-connected stack.

- The official dApp SDK / dApp API / Wallet Gateway own wallet discovery, connection UX, wallet-backed auth issuance, and wallet-connected responsibilities.
- The official Wallet SDK owns wallet-provider, custody-facing, and exchange-style responsibilities.
- `cantonjs` starts after participant access already exists or after a connected wallet/provider has already exposed the ledger URL, token, and active party context.
- `cantonjs-wallet-adapters` stays thin on purpose: it adapts official provider output into a shape that `cantonjs` can consume, but it does not become the source of truth for wallet connectivity.

## At A Glance

| Layer | Packages | Main job |
| --- | --- | --- |
| Core | `cantonjs` | Participant Ledger API V2 SDK for app-side TypeScript code |
| Optional convenience packages | `cantonjs-react`, `cantonjs-codegen` | React state and DAR-to-TypeScript convenience around the core |
| Add-ons | `cantonjs-splice-scan`, `cantonjs-splice-validator`, `cantonjs-splice-interfaces`, `cantonjs-splice-token-standard` | Public/stable Splice surfaces that fit the app-side story |
| Adapters | `cantonjs-wallet-adapters` | Thin edge interop with official wallet/provider tooling |

## Core

### `cantonjs`

- **What it is for:** the application-side TypeScript SDK for direct participant Ledger API V2 work: ledger, admin, and test clients; transports; streaming; errors; chains; and runtime typing helpers.
- **What it is not for:** Daml project lifecycle management, full-stack onboarding, wallet discovery, wallet/provider APIs, or validator-private HTTP surfaces.
- **Stability status:** GA on the Canton `3.4.x` line.
- **Upstream surface:** Canton participant Ledger API V2 and related participant-facing admin/test surfaces.

## Optional Convenience Packages

### `cantonjs-react`

- **What it is for:** participant-private React state on top of `cantonjs`, including TanStack Query-powered reads, writes, and live updates for apps that already have participant access.
- **What it is not for:** public Scan data, wallet discovery, wallet connection UX, or a replacement for the official dApp SDK.
- **Stability status:** GA.
- **Upstream surface:** `cantonjs`, React, TanStack Query, and the participant Ledger API V2 boundary already owned by the core package.

### `cantonjs-codegen`

- **What it is for:** optional DAR-to-TypeScript generation for application teams that already have DAR artifacts and want generated types and descriptors for app code.
- **What it is not for:** the canonical Daml build, test, package, or official codegen toolchain.
- **Stability status:** GA.
- **Upstream surface:** DAR artifacts produced by the canonical Daml workflow, typically via DPM and related official tooling.

## Add-Ons

### `cantonjs-splice-scan`

- **What it is for:** GA public Scan reads such as DSO metadata, public updates, public ANS lookups, and other network-visible Splice data.
- **What it is not for:** party-private ledger state, participant-submitted commands, or an excuse to blur public Scan data with participant Ledger API reads.
- **Stability status:** GA on the main entrypoint; `/experimental` is outside the GA promise.
- **Upstream surface:** the stable public Splice Scan HTTP API.

### `cantonjs-splice-validator`

- **What it is for:** selected stable external Validator support, specifically `ans-external`, the filtered public subset of `scan-proxy`, and clearly separated legacy compatibility helpers where needed.
- **What it is not for:** the entire validator API, validator-internal routes, or a reason to normalize private operator surfaces into the main repo contract.
- **Stability status:** GA for `createAnsClient()` and filtered `createScanProxyClient()`; legacy compatibility for `createLegacyWalletClient()`; `/experimental` remains outside the GA promise.
- **Upstream surface:** published external Validator HTTP APIs plus `scan-proxy` routes whose backing Scan semantics are classified as external in the vendored Scan spec.

### `cantonjs-splice-interfaces`

- **What it is for:** stable published Splice descriptors and generated types that application code and higher-level helpers can depend on without redoing interface extraction themselves.
- **What it is not for:** arbitrary private DAR codegen, unstable/private interface surfacing, or a claim that every Splice contract family belongs in this repo.
- **Stability status:** GA.
- **Upstream surface:** official Splice release-bundle DAR artifacts and the published stable interface layer they expose.

### `cantonjs-splice-token-standard`

- **What it is for:** participant-first helpers for stable Token Standard flows, including query helpers, command helpers, interactive submission helpers, and history parsing built on the stable interfaces package.
- **What it is not for:** wallet-provider internals, validator-private transfer workflows, or ownership of wallet-connected responsibilities.
- **Stability status:** GA.
- **Upstream surface:** the participant Ledger API V2 boundary through `cantonjs`, plus stable published interfaces from `cantonjs-splice-interfaces`.

## Adapters

### `cantonjs-wallet-adapters`

- **What it is for:** thin edge adapters for official CIP-0103-style providers and official `@canton-network/dapp-sdk` provider access patterns, so `cantonjs` can consume wallet/provider output after connection is already handled.
- **What it is not for:** wallet discovery, wallet connection UX, wallet gateways, custody, signing-provider ownership, or a replacement for the official dApp SDK or Wallet SDK.
- **Stability status:** Experimental.
- **Upstream surface:** official CIP-0103 provider shapes and official dApp SDK provider output in the current Canton `3.4.x` / Splice `0.5.x` era.

## Practical Rules

- Start with `cantonjs` when your app already has participant access.
- Add `cantonjs-react` only for participant-private React state.
- Add `cantonjs-codegen` only when existing DAR artifacts need TypeScript convenience in app code.
- Add `cantonjs-splice-scan` for public Scan reads.
- Add `cantonjs-splice-validator` only for selected stable external Validator support, not for validator-internal coverage.
- Add `cantonjs-splice-interfaces` and `cantonjs-splice-token-standard` when your participant-connected app needs stable published Splice interfaces and token helpers.
- Add `cantonjs-wallet-adapters` only when you already use or already have a connected official wallet/provider boundary and need a thin interop layer.
