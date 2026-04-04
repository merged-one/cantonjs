<p align="center">
  <strong>cantonjs</strong>
</p>

<p align="center">
  Application-side TypeScript SDK for Canton participant Ledger API V2
</p>

<p align="center">
  <a href="https://github.com/merged-one/cantonjs/actions/workflows/ci.yml"><img src="https://github.com/merged-one/cantonjs/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/cantonjs"><img src="https://img.shields.io/npm/v/cantonjs.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/cantonjs"><img src="https://img.shields.io/npm/dm/cantonjs.svg" alt="npm downloads" /></a>
  <a href="https://github.com/merged-one/cantonjs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License" /></a>
  <a href="https://img.shields.io/bundlephobia/minzip/cantonjs"><img src="https://img.shields.io/bundlephobia/minzip/cantonjs" alt="Bundle size" /></a>
</p>

---

cantonjs is the application-side TypeScript SDK for teams building directly against a Canton participant's Ledger API V2.
It provides tree-shakeable Ledger, Admin, and Test clients; injected transports; real-time streaming; structured errors; and first-class testing support for participant-connected app code.

The repo is aimed first at backend or full-stack participant services, participant-private React apps, and integration or data teams with participant access.
Public Scan consumers and advanced stable/public Splice integrators are secondary users.
It is not a generic answer for Daml lifecycle, wallet discovery and provider UX, or wallet and custody infrastructure.

Start with [target users](./docs/guide/target-users.md) if you need the explicit personas, jobs to be done, current alternatives, buyer messaging, and non-goals.
Scope and ecosystem boundaries: see [docs/positioning.md](./docs/positioning.md) and the [ecosystem-fit guide](./docs/guide/ecosystem-fit.md).
DPM remains canonical for Daml build, test, and codegen workflows.
Quickstart remains the official full-stack and reference-app path.
The official dApp SDK, dApp API, Wallet Gateway, and Wallet SDK remain the canonical wallet-connected and wallet-provider stacks.

Existing users: the current positioning reset changes the repo mental model and package-boundary guidance, not the runtime API names.
See [CHANGELOG.md](./CHANGELOG.md) and the [migration notes](./docs/MIGRATING_TO_SPLICE_SUPPORT.md).

Development policy: the included runtime surface is gated at 100% statements, branches, functions, and lines, and every coverage exclusion or inline `v8 ignore` must be justified in [`EXCLUSIONS.md`](./EXCLUSIONS.md).

## Features

