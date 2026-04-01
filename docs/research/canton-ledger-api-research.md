# Canton Ledger API V2 Research

> Complete API surface analysis for cantonjs — every service, endpoint, and type that cantonjs must wrap.

**Date:** 2026-04-01
**Author:** Charles Dusek
**Status:** Complete

---

## Executive Summary

Canton exposes two parallel API surfaces: a **gRPC Ledger API** (protobuf-based, primary) and a **JSON Ledger API** (HTTP + WebSocket). Both provide near-identical functionality for the Ledger API V2 (`com.daml.ledger.api.v2`). Canton also has a separate **Admin API** (gRPC only) for topology and node management. cantonjs must wrap both transport layers, providing a unified TypeScript interface.

The existing TypeScript libraries (`@daml/ledger`, `@daml/react`) target the **old JSON API v1** and are functionally outdated for Canton 3.x. The `@canton-network/dapp-sdk` handles CIP-0103 wallet connections but does not provide general Ledger API access. This creates a clear gap for cantonjs to fill.

---

## 1. Transport Layers

### gRPC Ledger API (Primary)
- **Proto package:** `com.daml.ledger.api.v2` (ledger) and `com.daml.ledger.api.v2.admin` (admin)
- **Default port:** 6865 (participant node)
- **Supports:** Unary RPCs + server-side streaming
- **Auth:** JWT Bearer token via gRPC metadata

### JSON Ledger API (HTTP + WebSocket)
- **OpenAPI 3.0.3 spec:** `http://<host>:<port>/docs/openapi`
- **AsyncAPI spec (WebSocket):** `http://<host>:<port>/docs/asyncapi`
- **All endpoints under:** `/v2/` prefix
- **Default port:** 7575
- **Auth:** Bearer JWT (`httpAuth`) or API key (`apiKeyAuth`)
- **Health:** `GET /livez` (unauthenticated)

### Canton Admin API (gRPC Only)
- **Proto package:** `com.digitalasset.canton.topology.admin.v30`
- **Separate port** from Ledger API
- **Used for:** Topology management, node administration

---

## 2. gRPC Ledger API V2 Services

### 2.1 CommandService (Unary — Synchronous Submission)

| Method | Request | Response | Notes |
|--------|---------|----------|-------|
| SubmitAndWait | SubmitAndWaitRequest | SubmitAndWaitResponse | Atomic transaction |
| SubmitAndWaitForTransaction | SubmitAndWaitForTransactionRequest | SubmitAndWaitForTransactionResponse | Returns flat transaction |
| SubmitAndWaitForUpdateId | SubmitAndWaitRequest | SubmitAndWaitForUpdateIdResponse | Lightweight |

> **Note:** `SubmitAndWaitForTransactionTree` was **removed in Canton 3.4**. Use `SubmitAndWaitForTransaction` with tree format instead.

### 2.2 CommandSubmissionService (Unary — Async Submission)

| Method | Request | Response | Notes |
|--------|---------|----------|-------|
| Submit | SubmitRequest | SubmitResponse | Fire-and-forget |
| SubmitReassignment | SubmitReassignmentRequest | SubmitReassignmentResponse | Contract reassignment between synchronizers |

### 2.3 CommandCompletionService (Server-Streaming)

| Method | Request | Response | Notes |
|--------|---------|----------|-------|
| CompletionStream | CompletionStreamRequest | stream CompletionStreamResponse | Track command outcomes |

### 2.4 UpdateService (Server-Streaming + Unary)

| Method | Type | Notes |
|--------|------|-------|
| GetUpdates | Stream | Primary subscription — flat events |
| GetUpdateTrees | Stream | Tree-shaped transactions |
| GetTransactionByOffset | Unary | Lookup by offset |
| GetTransactionById | Unary | Lookup by ID |
| GetTransactionTreeByOffset | Unary | Tree lookup by offset |
| GetTransactionTreeById | Unary | Tree lookup by ID |
| GetUpdateByOffset | Unary | Generic update lookup |
| GetUpdateById | Unary | Generic update lookup |

