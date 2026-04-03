---
layout: home
hero:
  name: cantonjs
  text: Application-Side TypeScript SDK
  tagline: Build directly against a Canton participant's Ledger API V2 from TypeScript.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Scope & Boundaries
      link: /positioning

features:
  - title: Direct Participant Clients
    details: Use createLedgerClient(), createAdminClient(), and createTestClient() for application-side participant, admin, and test flows.
  - title: Transports And Streaming
    details: Inject JSON API or gRPC transports, add fallback, and subscribe to live updates with reconnect and offset tracking.
  - title: Participant-Private React Hooks
    details: Keep React hooks focused on participant-visible ledger state instead of broad wallet or public-network concerns.
  - title: Optional Codegen
    details: Generate TypeScript from existing DAR artifacts when app code needs it. DPM remains canonical for Daml build, test, and codegen.
  - title: Focused Add-Ons
    details: Keep public Scan, validator, token-standard, and interface support in separate packages with explicit boundaries.
  - title: Explicit Wallet Boundaries
    details: CIP-0103 support lives in experimental edge adapters while the official wallet stack continues to own connection and provider responsibilities.
---

Start with [Scope & Boundaries](/positioning), [Target Users](/guide/target-users), [Package Architecture](/guide/package-architecture), and [Ecosystem Fit](/guide/ecosystem-fit).