- **Participant-side clients** &mdash; Ledger, Admin, and Test client factories for direct application work
- **Injected transports** &mdash; JSON API V2, gRPC, and fallback transport layers without hidden I/O
- **Real-time streaming** &mdash; AsyncIterator WebSocket streams with auto-reconnect
- **Structured errors and testing** &mdash; CJ-coded errors, recovery hints, mock transports, and sandbox fixtures
- **Optional codegen** &mdash; generate TypeScript from existing Daml DAR artifacts when app code needs it
- **Participant-private React hooks** &mdash; TanStack Query-powered hooks via [cantonjs-react](#cantonjs-react)
- **Focused add-ons and adapters** &mdash; public Scan, validator, token-standard, interfaces, and experimental CIP-0103 edge adapters

## Install

```bash
npm install cantonjs
```

## Package Map

The repo centers on an app-side Ledger API V2 core plus focused add-ons and adapters around that boundary.

| Tier | Package | Stability | Purpose |
| ---- | ------- | --------- | ------- |
| Core | `cantonjs` | GA | Application-side Ledger, Admin, and Test clients; transports; streaming; errors; chains; and runtime typing helpers |
| Optional Convenience | `cantonjs-react` | GA | Participant-private React hooks for application code |
| Optional Convenience | `cantonjs-codegen` | GA | Optional DAR-to-TypeScript convenience from existing Daml artifacts |
| Add-On | `cantonjs-splice-scan` | GA | Public Scan reads for DSO metadata, update history, and public ANS lookups |
| Add-On | `cantonjs-splice-validator` | GA + legacy compatibility | Selected stable external validator support: ANS, filtered Scan Proxy reads, and legacy compatibility flows |
| Add-On | `cantonjs-splice-interfaces` | GA | Stable published Splice interface descriptors and generated types |
| Add-On | `cantonjs-splice-token-standard` | GA | Participant-first CIP-0056 helpers for new token transfer and allocation flows |
| Adapter | `cantonjs-wallet-adapters` | Experimental | CIP-0103 edge adapters for official wallet-stack interop |

For the canonical scope note that drives this package map, see [docs/positioning.md](./docs/positioning.md).
For a tool-by-tool "when to use what" guide, see [docs/guide/ecosystem-fit.md](./docs/guide/ecosystem-fit.md).
For the persona and anti-pitch version of that same story, see [docs/guide/target-users.md](./docs/guide/target-users.md).

## Stability Tiers

- **GA**: Covered by the normal semver promise for the pinned release line.
- **Legacy compatibility**: Still supported for existing integrations, but not the recommended starting point for new work.
- **Experimental**: May break in minor releases while the upstream surface is still moving.

Current compatibility target:

- **Canton GA line:** `3.4.x`
- **Splice GA line:** `0.5.x`
- **Vendored Splice artifacts:** `0.5.17`
- **Legacy wallet note:** `createLegacyWalletClient()` exists for old `wallet-external` flows, but new transfer flows should use `cantonjs-splice-token-standard`.

See [compatibility policy](./docs/compatibility.md) and [migration notes](./docs/MIGRATING_TO_SPLICE_SUPPORT.md).

## Quick Start

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'

// 1. Create a transport
const transport = jsonApi({
  url: 'http://localhost:7575',
  token: 'your-jwt-token',
})

// 2. Create a party-scoped client
const client = createLedgerClient({
  transport,
  actAs: 'Alice::1234',
})

// 3. Create a contract
const created = await client.createContract('#my-pkg:Main:Asset', {
  owner: 'Alice',
  value: '100',
})

// 4. Exercise a choice
const tx = await client.exerciseChoice('#my-pkg:Main:Asset', created.contractId, 'Transfer', {
  newOwner: 'Bob',
})

// 5. Query active contracts
const contracts = await client.queryContracts('#my-pkg:Main:Asset')
```

Static bearer tokens remain supported. For request-scoped auth, provide an async token or session provider:

```typescript
import { createLedgerClient, jsonApi, type AuthProvider } from 'cantonjs'

const auth: AuthProvider = async ({ request }) => {
  if (request.path.startsWith('/v2/state/')) return undefined
  return await getFreshJwtForAudience('participant')
}

const transport = jsonApi({
  url: 'http://localhost:7575',
  auth,
})

const client = createLedgerClient({
  transport,
  actAs: 'Alice::1234',
})
```

## Streaming

Subscribe to real-time updates with auto-reconnect and offset tracking:

```typescript
import { streamUpdates } from 'cantonjs'

const controller = new AbortController()

for await (const update of streamUpdates(transport, {
  beginExclusive: '0',
  signal: controller.signal,
})) {
  console.log('Update:', update.updateId)
}
```

## Subpath Imports

Import only what you need for smaller bundles:

```typescript
import { createLedgerClient } from 'cantonjs/ledger'
import { createAdminClient } from 'cantonjs/admin'
import { createTestClient } from 'cantonjs/testing'
import { localNet, devNet, testNet, mainNet, withChainOverrides } from 'cantonjs/chains'
import type { TemplateDescriptor, InferPayload } from 'cantonjs/codegen'
```

## Network Presets

Built-in public presets are discovery-first. They carry public Scan discovery metadata, auth audience hints, and the pinned Splice release line, but they do not commit operator-specific participant or validator URLs.

Layer concrete deployment settings on top:

```typescript
import { devNet, withChainOverrides } from 'cantonjs/chains'

const chain = withChainOverrides(devNet, {
  participant: {
    jsonApiUrl: process.env.CANTON_JSON_API_URL,
  },
  scan: {
    url: process.env.SPLICE_SCAN_URL,
  },
  validator: {
    apiBaseUrl: process.env.SPLICE_VALIDATOR_URL,
  },
})
```

`chain.scan.discoveryRoot` remains available when you need to resolve a live public Scan deployment from operator documentation first.

## Clients

| Client                 | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `createLedgerClient()` | Party-scoped contract operations (create, exercise, query, stream)  |
| `createAdminClient()`  | Node administration (parties, users, packages, IDP)                 |
| `createTestClient()`   | Sandbox testing (time control, party allocation, sandbox lifecycle) |

## Transports

| Transport                          | Description                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `jsonApi({ url, token })`          | HTTP transport for Canton JSON API V2 with static bearer auth                         |
| `jsonApi({ url, auth })`           | HTTP transport with async per-request token lookup                                    |
| `jsonApi({ url, session })`        | HTTP transport with async per-request token and header injection                      |
| `grpc({ grpcTransport, token })`   | gRPC via injected ConnectRPC client with static bearer auth                           |
| `grpc({ grpcTransport, auth })`    | gRPC via injected ConnectRPC client with async per-request token lookup               |
| `grpc({ grpcTransport, session })` | gRPC via injected ConnectRPC client with async per-request token and header injection |
| `fallback({ transports })`         | Failover across multiple transports                                                   |

## Error Handling

Every error is a `CantonjsError` with a machine-readable code, recovery hints, and a traversable cause chain:

```typescript
import { CommandRejectedError, TokenExpiredError } from 'cantonjs'

try {
  await client.createContract(templateId, args)
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // error.code === 'CJ2001'
    // error.metaMessages === ['Refresh your JWT token']
  }
}
```

| Range  | Domain                                      |
| ------ | ------------------------------------------- |
| CJ1xxx | Transport (connection, HTTP, gRPC, timeout) |
| CJ2xxx | Authentication (JWT, token lifecycle)       |
| CJ3xxx | Ledger (command rejection, authorization)   |
| CJ4xxx | Admin (party, user, package management)     |
| CJ5xxx | Streaming (WebSocket, reconnection)         |
| CJ6xxx | Codegen (type mismatch, generation)         |

## Packages

### cantonjs-codegen

`cantonjs-codegen` is an optional DAR-to-TypeScript convenience for application code built from existing Daml artifacts. DPM remains canonical for Daml build, test, and codegen workflows.

Generate TypeScript types from a DAR you already have:

```bash
npm install --save-dev cantonjs-codegen

