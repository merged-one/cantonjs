# Blockchain Client Library Research

> Competitive analysis of TypeScript blockchain client libraries to inform cantonjs architecture.
> Equivalent to cantonctl's `blockchain-cli-toolchain-research.md`.

**Date:** 2026-04-01
**Author:** Charles Dusek
**Status:** Complete

---

## Executive Summary

We analyzed 8+ blockchain client libraries across 6 ecosystems to identify patterns, trade-offs, and best practices for building cantonjs — a TypeScript library for interacting with Canton's Ledger API. viem (Ethereum) emerges as the gold standard for modern client library design, having systematically solved problems that plagued its predecessors (ethers.js, web3.js). Canton's unique characteristics (party-based privacy, Daml type system, gRPC + JSON API, sub-transaction visibility) require Canton-specific adaptations of these patterns.

### Key Findings

1. **Function exports beat classes** — viem's tree-shakeable function-based API is the modern standard; class-based APIs (ethers.js, web3.js) cannot be partially tree-shaken
2. **Transport abstraction is essential** — separating client logic from transport (HTTP, WebSocket, gRPC) enables flexibility without API churn
3. **Type generation is unavoidable for rich type systems** — Daml's type system (variants, records, optionals, templates, choices) is too complex for pure runtime inference; codegen is required, but output should be inference-friendly
4. **Three-layer architecture wins** — core library → framework-agnostic state → React hooks (viem → @wagmi/core → wagmi)
5. **Single package with subpath exports** — simpler DX than monorepo, tree-shaking handles bundle size
6. **Structured errors with recovery suggestions** — aligns with cantonctl's error model and dramatically improves DX
7. **Test client abstractions** — first-class testing support (like viem's `createTestClient`) drives adoption

---

## 1. Libraries Analyzed

### Tier 1: Gold Standard

| Library | Ecosystem | Weekly Downloads | Key Innovation |
|---------|-----------|-----------------|----------------|
| **viem** | Ethereum | 1.5M+ | Tree-shakeable, type-safe, transport abstraction |
| **wagmi** | Ethereum (React) | 500K+ | TanStack Query integration, three-layer arch |

### Tier 2: Established Leaders

| Library | Ecosystem | Weekly Downloads | Key Innovation |
|---------|-----------|-----------------|----------------|
| **ethers.js** | Ethereum | 2M+ (declining) | Provider/Signer separation, ENS integration |
| **@solana/web3.js** | Solana | 500K+ | Connection-based, transaction builder |
| **CosmJS** | Cosmos | 100K+ | Modular monorepo, Protobuf codegen |
| **polkadot.js** | Substrate | 50K+ | Runtime metadata-driven types |

### Tier 3: Canton-Adjacent

| Library | Ecosystem | Weekly Downloads | Key Innovation |
|---------|-----------|-----------------|----------------|
| **@daml/ledger** | Canton/Daml | <5K | Streaming queries, party-scoped API |
| **@daml/react** | Canton/Daml (React) | <5K | Contract streaming hooks |

### Tier 4: Emerging Patterns

| Library | Ecosystem | Key Innovation |
|---------|-----------|----------------|
| **Surf** (Thala Labs) | Aptos/Move | Runtime ABI type inference (no codegen) |
| **Telescope** | Cosmos | Protobuf → TypeScript AST transpilation |

---

## 2. Type Generation Approaches

### Comparison Matrix

| Approach | Library | Build Step | Type Fidelity | DX | Maintenance |
|----------|---------|-----------|---------------|-----|-------------|
| Runtime inference | viem/ABIType | None | Medium | Excellent | Low |
| Codegen from ABI | TypeChain | Required | High | Good | Medium |
| Codegen from IDL | Anchor | Auto (build) | High | Good | Medium |
| Codegen from Proto | Telescope | Required | Full | Good | High |
| Codegen from DAR | daml codegen js | Required | Full | Fair | Medium |
| Runtime inference | Surf (Aptos) | None | Medium | Excellent | Low |

### How viem/ABIType Works

Developers declare ABIs with `as const` and get full autocomplete, type-checked arguments, and return type inference automatically at compile time — no codegen step. TypeScript's conditional types infer parameter and return types from the ABI definition.

**Limitation:** TypeScript cannot import JSON `as const`, so ABIs must be inlined or processed by a tool like `@wagmi/cli`.

### How Daml Codegen Works

`daml codegen js` (or `dpm codegen-js`) generates TypeScript from DAR files:
- Daml records → TypeScript object types
- Daml variants → discriminated unions with `tag` field
- Daml enums → string union types (`'Red' | 'Blue'`)
- `Time`, `Decimal`, `Numeric`, `Int` → `string` (avoids JSON precision loss)
- Templates → full types including all choices

### Canton Recommendation: Hybrid Codegen + Inference

Canton's Daml type system is too rich for pure runtime inference (variants, nested optionals, template/choice relationships). The recommended approach:

1. **Generate TypeScript types from Daml models** — modern ESM output, tree-shakeable
2. **Make generated types inference-friendly** — use `as const` patterns where possible so higher-level APIs can infer types from generated definitions
3. **Keep generated code minimal** — generate types and companion objects, not full client wrappers; let the core library provide generic type-parameterized functions

This gives the reliability of codegen with the ergonomics of inference-based APIs.

---

## 3. Transport Layer Patterns

### viem's Transport Architecture

viem cleanly separates Clients from Transports:

```typescript
// viem pattern
const client = createPublicClient({
  transport: http('https://mainnet.infura.io/v3/...'),
})

// Available transports:
http(url)           // HTTP JSON-RPC, supports batching
webSocket(url)      // WebSocket with reconnection + keep-alive
custom(provider)    // EIP-1193 (injected wallets)
fallback([t1, t2])  // Ordered failover
```

### gRPC in the Browser: ConnectRPC vs gRPC-Web

| Feature | ConnectRPC (connect-es) | gRPC-Web |
|---------|------------------------|----------|
| Proxy required | No | Yes (Envoy) |
| TypeScript output | Idiomatic | Java-like |
| Streaming | Full (server + client) | Server-only |
| Format | JSON + Protobuf | Binary only |
| Browser + Node | Yes (Node 18+) | Yes |

**ConnectRPC** is the modern choice — no proxy, idiomatic TypeScript, JSON by default for debuggability with binary Protobuf for performance.

### Canton Recommendation

Adopt viem-inspired transport abstraction with Canton-specific transports:

```typescript
// Conceptual API
const client = createLedgerClient({
  transport: grpc({ url: 'https://canton-node:5001' }),
})

const client = createLedgerClient({
  transport: jsonApi({ url: 'https://canton-json-api:7575' }),
})

const client = createLedgerClient({
  transport: fallback([
    grpc({ url: 'https://primary:5001' }),
    grpc({ url: 'https://secondary:5001' }),
  ]),
})
```

Use **ConnectRPC/connect-es** for the gRPC transport. This gives browser compatibility without a proxy, full TypeScript type safety from proto definitions, and streaming support for transaction subscriptions.

---

## 4. Client Architecture Patterns

### viem's Client Types

| Client | Purpose | Actions |
|--------|---------|---------|
| Public Client | Read-only chain data | getBlock, getTransaction, readContract |
| Wallet Client | Write operations | sendTransaction, signMessage, writeContract |
| Test Client | Local dev manipulation | mine, impersonateAccount, setBalance |

Clients are **composable via `.extend()`**:

```typescript
const client = createTestClient({...})
  .extend(publicActions)
  .extend(walletActions)
```

### ethers.js: Provider/Signer Separation

- **Provider** — read-only connection (equivalent to Public Client)
- **Signer** — has keys, can sign transactions (equivalent to Wallet Client)

### @daml/ledger: Party-Scoped Client

- Single `Ledger` class, scoped to a party via JWT token
- Methods: `create`, `exercise`, `exerciseByKey`, `query`, `streamQueries`, `fetch`
- No separation between read/write — party identity determines permissions

### Canton Recommendation: Party-Aware Client Architecture

Canton's party-based model requires a different client hierarchy than Ethereum's account-based model:

```
LedgerClient (read/write, scoped to a party + token)
  - createContract(template, payload)
  - exerciseChoice(contractId, choice, argument)
  - queryContracts(template, filter?)
  - streamContracts(template, filter?)

AdminClient (node administration)
  - allocateParty(hint, displayName)
  - uploadDar(darFile)
  - listPackages()
  - getParticipantStatus()

TestClient (extends LedgerClient + AdminClient)
  - allocateParty(...)
  - advanceTime(duration)
  - resetLedger()
```

Key difference from viem: **Canton clients are party-scoped, not account-scoped.** A party's identity is carried via JWT, not a private key.

---

## 5. Tree-Shaking & Bundle Size

### Why It Matters

Client libraries ship to browsers. End users should not download 100KB+ to interact with a blockchain. viem achieves ~35KB bundle size through disciplined engineering.

### Key Patterns

| Pattern | Impact | Example |
|---------|--------|---------|
| Function exports (not classes) | Classes can't be partially tree-shaken | `export function getBlock()` not `class Client { getBlock() }` |
| ESM-only or ESM-first | CJS `require()` defeats static analysis | `"type": "module"` in package.json |
| `sideEffects: false` | Tells bundlers all modules are pure | `"sideEffects": false` in package.json |
| Subpath exports | Multiple entrypoints, one package | `cantonjs/ledger`, `cantonjs/admin` |
| No barrel re-exports | `export * from './everything'` defeats shaking | Import from specific subpaths |

### Canton Recommendation

- **Function exports exclusively** — no class-based API
- **ESM with `sideEffects: false`**
- **Subpath exports**: `cantonjs/ledger`, `cantonjs/admin`, `cantonjs/codegen`, `cantonjs/testing`
- **Bundle size tracking in CI** (e.g., `size-limit` package) to catch regressions

---

## 6. Error Handling Patterns

### viem's Error Architecture

viem has a sophisticated error system built around `BaseError`:

- **`shortMessage`** — concise description
- **`details`** — technical specifics
- **`metaMessages`** — array of contextual hints for recovery
- **`docsPath`** — link to relevant documentation
- **`walk()`** method — traverses the cause chain to find specific error types
- **Module-specific error types** exported as union types (e.g., `GetBlockNumberErrorType`)

### ethers.js: Error Codes

Uses string error codes (`CALL_EXCEPTION`, `INSUFFICIENT_FUNDS`, `NONCE_EXPIRED`) that require string matching in catch blocks.

### Canton Recommendation: Structured Error Hierarchy

```
CantonjsError (base)
  ├── TransportError
  │     ├── GrpcError (with gRPC status code)
  │     ├── HttpError (with HTTP status, headers)
  │     └── ConnectionError
  ├── LedgerError
  │     ├── CommandRejectedError (with rejection reason)
  │     ├── ContractNotFoundError
  │     ├── AuthorizationError
  │     └── PartyNotAllocatedError
  ├── AuthError
  │     ├── TokenExpiredError
  │     └── InvalidTokenError
  └── CodegenError
        └── TypeMismatchError
```

Include:
- **`walk()` method** for traversing cause chains
- **`docsPath`** linking to relevant Canton documentation
- **`metaMessages`** with recovery suggestions
- **Error type exports** per module for typed catch blocks
- **Complementary error code ranges** with cantonctl (cantonctl uses E1xxx-E8xxx)

---

## 7. Testing Patterns

### viem's Test Client

```typescript
const testClient = createTestClient({
  chain: foundry,
  mode: 'anvil',
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions)

// Test-only actions:
await testClient.mine({ blocks: 1 })
await testClient.impersonateAccount({ address: '0x...' })
await testClient.setBalance({ address: '0x...', value: parseEther('100') })
```

### Key Pattern: Simulate Before Submit

viem encourages `simulateContract` before `writeContract` to catch errors before spending gas. Analogous to Canton dry-run/simulation.

### Canton Recommendation

Provide a **`createTestClient` abstraction**:

```typescript
const testClient = createCantonTestClient({
  sandboxPort: 6865,
  parties: ['Alice', 'Bob'],
})

// All normal client methods plus:
await testClient.allocateParty({ hint: 'Charlie' })
await testClient.advanceTime({ seconds: 3600 })
await testClient.resetLedger()
```

Additionally provide:
- **Sandbox lifecycle helpers** — start/stop/reset for vitest/jest
- **Integration + unit test patterns** — real sandbox for integration, mock transport with recorded responses for unit tests
- **Alignment with cantonctl's test infrastructure** — cantonjs test utilities should work with `cantonctl test` workflows

---

## 8. React / Framework Integration

### wagmi: The Three-Layer Architecture

```
Layer 1: viem           — pure TypeScript, no framework deps
Layer 2: @wagmi/core    — framework-agnostic state management
Layer 3: wagmi (React)  — React hooks, TanStack Query integration
```

Key patterns:
- **TanStack Query as peer dependency** — users control caching, deduplication, persistence
- **Queries vs Mutations** — reads are cached queries, writes are mutations
- **Query key exports** — manual cache manipulation when needed
- **`useClient` hook** — escape hatch for direct viem access

### @daml/react Pattern

- `DamlLedger` context provider wrapping app with connection config
- Hooks: `useParty()`, `useLedger()`, `useStreamFetchByKeys()`
- Multi-party support via `createLedgerContext()`

### Canton Recommendation

Follow wagmi's three-layer architecture:

1. **`cantonjs`** — pure TypeScript functions, no framework dependency
2. **`cantonjs-react`** (separate package) — React hooks built on TanStack Query
   - `useContracts(template)` — query active contracts
   - `useExercise(template, choice)` — mutation for exercising choices
   - `useParty()` — current party context
   - `useStreamContracts(template)` — streaming subscription via WebSocket
3. **TanStack Query as peer dependency** (not bundled)
4. **Optimistic updates** — update contract query cache before transaction confirms

---

## 9. Package Structure

### Comparison

| Strategy | Library | Packages | Pros | Cons |
|----------|---------|----------|------|------|
| Single + subpaths | viem | 1 | Simple install, no version conflicts | Full pkg installed (tree-shaking mitigates) |
| Monorepo | CosmJS | 20+ | Granular installation | Complex releases, diamond deps |
| Hybrid | wagmi | 3 (viem, core, react) | Clean layer boundaries | Multiple versions to track |

### Canton Recommendation: Hybrid (viem + wagmi pattern)

- **`cantonjs`** — single core package with subpath exports:
  - `cantonjs` — main entry (re-exports common functions)
  - `cantonjs/ledger` — Ledger API client
  - `cantonjs/admin` — Admin API client
  - `cantonjs/codegen` — runtime support for generated types
  - `cantonjs/testing` — test utilities and sandbox helpers
  - `cantonjs/chains` — Canton network definitions (LocalNet, DevNet, TestNet, MainNet)
- **`cantonjs-react`** — separate package (React is a different dependency tree)
- **`cantonjs-codegen-cli`** — separate package if codegen has heavy dependencies (protobuf compiler)

---

## 10. Lessons from Library Evolution

### ethers.js → viem Migration

viem explicitly positions itself as a better ethers.js. Key improvements:

| ethers.js Problem | viem Solution |
|-------------------|---------------|
| Monolithic classes | Tree-shakeable functions |
| Inconsistent naming | Predictable action names |
| Poor TypeScript types | End-to-end type safety |
| No batch requests | Built-in multicall |
| Silent failures | Explicit error types |
| Heavy bundle (~120KB) | ~35KB with tree-shaking |

### @daml/ledger Limitations (Canton's Current Library)

| Limitation | cantonjs Improvement |
|-----------|---------------------|
| Class-based API | Function exports, tree-shakeable |
| No transport abstraction | Pluggable transports (gRPC, JSON API) |
| Weak TypeScript types | Codegen with inference-friendly output |
| No test utilities | First-class `createTestClient` |
| No error hierarchy | Structured errors with recovery hints |
| No streaming reconnection | Auto-reconnect with backoff |
| No framework integration | Three-layer architecture (core + React) |
| CJS only | ESM-first with `sideEffects: false` |

### Truffle/Brownie → Foundry/viem Pattern

Across blockchain ecosystems, the same pattern repeats:
- Incumbents (Truffle, web3.js, ethers.js) lose to tools that are **faster, type-safer, and tree-shakeable**
- **Incumbency provides no protection** — developers switch rapidly when DX improves
- Canton's `@daml/ledger` is at the "Truffle stage" — functional but not optimized for modern DX

---

## 11. Cross-Cutting Analysis: What Winners Share

| Property | viem | wagmi | CosmJS | Anchor | cantonjs Target |
|----------|------|-------|--------|--------|-----------------|
| TypeScript-first | Yes | Yes | Yes | Yes | Yes |
| Tree-shakeable | Yes | Yes | Partial | No | Yes |
| Transport abstraction | Yes | Via viem | Yes | No | Yes |
| Structured errors | Yes | Via viem | Partial | No | Yes |
| Test client | Yes | Via viem | No | Yes | Yes |
| Framework hooks | Via wagmi | Yes | No | No | Yes (cantonjs-react) |
| Codegen | Optional | Optional | Required | Auto | Required |
| Bundle size tracking | Yes | Yes | No | No | Yes |
| Docs site | Yes | Yes | Yes | Yes | Yes |

---

## 12. Strategic Implications for cantonjs

### Must-Have (Day 1)

1. **Composable transport abstraction** — JSON API (HTTP) + gRPC (ConnectRPC)
2. **Party-scoped LedgerClient** — create, exercise, query, stream
3. **AdminClient** — party allocation, DAR upload, package management
4. **Codegen from Daml** — modern ESM types with inference support
5. **Structured error hierarchy** — complementary with cantonctl error codes
6. **Tree-shakeable ESM** — function exports, `sideEffects: false`, subpath exports

### Should-Have (v1.0)

7. **TestClient** — sandbox lifecycle, party allocation, time manipulation
8. **Streaming** — contract subscriptions with auto-reconnect
9. **JWT management** — token generation, refresh, OS keychain integration (shared with cantonctl)
10. **Chain definitions** — LocalNet, DevNet, TestNet, MainNet configs

### Nice-to-Have (Post v1.0)

11. **`cantonjs-react`** — React hooks with TanStack Query
12. **Zenith EVM bridge** — interact with Canton's EVM layer via viem-compatible interface
13. **MCP server integration** — expose cantonjs operations to AI agents

---

## References

- [viem Documentation](https://viem.sh)
- [viem GitHub](https://github.com/wevm/viem)
- [ABIType](https://abitype.dev/)
- [wagmi Documentation](https://wagmi.sh)
- [ethers.js Documentation](https://docs.ethers.org)
- [CosmJS GitHub](https://github.com/cosmos/cosmjs)
- [Telescope GitHub](https://github.com/cosmology-tech/telescope)
- [ConnectRPC / connect-es](https://github.com/connectrpc/connect-es)
- [Anchor TypeScript Client](https://www.anchor-lang.com/docs/clients/typescript)
- [@daml/ledger](https://www.npmjs.com/package/@daml/ledger)
- [@daml/react](https://www.npmjs.com/package/@daml/react)
- [Surf (Aptos)](https://aptos.dev/build/sdks/ts-sdk/type-safe-contract)
- [Daml JS Codegen](https://docs.daml.com/app-dev/bindings-ts/daml2js.html)
- [TypeChain GitHub](https://github.com/dethcrypto/TypeChain)
- [Canton Network Documentation](https://docs.canton.network)
