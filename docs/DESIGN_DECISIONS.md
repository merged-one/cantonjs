# Design Decisions

> Foundational architecture decisions for cantonjs as an application-side TypeScript SDK for participant Ledger API V2.
> Each decision is backed by research from the blockchain client library analysis and Canton Ledger API V2 research.

**Date:** 2026-04-01
**Author:** Charles Dusek

---

## Research Basis

These decisions are informed by:
- **8+ blockchain client libraries** analyzed (viem, ethers.js, CosmJS, polkadot.js, @solana/web3.js, @daml/ledger, Anchor, Surf)
- **Canton Ledger API V2** complete surface analysis (40+ gRPC methods, 50+ HTTP endpoints)
- **cantonctl architecture** alignment requirements (shared error model, DI pattern, TypeScript-first)
- **Canton developer survey** (n=41, Q1 2026): 71% from EVM, 41% cite setup friction

---

## Decision 1: TypeScript-First with Function Exports

**Decision:** Build cantonjs as a TypeScript-first library using function exports (not classes) for full tree-shakeability.

**Rationale:**
- viem proved that function exports reduce bundle size from ~120KB (ethers.js classes) to ~35KB
- Classes cannot be partially tree-shaken — if a user imports a client class, all methods ship to the browser
- Canton's `@daml/ledger` uses class-based API (CJS, not tree-shakeable) — cantonjs addresses this gap
- 71% of Canton developers come from EVM where viem's function pattern is now dominant

**Trade-offs:**
- (+) Tree-shakeable, smaller bundles for dApps
- (+) Each function is independently testable and composable
- (-) Less familiar "OOP" feel for Java/Scala developers coming from Canton's JVM ecosystem
- (-) More verbose imports vs. single class import

---

## Decision 2: Composable Transport Abstraction

**Decision:** Separate client logic from transport via pluggable transport types: `jsonApi()` (HTTP + WebSocket) as primary, `grpc()` (ConnectRPC) as optional.

**Rationale:**
- Canton uniquely offers two parallel API surfaces (gRPC + JSON API V2)
- viem's transport abstraction (`http()`, `webSocket()`, `custom()`, `fallback()`) is proven at scale
- ConnectRPC (connect-es) provides idiomatic TypeScript for gRPC without requiring an Envoy proxy
- JSON API is more accessible for browser dApps; gRPC offers better performance for server-side
- `fallback()` transport enables high-availability patterns (critical for $9T+ monthly volume network)

**Trade-offs:**
- (+) Users choose the best transport for their use case
- (+) Browser apps use JSON API; servers can use gRPC natively
- (-) Two transport implementations to maintain
- (-) Subtle behavioral differences between transports must be documented

---

## Decision 3: Party-Scoped Client Architecture

**Decision:** Organize clients around Canton's party-based identity model, not Ethereum's account model.

```
createLedgerClient({ party, token, transport })  → contract CRUD, streaming
createAdminClient({ token, transport })           → party/user/package management
createTestClient({ transport })                   → sandbox lifecycle, time manipulation
```

**Rationale:**
- Canton's fundamental unit is the **party**, not the account/address
- A party's permissions are encoded in their JWT token, not derived from a private key
- `@daml/ledger` already scopes to a party — this is the correct abstraction
- viem's Public/Wallet/Test client separation maps well: LedgerClient ≈ read+write (party-scoped), AdminClient ≈ node management, TestClient ≈ sandbox manipulation

**Trade-offs:**
- (+) Aligns with Canton's actual security model
- (+) Familiar to existing Daml developers
- (-) Different from Ethereum mental model (may confuse EVM-native developers)
- (-) Switching parties requires creating a new client (or re-tokenizing)

---

## Decision 4: Codegen from Daml with Inference-Friendly Output

**Decision:** Generate TypeScript types from Daml models (DAR files) using a modern codegen tool, producing ESM output that works with `as const` patterns for type inference in higher-level APIs.

**Rationale:**
- Daml's type system (variants, records, nested optionals, templates, choices) is too complex for pure runtime type inference (unlike Ethereum ABIs)
- Existing `daml codegen js` produces CJS output with weak types
- viem's ABIType approach works for flat Ethereum ABIs but cannot handle Daml's richer type system
- Generated types should be **minimal** (types + companion objects), not full client wrappers — the core library provides generic type-parameterized functions

**Trade-offs:**
- (+) Full Daml type system coverage with TypeScript safety
- (+) IDE autocomplete for template fields, choice arguments, return types
- (-) Requires a build step (DAR → TypeScript)
- (-) Generated code must be regenerated when Daml models change

---

## Decision 5: Structured Error Hierarchy Aligned with cantonctl

**Decision:** Implement a `CantonjsError` base class with `walk()`, `docsPath`, `metaMessages`, and error code ranges complementary to cantonctl's E1xxx-E8xxx.

**Rationale:**
- viem's error model (`BaseError` with `walk()`, `docsPath`, `metaMessages`) dramatically improves DX
- cantonctl uses structured errors with E-codes, suggestions, and docs URLs — cantonjs should be complementary
- Canton's gRPC errors include status codes and details that should be preserved and enriched
- Error type exports per module enable typed catch blocks

**Trade-offs:**
- (+) Consistent error experience across cantonctl + cantonjs ecosystem
- (+) Recovery suggestions reduce time-to-resolution
- (+) `walk()` enables finding specific errors in cause chains
- (-) More complex error system to maintain
- (-) Error code ranges must be coordinated with cantonctl

---

## Decision 6: Single Package with Subpath Exports

