---
layout: home
hero:
  name: cantonjs
  text: TypeScript for Canton Network
  tagline: The modern TypeScript interface for Canton Ledger API V2 — viem for Canton.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/merged-one/cantonjs

features:
  - title: Function Exports, Not Classes
    details: Every API is a tree-shakeable function. createLedgerClient(), not new LedgerClient(). Ship only what you use.
  - title: Type-Safe Codegen
    details: Generate TypeScript types from your Daml models. Full type safety from template IDs to choice arguments.
  - title: Real-Time Streaming
    details: AsyncIterator-based WebSocket streams with auto-reconnect and offset tracking. Subscribe to contract updates in real-time.
  - title: React Hooks
    details: TanStack Query-powered hooks for Canton dApps. useContracts, useCreateContract, useExercise — familiar patterns, Canton-native.
  - title: First-Class Testing
    details: Mock transports, recording transports, and Canton sandbox fixtures. Test-first development without ceremony.
  - title: Canton-Native Errors
    details: Structured errors with codes (CJ1xxx-CJ6xxx), recovery hints, and traversable cause chains. Aligned with cantonctl conventions.
---
