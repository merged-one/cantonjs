# cantonjs — viem for Canton

TypeScript interface for the Canton Network Ledger API V2.

## Quick Reference

```bash
npm test              # Run all tests (core package)
npm run test:coverage # Run enforced root coverage gate
npm run test:coverage:all  # Run coverage gates for root and all packages
npm run verify:ci:pr  # Run the full PR validation suite locally
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
| `src/streaming/` | WebSocket streaming (streamUpdates, streamContracts, streamCompletions) |
| `src/types/` | Core Canton data types (contracts, parties, commands, transactions) |
| `src/errors/` | Structured error hierarchy |
| `src/chains/` | Network definitions (localNet, devNet, testNet, mainNet) |
| `src/codegen/` | Runtime support for generated types (TemplateDescriptor, InferPayload) |
| `src/ledger/` | Subpath barrel: `cantonjs/ledger` |
| `src/admin/` | Subpath barrel: `cantonjs/admin` |
| `src/testing/` | Subpath barrel: `cantonjs/testing` |

### Separate Package

| Package | Purpose |
|---------|---------|
| `packages/cantonjs-codegen/` | CLI tool: DAR → TypeScript codegen (`cantonjs-codegen --dar <path> --output <dir>`) |
| `packages/cantonjs-react/` | React hooks for Canton dApps (CantonProvider, useContracts, useCreateContract, useExercise, useStreamContracts) |

## Test Patterns

- **Mock transport** — Create a `Transport` with `request: vi.fn().mockResolvedValue(response)` for unit tests
- **No vi.mock()** — Inject dependencies through function parameters
- **`createMockTransport()`** — Helper with response sequences, error injection, and call assertions
- **`createRecordingTransport()`** — Wraps a real transport, records all exchanges for replay
- **`setupCantonSandbox()`** — Vitest fixture: starts Canton sandbox via cantonctl, waits for health, returns TestClient
- **Integration tests** — Run against Canton sandbox via cantonctl

## Canton Concepts

- **Party** — Fundamental identity unit (not account/address)
- **Template** — Daml contract definition (like a Solidity contract)
- **Choice** — An operation on a contract (like a function call)
- **ContractId** — Unique identifier for a contract instance (UTXO model)
- **DAR** — Daml Archive, the deployment artifact
- **Synchronizer** — Canton's consensus domain (replaces "domain")

## Companion Project

cantonctl (https://github.com/merged-one/cantonctl) is the CLI counterpart — "Hardhat for Canton." cantonjs shares error conventions, JWT format, and testing philosophy with cantonctl.