npx cantonjs-codegen --dar ./model.dar --output ./src/generated
```

Records become type aliases, variants become discriminated unions, templates become companion const objects with `templateId` and choices. See [packages/cantonjs-codegen](./packages/cantonjs-codegen/).

### cantonjs-react

React hooks for participant-private ledger application state, powered by TanStack Query:

```bash
npm install cantonjs-react @tanstack/react-query
```

```tsx
import { createLedgerClient, jsonApi } from 'cantonjs'
import { CantonProvider, useContracts, useCreateContract } from 'cantonjs-react'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: 'your-jwt-token' }),
  actAs: 'Alice::1234',
})

function App() {
  return (
    <CantonProvider client={client}>
      <AssetList />
    </CantonProvider>
  )
}

function AssetList() {
  const { data: assets, isLoading } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  const { mutate: create } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <button onClick={() => create({ createArguments: { owner: 'Alice', value: '100' } })}>
        Create
      </button>
      <ul>
        {assets?.map((c) => (
          <li key={c.createdEvent.contractId}>{JSON.stringify(c.createdEvent.createArgument)}</li>
        ))}
      </ul>
    </div>
  )
}
```

See [packages/cantonjs-react](./packages/cantonjs-react/).

`cantonjs-react` stays focused on participant-private ledger state.
For public Splice data, use TanStack Query directly with `cantonjs-splice-scan`; see [docs/examples/react.md](./docs/examples/react.md) and [docs/examples/public-scan-dashboard.md](./docs/examples/public-scan-dashboard.md).

### Splice Packages

- **`cantonjs-splice-scan`** &mdash; GA public Scan reads for DSO metadata, updates, and public ANS lookups.
  Experimental Scan routes stay behind `cantonjs-splice-scan/experimental`.
  See [docs/guide/scan.md](./docs/guide/scan.md).
- **`cantonjs-splice-validator`** &mdash; selected stable external validator support for ANS and the filtered GA Scan Proxy subset.
  `createLegacyWalletClient()` is legacy compatibility only and is not recommended for new transfer flows.
  See [docs/guide/validator-ans.md](./docs/guide/validator-ans.md).
- **`cantonjs-splice-token-standard`** and **`cantonjs-splice-interfaces`** &mdash; GA stable CIP-0056 descriptors and ledger-centric helpers for new transfer and allocation flows.
  See [docs/guide/token-standard.md](./docs/guide/token-standard.md).
- **`cantonjs-wallet-adapters`** &mdash; experimental CIP-0103 edge adapters for browser and SDK interop with the official wallet stack.
  See [docs/guide/wallet-adapters.md](./docs/guide/wallet-adapters.md).

## Testing

cantonjs provides first-class testing utilities. No `vi.mock()` needed &mdash; all dependencies are injected:

```typescript
import { createLedgerClient } from 'cantonjs'
import { createMockTransport } from 'cantonjs/testing'

