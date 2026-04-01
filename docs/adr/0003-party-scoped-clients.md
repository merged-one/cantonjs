# ADR 0003: Party-Scoped Client Architecture

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

Canton's fundamental identity unit is the **party**, not the account or address. A party's permissions are encoded in their JWT token, not derived from a private key. This is a structural difference from Ethereum's account-based model.

viem separates clients by capability (PublicClient for reads, WalletClient for writes, TestClient for dev). Canton needs a different separation aligned with its party-based model.

The existing `@daml/ledger` library scopes to a party via JWT — this is the correct abstraction that cantonjs should follow.

## Decision

Three client types, each created via factory functions:

- **`createLedgerClient({ transport, actAs, readAs? })`** — Party-scoped contract operations: create, exercise, query, stream. The primary client for dApp developers.
- **`createAdminClient({ transport })`** — Node administration: party allocation, user management, package upload. Requires privileged JWT.
- **`createTestClient({ transport, party? })`** — Extends LedgerClient + AdminClient with sandbox manipulation: time control, party batch allocation.

## Consequences

### Positive
- Aligns with Canton's actual security model (party-based, JWT-driven)
- Familiar to existing Daml developers
- Clean separation of concerns (ledger operations vs. administration vs. testing)
- TestClient composes LedgerClient + AdminClient naturally

### Negative
- Different from Ethereum mental model (may confuse EVM-native developers arriving via Zenith)
- Switching parties requires creating a new client or re-tokenizing
- Three clients to learn vs. viem's composable `.extend()` pattern

## References

- [@daml/ledger API](https://www.npmjs.com/package/@daml/ledger) — Existing party-scoped pattern
- [viem clients](https://viem.sh/docs/clients/intro) — Public/Wallet/Test separation
- [canton-ledger-api-research.md](../research/canton-ledger-api-research.md) — Section 6: Authentication Model