Update shapes: `TRANSACTION_SHAPE_ACS_DELTA` (created/archived) or `TRANSACTION_SHAPE_LEDGER_EFFECTS` (full trees). Updates contain transactions, reassignments, and topology transactions.

### 2.5 StateService (Server-Streaming + Unary)

Replaces v1 `ActiveContractsService`.

| Method | Type | Notes |
|--------|------|-------|
| GetActiveContracts | Stream | Streaming ACS snapshot |
| GetConnectedSynchronizers | Unary | List connected sync domains |
| GetLedgerEnd | Unary | Current ledger end offset |
| GetLatestPrunedOffsets | Unary | Pruning state |

### 2.6 EventQueryService (Unary)

| Method | Notes |
|--------|-------|
| GetEventsByContractId | All events for a contract |

### 2.7 PackageService (Unary)

| Method | Notes |
|--------|-------|
| ListPackages | List package IDs |
| GetPackage | Returns binary DALF |
| GetPackageStatus | Registration status |

### 2.8 VersionService (Unary)

| Method | Notes |
|--------|-------|
| GetLedgerApiVersion | May be unauthenticated |

### 2.9 InteractiveSubmissionService (External Signing)

| Method | Notes |
|--------|-------|
| PrepareSubmission | Returns transaction + hash for external signing |
| ExecuteSubmission | Submit externally-signed transaction |
| ExecuteSubmissionAndWait | Blocking variant (Canton 3.4+) |
| ExecuteSubmissionAndWaitForTransaction | Blocking variant (Canton 3.4+) |
| GetPreferredPackageVersion | Package version resolution |

**Flow:** Prepare (get hash) → Sign externally → Execute (submit signature). Hashing algorithm V2 (Canton 3.3+), not backward-compatible with V1.

---

## 3. gRPC Admin Services

### 3.1 UserManagementService

| Method | Notes |
|--------|-------|
| CreateUser | Create user with rights |
| GetUser | Get user details |
| UpdateUser | Update user metadata |
| DeleteUser | Remove user |
| ListUsers | List all users |
| GrantRights | Add rights to user |
| RevokeRights | Remove rights from user |
| ListUserRights | Get user's current rights |

### 3.2 PartyManagementService

| Method | Notes |
|--------|-------|
| GetParticipantId | Get participant identifier |
| GetParties | Get specific parties |
| ListKnownParties | List all parties (supports `filterParty` in 3.4.10+) |
| AllocateParty | Allocate new party |
| AllocateExternalParty | External party (CIP-0103) |
| UpdatePartyDetails | Update display name, etc. |
| UpdatePartyIdentityProviderId | Move party between IDPs |
| GenerateExternalPartyTopology | Topology for external parties |

### 3.3 PackageManagementService (Experimental)

| Method | Notes |
|--------|-------|
| ListKnownPackages | List with metadata |
| UploadDarFile | Upload DAR binary |
| ValidateDarFile | Validate without uploading |
| UpdateVettedPackages | Manage package vetting |

### 3.4 IdentityProviderConfigService

Full CRUD for identity provider configurations. Multiple IDPs supported at runtime; each IDP gets isolated user/party namespace.

### 3.5 Other Admin Services

| Service | Notes |
|---------|-------|
| ParticipantPruningService | Prune ledger history |
| CommandInspectionService | Get command status (experimental) |
| TimeService (testing) | GetTime / SetTime for static-time sandbox |

---

## 4. JSON Ledger API V2 HTTP Endpoints

All endpoints require `httpAuth` (Bearer JWT) or `apiKeyAuth`.

### Commands
| Method | Path |
|--------|------|
| POST | `/v2/commands/submit-and-wait` |
| POST | `/v2/commands/submit-and-wait-for-transaction` |
| POST | `/v2/commands/submit-and-wait-for-reassignment` |
| POST | `/v2/commands/submit-and-wait-for-transaction-tree` |
| POST | `/v2/commands/async/submit` |
| POST | `/v2/commands/async/submit-reassignment` |
| POST | `/v2/commands/completions` |

