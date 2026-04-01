# ADR 0004: Structured Error Model Aligned with cantonctl

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

cantonctl uses structured `CantonctlError` instances with error codes (E1xxx-E8xxx), recovery suggestions, and documentation URLs. viem uses `BaseError` with `walk()`, `docsPath`, `metaMessages`, and module-specific error type exports. Both approaches dramatically improve developer experience over generic `Error` throws.

cantonjs must provide errors that are both useful standalone and complementary to cantonctl's error system.

## Decision

Implement a `CantonjsError` base class with:

- **`code`** — Error code in `CJxxxx` format (complementary to cantonctl's `Exxxx`)
- **`shortMessage`** — Concise description
- **`metaMessages`** — Array of recovery suggestions
- **`docsPath`** — Link to relevant documentation
- **`walk(predicate?)`** — Traverse the cause chain to find specific error types
- **`cause`** — Original error for chaining

Error code ranges:
| Range | Domain |
|-------|--------|
| CJ1xxx | Transport (connection, HTTP, gRPC, timeout) |
| CJ2xxx | Authentication (JWT, token lifecycle) |
| CJ3xxx | Ledger (command rejection, contract not found) |
| CJ4xxx | Admin (party, user, package management) |
| CJ5xxx | Streaming (subscription, reconnection) |
| CJ6xxx | Codegen (type mismatch, generation) |

## Consequences

### Positive
- Consistent error experience across cantonctl + cantonjs
- Recovery suggestions reduce time-to-resolution
- `walk()` enables finding specific errors deep in cause chains
- Error type exports enable typed catch blocks

### Negative
- More complex error system to maintain
- Error code ranges must be coordinated with cantonctl
- Developers may still catch generic `Error` and miss the structured information

## References

- [viem error handling](https://viem.sh/docs/error-handling)
- [cantonctl error system](https://github.com/merged-one/cantonctl/blob/main/CLAUDE.md) — Error code ranges
- [blockchain-client-library-research.md](../research/blockchain-client-library-research.md) — Section 4: Error Handling Patterns
