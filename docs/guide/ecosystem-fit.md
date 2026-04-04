# Ecosystem Fit

`cantonjs` is not the starting point for every Canton workflow.
It is built first for participant-connected application teams, with public Scan and selected stable/public Splice integrations as secondary add-ons.
The right tool depends on which boundary you own.

This repo complements the official stack.
It does not try to replace the canonical tools for Daml build workflows, full-stack onboarding, wallet-connected apps, or wallet-provider infrastructure.

If you are still deciding whether your team is a primary, secondary, or non-primary audience for this repo, start with [Target Users](/guide/target-users).
If you are an existing user trying to understand the repositioning reset, see [Migration notes](/MIGRATING_TO_SPLICE_SUPPORT).

## Choose Quickly

| If you need to... | Start with... | Why |
| --- | --- | --- |
| Build, test, and package Daml | DPM | Canonical Daml toolchain |
| Learn the platform through a full-stack reference flow | CN Quickstart | Official end-to-end onboarding path |
| Build a wallet-connected app | Official dApp SDK / dApp API / Wallet Gateway | Canonical wallet-connected boundary |
| Build a wallet, validator integration, or exchange integration | Official Wallet SDK | Canonical wallet-provider boundary |
| Generate a thin client directly from the participant HTTP spec | JSON Ledger API + OpenAPI-generated clients | Closest to the wire |
| Read public Splice network state | Splice public Scan APIs | Canonical public network-read boundary |
| Call published validator-facing HTTP routes | Splice external Validator APIs | Canonical external validator boundary |
| Build on stable token contracts and published interfaces | Published Splice Daml APIs / Token Standard | Canonical contract and standard layer |
| Keep a community JSON API V2 wrapper or `@daml/react`-style hooks | `@c7/ledger` / `@c7/react` | Community ergonomics around JSON API V2 |
| Build direct participant-connected TypeScript app code | `cantonjs` | Strongest fit for Ledger API V2 app-side runtime work |

## DPM

Use DPM when you own the Daml project lifecycle.

- **What it already does:**
  DPM is the canonical toolchain for project creation, package build, test execution, sandbox startup, DAR inspection, and official Daml codegen workflows.
- **Where it stops:**
  DPM is not the runtime TypeScript SDK your app embeds once you already have a participant, auth model, and DAR artifacts.
- **What cantonjs adds:**
  `cantonjs` picks up at application runtime with typed Ledger/Admin/Test clients, injected transports, streaming, structured errors, React hooks, and optional app-side DAR-to-TypeScript convenience from already-built artifacts.

## JSON Ledger API + OpenAPI-Generated Clients

Use raw generated clients when you want the thinnest possible wrapper around the participant HTTP contract.

- **What it already does:**
  The JSON Ledger API defines the participant HTTP surface, and OpenAPI-generated clients can give you language-specific request/response bindings with very little abstraction.
- **Where it stops:**
  Generated clients usually stay close to endpoint shapes.
  They do not usually give you participant-scoped client factories, reconnecting stream helpers, transport composition, request-scoped auth injection, structured error taxonomy, or testing fixtures.
- **What cantonjs adds:**
  `cantonjs` wraps Ledger API V2 in an application-oriented runtime: explicit transports, party-scoped clients, AsyncIterator streaming, CJ-coded errors, fallback composition, React hooks, and focused helpers for common participant-side workflows.

## CN Quickstart

Use Quickstart when you want the official full-stack learning and reference-app path.

- **What it already does:**
  CN Quickstart is the canonical end-to-end onboarding flow for cloning, running, exploring, and extending a working Canton application stack.
- **Where it stops:**
  Quickstart is optimized for guided setup and reference flows, not for being a small runtime library inside an existing TypeScript service or frontend codebase.
- **What cantonjs adds:**
  `cantonjs` is the library you reach for after you already know your deployment shape and want direct, tree-shakeable participant integration inside app code.

## Official dApp SDK / dApp API / Wallet Gateway

Use the official wallet-connected stack when your app needs wallet discovery, connection, provider semantics, and custody-aware signing flows.

- **What it already does:**
  The official dApp SDK and dApp API define the wallet-connected app boundary, and Wallet Gateway bridges validator-side execution to external signing and custody providers.
  This remains the canonical stack for CIP-0103 wallet-connected flows.
- **Where it stops:**
  That stack is not the general-purpose app runtime for participant-private backend logic, direct participant service code, or broad Ledger API V2 ergonomics outside wallet-mediated flows.
- **What cantonjs adds:**
  `cantonjs` gives participant-connected apps direct Ledger API V2 clients and runtime helpers once participant access already exists.
  At the wallet boundary, the hand-off is direct: once official tooling exposes the ledger URL, token, and active party context, app code can construct `createLedgerClient(...)`.

## Official Wallet SDK

Use the Wallet SDK when you are building wallet-provider, validator-integration, exchange, or custody-adjacent infrastructure.

- **What it already does:**
  The official Wallet SDK is the canonical TypeScript SDK for lower-level wallet and provider integrations: synchronizer auth, party allocation with external keypairs, ledger reads, prepared transaction handling, signing, submission, and wallet-oriented Token Standard integration.
