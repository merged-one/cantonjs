# ADR 0001: TypeScript with Function Exports

> [!NOTE]
> Historical ADR. It may reference earlier positioning or package scope. For the current product boundary, see [Positioning](/positioning) and [Package Architecture](/guide/package-architecture).

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

cantonjs is a client library that will be used in both Node.js servers and browser dApps. Bundle size and tree-shakeability directly impact end-user experience. Our research of 8+ blockchain client libraries ([blockchain-client-library-research.md](../research/blockchain-client-library-research.md)) shows that class-based APIs (ethers.js ~120KB, web3.js ~300KB+) cannot be partially tree-shaken, while function-based APIs (viem ~35KB) enable bundlers to drop unused code.

71% of Canton developers come from EVM backgrounds where viem's function-based pattern is now the standard.

## Decision

Build cantonjs as a TypeScript-first library using **function exports** (not classes) for all public APIs.

- `createLedgerClient()` not `new LedgerClient()`
- `createAdminClient()` not `new AdminClient()`
- `jsonApi()` not `new JsonApiTransport()`

Ship as ESM-first with `sideEffects: false` and subpath exports. Provide CJS fallback via dual build.

## Consequences

### Positive
- Tree-shakeable: bundlers drop unused functions automatically
- Each function is independently testable and composable
- Consistent with viem, wagmi, and modern JS ecosystem patterns
- Smaller production bundles for dApps

### Negative
- Less familiar "OOP" feel for developers from Canton's JVM/Scala ecosystem
- More verbose imports compared to single class import
- Factory functions require explicit dependency passing (a feature for testability)

## References

- [viem architecture](https://viem.sh/docs/introduction)
- [blockchain-client-library-research.md](../research/blockchain-client-library-research.md) — Section 3: Tree-Shaking & Bundle Size
- [cantonctl DESIGN_DECISIONS.md](https://github.com/merged-one/cantonctl/blob/main/docs/DESIGN_DECISIONS.md) — Decision 1: TypeScript
