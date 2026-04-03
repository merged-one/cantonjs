# Positioning

This document is the canonical scope and positioning note for subsequent docs and messaging edits on `feat/reposition-cantonjs-as-ledger-app-sdk`.

## One-Sentence Positioning

`cantonjs` is the application-side TypeScript SDK for teams building directly against a Canton participant's Ledger API V2, with optional React, codegen, and selected ecosystem add-ons around that core.

For the concrete tool-by-tool boundary guide, see [Ecosystem Fit](/guide/ecosystem-fit).

For package-level architecture, see [Package Architecture](/guide/package-architecture).

For named personas, jobs to be done, buyer messaging, and explicit anti-pitch guidance, see [Target Users](/guide/target-users).

## Scope Decision

The core story for this repo is participant-connected application development:

- app backends that talk directly to a participant's Ledger API V2
- frontend and service teams that already have participant access and need a TypeScript runtime
- React applications that need participant-private ledger queries and writes
- teams that want generated TypeScript types from DAR artifacts they already produce in their Daml workflow

That is the center of gravity for `cantonjs`. Everything else in the repo should either support that story directly or be framed as an optional add-on or adapter.

## Official Ecosystem Boundaries We Defer To

### DPM Remains Canonical For Daml Build, Test, And Codegen

DPM remains the canonical toolchain for Daml package build, test, and codegen workflows. `cantonjs-codegen` does not replace DPM. It complements DPM by turning already-built DAR artifacts into TypeScript types and descriptors for application code.

### Quickstart Remains The Official Full-Stack Path

Quickstart remains the official full-stack and reference-app path. `cantonjs` should not be positioned as the official end-to-end starter, deployment template, or canonical reference application for the wider Canton ecosystem.

### The Official Wallet Stack Owns Wallet-Connected Responsibilities

The official dApp SDK, dApp API, Wallet Gateway, and Wallet SDK own wallet-connected and wallet-provider responsibilities. That includes wallet discovery, connection UX, custody-facing flows, provider semantics, wallet-backed auth issuance, and wallet-provider integration contracts.

`cantonjs` may integrate with that stack at the boundary, but it does not replace it. `cantonjs-wallet-adapters` stays explicitly adapter-level and experimental.

## Users And Non-Goals

This repo should not market itself as the answer for every Canton buyer. The target-user detail lives in [Target Users](/guide/target-users); the summary below keeps the positioning note aligned with that page.

### Primary Users

- application teams building directly against participant Ledger API V2
- backend and integration engineers writing participant-scoped services in TypeScript
- frontend teams building participant-connected apps with `cantonjs-react`
- teams that want typed application code generated from existing DAR outputs

### Secondary Users

- teams adding public Splice reads through focused add-on packages
- teams using selected stable external Validator or published Splice interfaces around participant-connected app code
- teams using stable Splice token-standard helpers on top of participant ledger access
- integrators who need narrow boundary adapters to bridge official wallet tooling into `cantonjs`

### Non-Goals

- replacing DPM as the canonical Daml build, test, or codegen toolchain
- replacing Quickstart as the official full-stack or reference-app experience
- replacing the official dApp SDK, dApp API, Wallet Gateway, or Wallet SDK
- owning wallet connection, wallet discovery, custody, or wallet-provider APIs
- presenting `cantonjs` as the single SDK for every Canton, Splice, validator, or wallet workflow
- moving operator-specific, validator-private, or wallet-internal concerns into the core package story
- pitching unstable, private, or legacy compatibility surfaces as the reason the repo exists

## Package Map

### Core

| Package | Role |
| --- | --- |
| `cantonjs` | Core participant-facing Ledger API V2 SDK: ledger/admin/test clients, transports, streaming, errors, chains, and runtime typing helpers |

### Optional Convenience Packages

| Package | Role |
| --- | --- |
| `cantonjs-react` | Participant-private React hooks layered on the core SDK |
| `cantonjs-codegen` | Optional DAR-to-TypeScript convenience from artifacts produced by the canonical Daml toolchain |

### Add-Ons

| Package | Role |
| --- | --- |
| `cantonjs-splice-scan` | Public Splice Scan reads |
| `cantonjs-splice-validator` | Selected stable external Validator support: ANS, filtered public Scan Proxy reads, plus legacy compatibility flows kept clearly separate from the GA surface |
| `cantonjs-splice-interfaces` | Stable published Splice descriptors and generated types |
| `cantonjs-splice-token-standard` | Participant-first token-standard helpers built on stable published interfaces |

### Adapters

| Package | Role |
| --- | --- |
| `cantonjs-wallet-adapters` | Experimental CIP-0103 boundary adapters for interop with the official wallet stack |

Core packages define the main product story. Optional convenience packages make that participant-connected core easier to use in React apps or with already-built DAR artifacts. Add-ons extend the core for public/stable Splice surfaces only. Adapters exist only to help applications interoperate with official wallet surfaces without redefining ownership boundaries.

## Messaging Rules For Follow-On Edits

- Lead with "application-side TypeScript SDK" and "participant Ledger API V2" language.
- Treat React, codegen, and Splice packages as supporting layers around the participant SDK core.
- Describe wallet interop as boundary integration with the official wallet stack, not as `cantonjs` owning wallet UX or provider semantics.
- Keep Quickstart and DPM positioned as official upstream paths, not as problems `cantonjs` is replacing.

## Naming Note

Use `CIP-0103` in prose and docs. Do not use the older missing-zero spelling.