- **Where it stops:**
  It is not the best fit for ordinary participant-connected app teams that are not building a wallet, gateway, custody integration, or exchange backend.
- **What cantonjs adds:**
  `cantonjs` targets app teams with existing participant access.
  It keeps the surface smaller and app-oriented: participant Ledger/Admin/Test clients, explicit transport injection, streaming, testing, and selected stable Splice add-ons without taking over wallet-provider responsibilities.

## Splice Public Scan APIs

Use public Scan APIs when you need network-visible Splice reads.

- **What it already does:**
  Scan is the canonical public read surface for DSO and network metadata, update history, public ANS data, public holdings summaries, and similar network-visible information.
- **Where it stops:**
  Scan does not expose party-private ledger state, participant-private contract queries, or participant-submitted commands.
- **What cantonjs adds:**
  `cantonjs-splice-scan` provides a focused TypeScript wrapper around the stable public Scan surface, plus reuse of the core transport model and network preset metadata.
  It intentionally leaves internal, deprecated, and pre-alpha Scan routes out of the GA entrypoint.

## Splice External Validator APIs

Use the published external Validator APIs when your app needs validator-hosted HTTP surfaces rather than direct participant ledger access.

- **What it already does:**
  The external Validator APIs provide deployment-facing HTTP routes such as `ans-external` and validator-hosted proxy access to selected public Scan data.
  They are the canonical boundary for those validator-published workflows.
- **Where it stops:**
  They are not a replacement for participant Ledger API access, and they do not make private operator routes part of the stable public contract.
  Legacy `wallet-external` flows also remain compatibility surfaces, not the preferred foundation for new token flows.
- **What cantonjs adds:**
  `cantonjs-splice-validator` wraps the stable validator-published boundary that fits this repo: GA ANS support and a filtered GA Scan Proxy client limited to external semantics.

## Published Splice Daml APIs / Token Standard

Use the published Splice Daml APIs and Token Standard when you need the canonical contract and interface layer for holdings, transfers, allocations, and metadata.

- **What it already does:**
  The published Daml interfaces and Token Standard define the stable contract-level model and flow vocabulary for token work across the ecosystem.
- **Where it stops:**
  Standards and published interfaces do not by themselves provide a full application runtime for querying participant state, parsing transaction history, preparing interactive submissions, or composing these flows ergonomically in TypeScript app code.
- **What cantonjs adds:**
  `cantonjs-splice-interfaces` packages stable descriptors and generated types, while `cantonjs-splice-token-standard` adds participant-first query helpers, command helpers, interactive-submission helpers, and history parsers over those canonical interfaces.

## `@c7/ledger` / `@c7/react`

Use community tools like `@c7/ledger` and `@c7/react` when their ergonomics match your codebase, especially if you want a community wrapper around JSON API V2 or a familiar `@daml/react`-style hook model.

- **What they already do:**
  These projects provide community-maintained TypeScript and React wrappers around Canton JSON API V2, including a React layer explicitly aimed at `@daml/react`-style usage patterns.
- **Where they stop:**
  They are community tools, not the canonical upstream boundaries for DPM, Quickstart, wallet integration, or the published Splice standards.
  They also follow their own package shape, abstractions, and maintenance model.
- **What cantonjs adds:**
  `cantonjs` takes a different position: direct participant Ledger API V2 clients, explicit transport injection, structured errors, stronger testing primitives, a split between GA and experimental Splice surfaces, and a single repo that keeps the participant core plus selected stable public Splice add-ons aligned.

## cantonjs

Use `cantonjs` when your app or service already has participant access and you want an application-side TypeScript runtime around Ledger API V2.

- **What it already does:**
  `cantonjs` is strongest for direct participant-connected app work: typed Ledger/Admin/Test clients, injected transports, request-scoped auth, streaming, structured errors, testing helpers, React hooks, and optional codegen support for app code.
- **Where it stops:**
  `cantonjs` is not the canonical Daml build/test toolchain, not the official full-stack starter, not the official wallet-connected stack, and not an attempt to wrap every validator-private or unstable Splice endpoint.
- **What cantonjs adds:**
  It fills the application-runtime gap between the raw participant APIs and the broader official platform stack.
  In this repo that includes the participant core plus selected public or stable Splice add-ons such as public Scan, stable validator-published ANS and Scan Proxy helpers, stable published interfaces, and participant-first Token Standard helpers.

## Practical Rule Of Thumb

Start with the canonical tool for the boundary you actually own:

- **DPM** for Daml project lifecycle
- **Quickstart** for official end-to-end onboarding
- **dApp SDK / dApp API / Wallet Gateway** for wallet-connected apps
- **Wallet SDK** for wallet, exchange, and provider integrations
- **Published Splice APIs and standards** for public or standardized contract surfaces
- **`cantonjs`** for direct participant Ledger API V2 application work and selected stable Splice add-ons around that core

If you are still unsure, read [Positioning & Boundaries](/positioning) first and then continue with [Getting Started](/guide/getting-started).