### Interactive Submission
| Method | Path |
|--------|------|
| POST | `/v2/interactive-submission/prepare` |
| POST | `/v2/interactive-submission/execute` |

### State
| Method | Path |
|--------|------|
| POST | `/v2/state/active-contracts` |
| GET | `/v2/state/connected-synchronizers` |
| GET | `/v2/state/ledger-end` |
| GET | `/v2/state/latest-pruned-offsets` |

### Updates (Streaming via WebSocket available)
| Method | Path |
|--------|------|
| POST | `/v2/updates` |
| POST | `/v2/updates/flats` |
| POST | `/v2/updates/trees` |
| GET | `/v2/updates/transaction-tree-by-offset/{offset}` |
| POST | `/v2/updates/transaction-by-offset` |
| POST | `/v2/updates/update-by-offset` |
| POST | `/v2/updates/transaction-by-id` |
| POST | `/v2/updates/update-by-id` |
| GET | `/v2/updates/transaction-tree-by-id/{update-id}` |

### Events
| Method | Path |
|--------|------|
| POST | `/v2/events/events-by-contract-id` |

### Parties
| Method | Path |
|--------|------|
| GET | `/v2/parties` |
| POST | `/v2/parties` |
| GET | `/v2/parties/participant-id` |
| GET | `/v2/parties/{party}` |
| PATCH | `/v2/parties/{party}` |
| POST | `/v2/parties/external/allocate` |
| POST | `/v2/parties/external/generate-topology` |

### Users
| Method | Path |
|--------|------|
| GET/POST | `/v2/users` |
| GET/DELETE/PATCH | `/v2/users/{user-id}` |
| GET | `/v2/authenticated-user` |
| GET/POST | `/v2/users/{user-id}/rights` |

### Packages & DARs
| Method | Path |
|--------|------|
| GET/POST | `/v2/packages` |
| GET | `/v2/packages/{package-id}` |
| GET | `/v2/packages/{package-id}/status` |
| POST | `/v2/dars` |
| POST | `/v2/dars/validate` |
| GET/POST | `/v2/package-vetting` |

### Version & Health
| Method | Path | Notes |
|--------|------|-------|
| GET | `/v2/version` | API version info |
| GET | `/livez` | Unauthenticated liveness |

---

## 5. Authentication Model

### JWT Token Structure
- **Standard claims:** `sub` (user ID), `aud` (audience), `scope`, `exp`, `nbf`, `iat`
- **Default scope:** `daml_ledger_api`
- **Default audience:** `https://daml.com/participant/jwt/aud/participant/${participantId}`
- **Supported algorithms:** RS256, ES256, ES512
- **Key sources:** X.509 certificates (PEM/DER) or JWKS endpoints

### Token Types
1. **User access tokens** — `sub` maps to UserManagementService user; rights resolved server-side
2. **Privileged tokens** — `privileged: true` with `access-level: "Admin" | "Wildcard"` for admin APIs
3. **Party access tokens** (legacy) — directly embed party rights in token claims

### Identity Providers
- Multiple IDPs at runtime via IdentityProviderConfigService
- Each IDP gets isolated user/party namespace
- Token `iss` field used as IDP identifier

### CIP-0103 (dApp API Standard)
- Canton's equivalent of Ethereum's EIP-1193
- JSON-RPC 2.0 interface between dApps and wallet providers
- `window.canton` provider interface
- Wallet discovery, connection flow, account management
- JWT tokens verified via remote JWK sets from Wallet Gateway

---

## 6. Core Data Model

### Commands
- **Atomic:** each command creates a contract OR exercises a choice
- **Deduplication:** via change ID (`command_id` + `act_as` parties)
- **Deduplication period:** configurable per command
- **Disclosure:** `disclosed_contracts` / `input_contracts` for cross-domain visibility

