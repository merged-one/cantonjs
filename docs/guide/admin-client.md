# AdminClient

The `AdminClient` handles node administration: party management, user management, package uploads, and identity provider configuration.

## Creating an Admin Client

```typescript
import { createAdminClient, jsonApi } from 'cantonjs'

const admin = createAdminClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: adminJwt }),
})
```

## Party Management

```typescript
// Allocate a new party
const party = await admin.allocateParty({
  identifierHint: 'Alice',
  displayName: 'Alice',
})

// List all parties
const parties = await admin.listParties()

// Get party details
const details = await admin.getParty('Alice::1234')

// Update party display name
await admin.updateParty('Alice::1234', { displayName: 'Alice Smith' })
```

## User Management

```typescript
// Create a user with rights
const user = await admin.createUser({
  id: 'alice-user',
  primaryParty: 'Alice::1234',
  rights: [
    { kind: 'CanActAs', party: 'Alice::1234' },
    { kind: 'CanReadAs', party: 'Bob::5678' },
  ],
})

// List users with pagination
const page1 = await admin.listUsers({ pageSize: 10 })
const page2 = await admin.listUsers({ pageSize: 10, pageToken: page1.nextPageToken })

// Grant/revoke rights
await admin.grantRights('alice-user', [{ kind: 'CanReadAs', party: 'Charlie::9999' }])
await admin.revokeRights('alice-user', [{ kind: 'CanReadAs', party: 'Charlie::9999' }])

// Delete a user
await admin.deleteUser('alice-user')
```

## Package Management

```typescript
// Upload a DAR file
await admin.uploadDar(darFileBuffer)

// List packages
const packages = await admin.listPackages()

// Get package details
const pkg = await admin.getPackage('package-id')

// Validate a DAR file
const result = await admin.validateDar(darFileBuffer)
```

## Package Vetting

```typescript
// Get vetted packages
const vetted = await admin.getVettedPackages()

// Update vetted packages
await admin.updateVettedPackages(packageIds)
```

## Identity Provider Configuration

```typescript
// Create an IDP config
const idp = await admin.createIdentityProvider({
  identityProviderId: 'my-idp',
  issuer: 'https://auth.example.com',
  jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
  audience: 'canton-api',
})

// List, update, delete
const idps = await admin.listIdentityProviders()
await admin.updateIdentityProvider('my-idp', { audience: 'new-audience' })
await admin.deleteIdentityProvider('my-idp')
```

## Pagination

List endpoints return `PaginatedResult<T>` with automatic page token management:

```typescript
import type { PaginatedResult } from 'cantonjs'

let pageToken: string | undefined
const allUsers: User[] = []

do {
  const page = await admin.listUsers({ pageSize: 50, pageToken })
  allUsers.push(...page.results)
  pageToken = page.nextPageToken
} while (pageToken)
```