**Decision:** Ship cantonjs as a single npm package with subpath exports, plus a separate `cantonjs-react` package for React hooks.

```
cantonjs              → main entry
cantonjs/ledger       → LedgerClient, contract operations
cantonjs/admin        → AdminClient, party/user/package management
cantonjs/codegen      → runtime support for generated types
cantonjs/testing      → TestClient, sandbox helpers
cantonjs/chains       → network definitions (LocalNet, DevNet, TestNet, MainNet)
cantonjs-react        → React hooks (separate package)
```

**Rationale:**
- viem's single-package approach (with subpath exports + `sideEffects: false`) provides simpler DX than CosmJS's 20+ package monorepo
- Tree-shaking handles bundle size — unused subpaths are dropped by bundlers
- React is a fundamentally different dependency tree; separation prevents React from appearing in Node.js server `node_modules`
- Single version to track, no diamond dependency issues

**Trade-offs:**
- (+) `npm install cantonjs` — one command, done
- (+) No version coordination across packages
- (-) Full package downloaded even if user needs one subpath (mitigated by tree-shaking)
- (-) Cannot version submodules independently

---

## Decision 7: ESM-First with Dual CJS Support

**Decision:** Ship as ESM (`"type": "module"`) with `sideEffects: false`, providing CJS builds via package.json `exports` field for legacy consumers.

**Rationale:**
- Tree-shaking requires ESM static analysis — CJS `require()` is dynamic and opaque to bundlers
- viem and wagmi are ESM-first, establishing the pattern for the ecosystem
- Some Canton enterprise users may use older Node.js tooling that expects CJS
- `tsup` or `unbuild` can generate both ESM and CJS from a single TypeScript source

**Trade-offs:**
- (+) Tree-shaking works properly
- (+) Modern bundlers (Vite, esbuild, Rollup) optimize ESM natively
- (-) Dual-format packages have subtle interop edge cases
- (-) Slightly more complex build configuration

---

## Decision 8: JSON API V2 as Primary Transport

**Decision:** Prioritize the JSON Ledger API V2 (HTTP + WebSocket) as the primary transport, with gRPC as an optional advanced transport.

**Rationale:**
- JSON API works in browsers without additional tooling (no protobuf compilation, no proxy)
- Canton's JSON API V2 provides OpenAPI + AsyncAPI specs for code generation
- Most dApp developers (frontend + full-stack) are more comfortable with HTTP/JSON than gRPC
- gRPC offers advantages for server-side use cases (type safety from protos, efficient binary serialization, bidirectional streaming) but is not required for most dApp patterns
- cantonctl already handles the CLI/server-side workflow; cantonjs's primary audience is dApp developers

**Trade-offs:**
- (+) Works in all environments (browser, Node.js, edge)
- (+) Debuggable with standard HTTP tools (curl, browser DevTools)
- (+) No protobuf compilation required
- (-) JSON serialization overhead vs binary protobuf
- (-) WebSocket streaming less efficient than gRPC streaming for high-throughput

---

## Decision 9: Test-First TDD with Sandbox Integration

**Decision:** Follow cantonctl's test-first TDD methodology. Provide first-class testing utilities including `createTestClient`, sandbox lifecycle management, and vitest/jest integration helpers.

**Rationale:**
- cantonctl achieves 98.18% coverage with test-first TDD — cantonjs should match this rigor
- viem's `createTestClient` pattern proves that test utilities drive adoption
- Canton's sandbox provides a local ledger for integration testing
- Dependency injection (no `vi.mock()`) ensures testable code by convention

**Trade-offs:**
- (+) High confidence in library correctness
- (+) Test utilities become a selling point for dApp developers
- (+) Alignment with cantonctl's testing philosophy
- (-) Integration tests require Canton sandbox (slower)
- (-) More test infrastructure to maintain

---

## Decision 10: JWT-First Auth with CIP-0103 Compatibility

**Decision:** Use JWT tokens as the primary authentication mechanism, with CIP-0103 wallet integration as a secondary auth path for production dApps.

**Rationale:**
- Canton's Ledger API requires JWT for all authenticated requests
- Development workflows use generated JWTs (aligns with cantonctl's `auth` command)
- Production dApps use CIP-0103 wallet providers that issue JWTs via wallet gateways
- `@canton-network/dapp-sdk` handles CIP-0103 wallet connections — cantonjs should integrate with it, not replace it

**Trade-offs:**
- (+) JWT works everywhere (dev, staging, production)
- (+) Shared JWT management with cantonctl (OS keychain integration)
- (+) CIP-0103 integration via existing `@canton-network/dapp-sdk`
- (-) JWT token lifecycle management adds complexity (expiry, refresh)
- (-) Dual auth paths (JWT direct vs CIP-0103 wallet) may confuse developers

---

## Summary Table

| # | Decision | Pattern Source | Canton Specific |
|---|----------|--------------|-----------------|
| 1 | Function exports (not classes) | viem | No |
| 2 | Composable transport abstraction | viem | Yes (JSON API + gRPC) |
| 3 | Party-scoped client architecture | Canton + viem hybrid | Yes |
| 4 | Codegen from Daml | Daml codegen + viem ergonomics | Yes |
| 5 | Structured error hierarchy | viem + cantonctl | Hybrid |
| 6 | Single package + subpath exports | viem | No |
| 7 | ESM-first with CJS fallback | viem, wagmi | No |
| 8 | JSON API V2 primary transport | Canton-specific | Yes |
| 9 | Test-first TDD | cantonctl | No |
| 10 | JWT-first + CIP-0103 compat | Canton-specific | Yes |