### Contracts (UTXO Model)
- Contracts are **created and archived** (never mutated in-place)
- Each contract has a unique `ContractId`
- **Template ID:** `package_id:module_name:entity_name`
- **Contract keys:** for addressable lookup (optional)
- **Interface views:** polymorphic access to contract data

### Events
- **CreatedEvent** — contract creation with full arguments
- **ArchivedEvent** — contract archival
- **ExercisedEvent** — choice exercise (tree format only)

### Updates
- **Transaction** — contains events (created/archived)
- **Reassignment** — contract transfer between synchronizers
- **Topology transaction** — topology changes

### Offsets
- String-based ledger offsets for position tracking
- Used for: streaming resumption, ACS snapshots, pruning

---

## 7. Existing TypeScript Libraries — Gap Analysis

### @daml/ledger (v2.10.3) — OUTDATED

Targets old JSON API v1, not Canton 3.x JSON Ledger API V2. Class-based API, CJS only, no transport abstraction, weak types, no tree-shaking.

**Key methods:** `create`, `exercise`, `archive`, `query`, `streamQuery`, `streamFetchByKey`, `allocateParty`, `uploadDarFile`

### @daml/react (v2.10.3) — OUTDATED

Wraps `@daml/ledger` with React hooks. Same v1 API limitations.

**Key hooks:** `useParty`, `useLedger`, `useQuery`, `useStreamQueries`, `useFetchByKey`

### @canton-network/dapp-sdk — CIP-0103 Only

Handles wallet connections via CIP-0103. Does not provide general Ledger API access. cantonjs should integrate with this for wallet-based auth.

### @canton-network/wallet-sdk — Node.js Only

Low-level wallet operations. Node.js only, not suitable for browser dApps.

### Gap Summary

| Capability | @daml/ledger | @canton-network/dapp-sdk | cantonjs Target |
|-----------|-------------|-------------------------|-----------------|
| Ledger API version | v1 (outdated) | N/A | **V2 (Canton 3.x)** |
| Transport | HTTP only | HTTP/SSE | **HTTP + WebSocket + gRPC** |
| Tree-shakeable | No (classes) | No | **Yes (functions)** |
| TypeScript types | Weak | Moderate | **Full codegen** |
| Streaming | WebSocket (v1) | SSE | **WebSocket + gRPC streams** |
| Auth model | JWT only | CIP-0103 | **JWT + CIP-0103** |
| Test utilities | None | None | **First-class** |
| React hooks | @daml/react (v1) | None | **cantonjs-react** |
| External signing | No | Partial | **Full** |
| Bundle optimization | None | None | **ESM + sideEffects: false** |

---

## 8. Canton Token Standard (CIP-56)

Interfaces cantonjs should provide helpers for:

| Interface | Purpose |
|-----------|---------|
| Holding | UTXO-like token balance |
| TransferFactory | Create transfer instructions |
| TransferInstruction | 2-step transfer (Accept/Reject/Withdraw/Update) |
| Mint / Burn | Token issuance and destruction |
| Token Metadata | Symbol, decimals, issuer, supply |

---

## 9. Network Environments

| Environment | Reset Cycle | Access | Notes |
|-------------|-------------|--------|-------|
| LocalNet | N/A | Local Docker | CN Quickstart, local validator + super-validator |
| DevNet | Every 3 months | IP allowlist | First to get upgrades |
| TestNet | Never | Requires MainNet approval | Scan API per super-validator |
| MainNet | Never | Invite-only (GSF approval) | Production, $9T+ monthly volume |

Endpoint pattern: `https://scan.sv-1.{env}.global.canton.network.{operator-domain}`

---

## 10. Zenith EVM Integration

- Native EVM execution layer on Canton (not a bridge)
- Standard Ethereum JSON-RPC (`eth_sendTransaction`, etc.)
- Standard Ethereum tooling works (Hardhat, MetaMask, viem)
- No separate Canton API needed — use standard EVM libraries
- Implication: cantonjs does NOT need to wrap Zenith directly; users use viem for Zenith

---

## 11. Breaking Changes Across Canton 3.x