const transport = createMockTransport({
  responses: [{ contractId: 'contract-1', templateId: '#pkg:Mod:T' }],
})

const client = createLedgerClient({ transport, actAs: 'Alice::1234' })
const created = await client.createContract('#pkg:Mod:T', { owner: 'Alice' })
```

Integration testing with a real Canton sandbox:

```typescript
import { setupCantonSandbox } from 'cantonjs/testing'

const sandbox = await setupCantonSandbox()
// sandbox.client is a fully configured TestClient
```

## Canton Concepts

| Concept          | Description                                                  |
| ---------------- | ------------------------------------------------------------ |
| **Party**        | Identity unit (not an address), permissions via JWT          |
| **Template**     | Daml contract definition (`packageId:moduleName:entityName`) |
| **Choice**       | Operation on a contract (like a function call)               |
| **ContractId**   | Unique UTXO-style identifier for a contract instance         |
| **DAR**          | Daml Archive &mdash; the deployment artifact                 |
| **Synchronizer** | Consensus domain for transaction ordering                    |

## Bundle Size

cantonjs is designed for minimal footprint:

| Entry Point       | Size (minified + brotli) |
| ----------------- | ------------------------ |
| `cantonjs`        | 5.78 kB                  |
| `cantonjs/ledger` | 1.1 KB                   |

## Requirements

- Node.js >= 18
- TypeScript >= 5.0.4 (optional peer dependency)

## Development

```bash
git clone https://github.com/merged-one/cantonjs.git
cd cantonjs
npm install

npm test              # Run root tests
npm run test:coverage # Enforced root coverage gate
npm run test:coverage:all # Root + package coverage gates
npm run verify:ci:pr  # Full PR validation suite
npm run typecheck     # Type-check
npm run lint          # Lint
npm run build         # Build ESM + CJS + types
npm run size          # Bundle size audit
npm run docs:dev      # Start docs dev server
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding conventions, and pull request guidelines.

## Architecture Decisions

Design decisions are documented as Architecture Decision Records (ADRs):

| ADR                                                    | Topic                            |
| ------------------------------------------------------ | -------------------------------- |
| [0001](./docs/adr/0001-typescript-function-exports.md) | TypeScript with function exports |
| [0002](./docs/adr/0002-transport-abstraction.md)       | Transport abstraction            |
| [0003](./docs/adr/0003-party-scoped-clients.md)        | Party-scoped client architecture |
| [0004](./docs/adr/0004-structured-error-model.md)      | Structured error model           |
| [0005](./docs/adr/0005-streaming-architecture.md)      | Streaming architecture           |
| [0006](./docs/adr/0006-testing-strategy.md)            | Testing strategy                 |
| [0007](./docs/adr/0007-codegen-architecture.md)        | Codegen architecture             |
| [0008](./docs/adr/0008-react-integration.md)           | React integration                |

## Related

- [cantonctl](https://github.com/merged-one/cantonctl) &mdash; CLI companion for sandbox, admin, and test workflows
- [Canton Network](https://www.canton.network/) &mdash; The Canton Network
- [Canton Docs](https://docs.digitalasset.com/) &mdash; Official Canton documentation

## License

[Apache-2.0](./LICENSE)
