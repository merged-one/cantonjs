# cantonjs — viem for Canton

TypeScript interface for the Canton Network Ledger API V2.

## Quick Reference

```bash
npm test              # Run all tests
npm run build         # Build ESM + CJS + types
npm run typecheck     # Type-check without emitting
npm run lint          # Lint source files
npm run size          # Check bundle size limits
```

## Architecture Rules

1. **Function exports, not classes** — Every public API is a function, not a class. This enables tree-shaking. `createLedgerClient()`, not `new LedgerClient()`.

2. **Dependency injection** — All I/O goes through the `Transport` interface. No direct `fetch()` calls in client code. Tests use mock transports, never `vi.mock()`.

3. **AbortSignal support** — Long-running operations (streaming, commands) accept an `AbortSignal` for cancellation.

4. **Structured errors** — Every error is a `CantonjsError` with `code` (CJxxxx), `metaMessages` (recovery hints), and `docsPath`. Use `walk()` to traverse cause chains.

5. **ESM-first, tree-shakeable** — Ship ESM + CJS via dual build. Mark `sideEffects: false`. Use subpath exports (`cantonjs/ledger`, `cantonjs/admin`, etc.).

6. **Party-scoped clients** — `LedgerClient` is scoped to a party via JWT. `AdminClient` is for node management. `TestClient` extends both.

7. **Test-first TDD** — Write the test, then the implementation. Target 90%+ coverage.

## Error Code Ranges

Complementary to cantonctl's E1xxx-E8xxx:

| Range | Domain |
|-------|--------|
| CJ1xxx | Transport (connection, HTTP, gRPC, timeout) |
| CJ2xxx | Authentication (JWT, token lifecycle) |
| CJ3xxx | Ledger (command rejection, contract not found, authorization) |
| CJ4xxx | Admin (party, user, package management) |
| CJ5xxx | Streaming (subscription, reconnection) |
| CJ6xxx | Codegen (type mismatch, generation) |

## Module Layout

| Module | Purpose |
|--------|---------|
| `src/clients/` | Client factories (LedgerClient, AdminClient, TestClient) |
| `src/transport/` | Transport abstraction (JSON API, future gRPC) |
| `src/types/` | Core Canton data types (contracts, parties, commands, transactions) |
| `src/errors/` | Structured error hierarchy |
| `src/chains/` | Network definitions (localNet, devNet, testNet, mainNet) |
| `src/ledger/` | Subpath barrel: `cantonjs/ledger` |
| `src/admin/` | Subpath barrel: `cantonjs/admin` |
| `src/testing/` | Subpath barrel: `cantonjs/testing` |

## Test Patterns

- **Mock transport** — Create a `Transport` with `request: vi.fn().mockResolvedValue(response)` for unit tests
- **No vi.mock()** — Inject dependencies through function parameters
- **Integration tests** — Will run against Canton sandbox (Phase 4)

## Canton Concepts

- **Party** — Fundamental identity unit (not account/address)
- **Template** — Daml contract definition (like a Solidity contract)
- **Choice** — An operation on a contract (like a function call)
- **ContractId** — Unique identifier for a contract instance (UTXO model)
- **DAR** — Daml Archive, the deployment artifact
- **Synchronizer** — Canton's consensus domain (replaces "domain")

## Companion Project

cantonctl (https://github.com/merged-one/cantonctl) is the CLI counterpart — "Hardhat for Canton." cantonjs shares error conventions, JWT format, and testing philosophy with cantonctl.
