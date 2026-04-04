# Target Users

`cantonjs` is not the TypeScript answer to every Canton question.
It is built first for app-side TypeScript teams that own a participant-connected application boundary.
Public Scan and selected stable/public Splice integrations are secondary.
Everything else should be treated as out of scope unless it is explicitly called out.

If you are deciding whether this repo fits your team at all, ask one question first:
do you already own participant access or a stable/public Splice boundary inside an application codebase?
If the answer is "no", start with [Ecosystem Fit](/guide/ecosystem-fit) and the official tool for that boundary.

## Primary Personas

| Persona | What they own | Why they reach for `cantonjs` |
| --- | --- | --- |
| Backend and full-stack participant services | TypeScript services that read and write contracts directly against a participant | Typed Ledger API V2 access, explicit auth and transport control, streaming, structured errors, and testable service code |
| Participant-private React apps | React UIs that already have participant access and need private ledger state | Hooks and mutations on top of the same participant runtime, not wallet discovery or provider UX |
| Integration and data teams with participant access | ETL jobs, ops dashboards, workflow bridges, and internal APIs | Reliable participant reads, completion and update streams, DAR-backed types, and clean integration into existing TypeScript infrastructure |

## Secondary Personas

| Persona | Boundary | Why `cantonjs` is justified |
| --- | --- | --- |
| Public Scan consumers | Public, network-visible Splice reads | `cantonjs-splice-scan` gives a focused TypeScript wrapper for the GA public Scan surface using the same transport and chain model |
| Advanced stable/public Splice integrators | Selected stable external Validator routes or published Splice interfaces layered into an app | The add-on packages cover stable/public surfaces without expanding the core promise to every validator-private or unstable endpoint |

## Non-Primary Audiences

- Pure Daml authors whose main need is project scaffolding, package build, test, or official Daml codegen should start with **DPM**.
- Wallet providers, exchanges, custodians, and teams building signing or provider infrastructure should start with the **official Wallet SDK** and related wallet stack.
- Teams whose main problem is wallet discovery, wallet connection UX, wallet-backed auth issuance, or provider interoperability should start with the **official dApp SDK, dApp API, and Wallet Gateway**.
- Teams that need operator-private, validator-private, or unstable pre-GA surfaces should not expect the main `cantonjs` story or semver promise to cover those endpoints.

## Jobs To Be Done

### Primary Jobs

- Put a typed participant Ledger API V2 runtime inside a TypeScript service or app that already has participant access.
- Submit commands, query private contracts, and perform participant-scoped admin work without hand-rolling transport and auth plumbing.
- Follow ledger updates and completions with reconnect and abort support.
- Test participant-connected code with mock transports, recording transports, and sandbox fixtures.
- Generate TypeScript types and descriptors from DAR artifacts that already exist in the team's Daml workflow.
- Build participant-private React screens on top of the same participant runtime model.

### Secondary Jobs

- Add public Scan reads without turning the core SDK into a generic public-network data SDK.
- Layer selected stable external Validator routes or published Splice interfaces into an application that is still centered on participant-side logic.

## Current Alternatives And Adjacent Tools

| If the main need is... | Better first stop | Where `cantonjs` fits instead |
| --- | --- | --- |
| Daml project lifecycle | DPM | Starts after DARs, participants, and auth models already exist |
| Full-stack onboarding or a reference app | CN Quickstart | The runtime you embed once you know your deployment shape |
| Wallet-connected app UX and provider discovery | Official dApp SDK / dApp API / Wallet Gateway | Only fits after participant access is already solved |
| Wallet, exchange, custody, or provider infrastructure | Official Wallet SDK | Not the lead product for provider-side responsibilities |
| Thin wire-level client generation | JSON Ledger API + OpenAPI-generated clients | Adds app runtime concerns: streaming, auth injection, errors, tests |
| Public network reads only | Splice public Scan APIs | `cantonjs-splice-scan` is a focused wrapper if you want a TypeScript package |
| Published validator-hosted HTTP flows | Splice external Validator APIs | `cantonjs-splice-validator` wraps selected stable/public validator surfaces only |
| Community JSON API V2 ergonomics | `@c7/ledger` / `@c7/react` | Takes a participant-runtime-first position with its own transport, error, and testing model |

For a deeper tool-by-tool comparison, see [Ecosystem Fit](/guide/ecosystem-fit).

## Why `cantonjs` Is Justified By Persona

### Backend and Full-Stack Participant Services

`cantonjs` is justified when your service already has participant access and you want a small runtime, not a larger platform.
The value is explicit transport injection, request-scoped auth, typed client factories, streaming, structured errors, and strong test seams.

**Buyer message:**
"For participant-connected TypeScript services, `cantonjs` is the runtime between your app and Ledger API V2: typed clients, explicit auth and transport control, streaming, and testability without adopting a full-stack framework."

### Participant-Private React Apps

`cantonjs` is justified when the app is participant-private and auth is already solved.
`cantonjs-react` keeps reads, writes, and live updates close to the same participant runtime instead of moving the product story to wallet discovery or provider UX.

**Buyer message:**
"For participant-private React apps, `cantonjs` gives you typed contract queries, mutations, and live updates on top of direct participant access, without pretending to be the wallet UX layer."

### Integration and Data Teams

`cantonjs` is justified when the job is to turn participant state and events into workflows, dashboards, or downstream data products.
These teams care about transport control, stable typing, composable auth, streaming, and predictable error semantics more than they care about end-user wallet UX.

**Buyer message:**
"For integration and data teams, `cantonjs` is the TypeScript SDK for extracting participant state, following updates, and moving ledger events into operational systems with explicit control over auth, transport, and failure handling."

### Advanced Stable/Public Splice Integrators

`cantonjs` is justified when you need selected stable/public Splice surfaces in the same TypeScript codebase as your participant-connected app logic.
The add-on packages give you public Scan, stable published interfaces, and selected external Validator support without claiming ownership of validator-private or unstable APIs.

**Buyer message:**
"For advanced Splice integrators, `cantonjs` is the focused way to consume public Scan, selected stable Validator routes, and published Splice interfaces from TypeScript without betting your app on unstable or private surfaces."

## Explicit Non-Goals / Anti-Pitch

- Do not pitch `cantonjs` as the SDK for every Canton team.
- Do not pitch it as the replacement for DPM, Quickstart, or the official wallet-connected stack.
- Do not pitch it to buyers whose main problem is wallet discovery, provider UX, custody, exchange infrastructure, or wallet-provider protocols.
- Do not pitch it as a commitment to wrap every validator, wallet, or operator API in the ecosystem.
- Do not pitch unstable, private, or legacy compatibility surfaces as the reason the repo exists.
- Do pitch it as the application-side TypeScript runtime for direct participant Ledger API V2 work, plus selected stable/public Splice add-ons around that core.
