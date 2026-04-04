# Package Architecture

`cantonjs` is organized around one primary product story and two supporting layers:

- **Core** for participant Ledger API V2 application work
- **Optional convenience packages** for React state and DAR-to-TypeScript generation around that core
- **Add-ons** for public/stable Splice surfaces that fit the same app-side story

This split is intentional.
The repo is not trying to wrap every Canton, Splice, validator, or wallet surface under one promise.

If you used `cantonjs` before this reset, read [Migration notes](/MIGRATING_TO_SPLICE_SUPPORT) first.
The package story changed, and older wallet/validator-overlap exports were removed from the current line.

## Official Wallet Interop Strategy

`cantonjs` does not compete with the official wallet-connected stack.

- The **official dApp SDK / dApp API / Wallet Gateway** own wallet discovery, connection UX, wallet-backed auth issuance, and wallet-connected responsibilities.
- The **official Wallet SDK** owns wallet-provider, custody-facing, and exchange-style responsibilities.
- **`cantonjs`** starts after participant access already exists or after official tooling has already exposed the ledger URL, token, and active party context.
- The hand-off pattern is explicit: once those values exist, build `createLedgerClient(...)` directly in app code.

## At A Glance

| Layer | Packages | Main job |
| --- | --- | --- |
| Core | `cantonjs` | Participant Ledger API V2 SDK for app-side TypeScript |
| Convenience | `cantonjs-react`, `cantonjs-codegen` | React state and DAR-to-TypeScript around the core |
| Add-ons | `cantonjs-splice-scan`, `-validator`, `-interfaces`, `-token-standard` | Public/stable Splice surfaces for the app-side story |

## Core

### `cantonjs`

- **What it is for:**
  The application-side TypeScript SDK for direct participant Ledger API V2 work: ledger, admin, and test clients; transports; streaming; errors; chains; and runtime typing helpers.
- **What it is not for:**
  Daml project lifecycle management, full-stack onboarding, wallet discovery, wallet/provider APIs, or private operator HTTP surfaces.
- **Stability:** GA on the Canton `3.4.x` line.
- **Upstream surface:** Canton participant Ledger API V2 and related participant-facing admin/test surfaces.

## Optional Convenience Packages

### `cantonjs-react`

- **What it is for:**
  Participant-private React state on top of `cantonjs`, including TanStack Query-powered reads, writes, and live updates for apps that already have participant access.
- **What it is not for:**
  Public Scan data, wallet discovery, wallet connection UX, or a replacement for the official dApp SDK.
- **Stability:** GA.
- **Upstream surface:** `cantonjs`, React, TanStack Query, and the participant Ledger API V2 boundary already owned by the core package.

### `cantonjs-codegen`

- **What it is for:**
  Optional DAR-to-TypeScript generation for application teams that already have DAR artifacts and want generated types and descriptors for app code.
- **What it is not for:**
  The canonical Daml build, test, package, or official codegen toolchain.
- **Stability:** GA.
- **Upstream surface:** DAR artifacts produced by the canonical Daml workflow, typically via DPM and related official tooling.

## Add-Ons

### `cantonjs-splice-scan`

- **What it is for:**
  GA public Scan reads such as DSO metadata, public updates, public ANS lookups, and other network-visible Splice data.
- **What it is not for:**
  Party-private ledger state, participant-submitted commands, or an excuse to blur public Scan data with participant Ledger API reads.
- **Stability:** GA on the main entrypoint; `/experimental` is outside the GA promise.
- **Upstream surface:** The stable public Splice Scan HTTP API.

### `cantonjs-splice-validator`

- **What it is for:**
  Selected stable external Validator support — specifically `ans-external` and the filtered public subset of `scan-proxy`.
- **What it is not for:**
  The entire validator API, private operator routes, or a reason to normalize private deployment surfaces into the main repo contract.
- **Stability:** GA.
- **Upstream surface:** Published external Validator HTTP APIs plus `scan-proxy` routes whose backing Scan semantics are classified as external in the vendored Scan spec.

### `cantonjs-splice-interfaces`

- **What it is for:**
  Stable published Splice descriptors and generated types that application code and higher-level helpers can depend on without redoing interface extraction themselves.
- **What it is not for:**
  Arbitrary private DAR codegen, unstable/private interface surfacing, or a claim that every Splice contract family belongs in this repo.
- **Stability:** GA.
- **Upstream surface:** Official Splice release-bundle DAR artifacts and the published stable interface layer they expose.

### `cantonjs-splice-token-standard`

- **What it is for:**
  Participant-first helpers for stable Token Standard flows, including query helpers, command helpers, interactive submission helpers, and history parsing built on the stable interfaces package.
- **What it is not for:**
  Wallet-provider internals, private validator transfer workflows, or ownership of wallet-connected responsibilities.
- **Stability:** GA.
- **Upstream surface:** The participant Ledger API V2 boundary through `cantonjs`, plus stable published interfaces from `cantonjs-splice-interfaces`.

## Practical Rules

- Start with **`cantonjs`** when your app already has participant access.
- Add **`cantonjs-react`** only for participant-private React state.
- Add **`cantonjs-codegen`** only when existing DAR artifacts need TypeScript convenience in app code.
- Add **`cantonjs-splice-scan`** for public Scan reads.
- Add **`cantonjs-splice-validator`** only for selected stable external Validator support.
- Add **`cantonjs-splice-interfaces`** and **`cantonjs-splice-token-standard`** when your participant-connected app needs stable published Splice interfaces and token helpers.
- Keep wallet connection in official tooling, then hand participant connection details into `createLedgerClient(...)`.
