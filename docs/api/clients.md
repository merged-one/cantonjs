# Clients API

## createLedgerClient

Creates a party-scoped client for contract operations.

```typescript
import { createLedgerClient } from 'cantonjs'

function createLedgerClient(config: LedgerClientConfig): LedgerClient
```

### LedgerClientConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `transport` | `Transport` | Yes | Transport instance |
| `actAs` | `string` | Yes | Party identity for submissions |
| `readAs` | `string[]` | No | Additional read-only parties |

### LedgerClient Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `createContract(templateId, args, options?)` | `Promise<CreatedEvent>` | Create a contract |
| `exerciseChoice(templateId, contractId, choice, args, options?)` | `Promise<JsTransaction>` | Exercise a choice |
| `queryContracts(templateId, options?)` | `Promise<ActiveContract[]>` | Query active contracts |
| `getTransactionById(updateId, options?)` | `Promise<JsTransaction>` | Get transaction by ID |
| `getTransactionByOffset(offset, options?)` | `Promise<JsTransaction>` | Get transaction by offset |
| `getEventsByContractId(contractId, options?)` | `Promise<TaggedEvent[]>` | Get contract events |
| `getLedgerEnd(options?)` | `Promise<string>` | Get latest ledger offset |
| `getConnectedSynchronizers(options?)` | `Promise<ConnectedSynchronizer[]>` | List synchronizers |
| `submitReassignment(command, options?)` | `Promise<Reassignment>` | Cross-synchronizer transfer |
| `prepareSubmission(templateId, args, options?)` | `Promise<PrepareSubmissionResponse>` | Prepare for external signing |
| `executeSubmission(preparedTx, signatures, options?)` | `Promise<JsTransaction>` | Execute signed submission |

---

## createAdminClient

Creates a client for node administration.

```typescript
import { createAdminClient } from 'cantonjs'

function createAdminClient(config: AdminClientConfig): AdminClient
```

### AdminClientConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `transport` | `Transport` | Yes | Transport instance |

### AdminClient Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `allocateParty(request)` | `Promise<PartyDetails>` | Allocate a party |
| `listParties(options?)` | `Promise<PartyDetails[]>` | List parties |
| `getParty(party)` | `Promise<PartyDetails>` | Get party details |
| `updateParty(party, update)` | `Promise<PartyDetails>` | Update party |
| `createUser(request)` | `Promise<User>` | Create a user |
| `getUser(userId)` | `Promise<User>` | Get user |
| `listUsers(options?)` | `Promise<PaginatedResult<User>>` | List users |
| `deleteUser(userId)` | `Promise<void>` | Delete user |
| `grantRights(userId, rights)` | `Promise<void>` | Grant rights |
| `revokeRights(userId, rights)` | `Promise<void>` | Revoke rights |
| `uploadDar(dar)` | `Promise<void>` | Upload DAR |
| `listPackages()` | `Promise<PackageDetails[]>` | List packages |
| `getPackage(packageId)` | `Promise<PackageDetails>` | Get package |
| `validateDar(dar)` | `Promise<void>` | Validate DAR |
| `getVettedPackages()` | `Promise<string[]>` | Get vetted packages |
| `updateVettedPackages(packageIds)` | `Promise<void>` | Update vetting |
| `createIdentityProvider(request)` | `Promise<IdentityProviderConfig>` | Create IDP |
| `listIdentityProviders()` | `Promise<IdentityProviderConfig[]>` | List IDPs |
| `updateIdentityProvider(id, update)` | `Promise<IdentityProviderConfig>` | Update IDP |
| `deleteIdentityProvider(id)` | `Promise<void>` | Delete IDP |
| `getLedgerApiVersion()` | `Promise<string>` | Get API version |

---

## createTestClient

Creates a testing client that combines LedgerClient and AdminClient capabilities with sandbox management.

```typescript
import { createTestClient } from 'cantonjs'

function createTestClient(config: TestClientConfig): TestClient
```

### TestClientConfig

Extends `LedgerClientConfig` with no additional required properties.

### TestClient Methods

Inherits all `LedgerClient` and `AdminClient` methods, plus:

| Method | Returns | Description |
|--------|---------|-------------|
| `getTime()` | `Promise<Date>` | Get sandbox time |
| `setTime(time)` | `Promise<void>` | Set sandbox time |
| `advanceTime(duration)` | `Promise<void>` | Advance time by duration |
| `allocateParties(hints)` | `Promise<PartyDetails[]>` | Allocate multiple parties |