| Version | Breaking Change |
|---------|----------------|
| 3.3 | InteractiveSubmissionService always enabled; hashing V1→V2 (breaking) |
| 3.3 | `ProcessedDisclosedContract` renamed to `InputContract` |
| 3.4 | `SubmitAndWaitForTransactionTree` removed |
| 3.4 | Proto messages refactored to `crypto.proto` |
| 3.4 | `updateFormat` now required in `GetUpdatesRequest` |
| 3.4 | New `ExecuteSubmissionAndWait` / `ExecuteSubmissionAndWaitForTransaction` |
| 3.4.10 | gRPC upgraded to 1.77.0 |
| 3.4.10 | `ListKnownParties` gained `filterParty` parameter |

**Target Canton version for cantonjs v1.0:** Canton 3.4+ (latest stable)

---

## 12. API Surface cantonjs Must Wrap

### Priority 1 — Core (v0.1.0)
1. **LedgerClient** — `createContract`, `exerciseChoice`, `queryContracts`, `streamContracts`
2. **Command submission** — `submitAndWait`, `submitAndWaitForTransaction`
3. **Active contract queries** — `getActiveContracts` (streaming)
4. **Update streaming** — `getUpdates` (flat + tree)
5. **JWT auth** — token management, refresh
6. **Transport** — JSON API V2 (HTTP + WebSocket)

### Priority 2 — Admin (v0.2.0)
7. **PartyManagement** — allocate, list, update
8. **UserManagement** — CRUD + rights
9. **PackageManagement** — upload DAR, list, vet
10. **Event queries** — by contract ID

### Priority 3 — Advanced (v0.3.0)
11. **Interactive submission** — prepare/execute for external signing
12. **gRPC transport** — ConnectRPC for native gRPC support
13. **Reassignment** — cross-synchronizer contract transfer
14. **IDP management** — identity provider CRUD
15. **CIP-56 helpers** — token standard utilities

### Priority 4 — Ecosystem (v1.0.0)
16. **TestClient** — sandbox lifecycle, time manipulation
17. **Codegen CLI** — Daml → TypeScript type generation
18. **cantonjs-react** — React hooks with TanStack Query
19. **CIP-0103 integration** — wallet provider interface
20. **Chain definitions** — LocalNet/DevNet/TestNet/MainNet configs

---

## References

- [gRPC Ledger API Services (Canton 3.5)](https://docs.digitalasset.com/build/3.5/explanations/ledger-api-services.html)
- [gRPC Ledger API Reference (Canton 3.4)](https://docs.digitalasset.com/build/3.4/reference/lapi-proto-docs.html)
- [JSON Ledger API OpenAPI (Canton 3.4)](https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html)
- [JWT Authentication](https://docs.digitalasset.com/operate/3.5/howtos/secure/apis/jwt.html)
- [External Signing Overview](https://docs.digitalasset.com/build/3.4/explanations/external-signing/external_signing_overview.html)
- [Parties and Users](https://docs.digitalasset.com/build/3.4/explanations/parties-users.html)
- [Canton 3.4 Release Notes](https://blog.digitalasset.com/developers/release-notes/canton-3.4-release-notes-for-splice-0.5.0)
- [@daml/ledger (npm)](https://www.npmjs.com/package/@daml/ledger)
- [@daml/react](https://docs.daml.com/app-dev/bindings-ts/daml-react/index.html)
- [@canton-network/dapp-sdk (npm)](https://www.npmjs.com/package/@canton-network/dapp-sdk)
- [CIP-56 Token Standard](https://www.canton.network/blog/what-is-cip-56-a-guide-to-cantons-token-standard)
- [Canton Network Overview](https://docs.digitalasset.com/integrate/devnet/canton-network-overview/index.html)
- [Zenith EVM Launch](https://www.prnewswire.com/news-releases/zenith-launches-as-the-evm-layer-for-canton-network-merging-ethereums-developer-ecosystem-into-wall-streets-blockchain-302705132.html)
