# cantonjs-splice-scan

Public Scan client for Splice networks, layered on top of `cantonjs`.

This package exposes only the stable public Scan surface. Internal, deprecated, and `pre-alpha` Scan operations are intentionally excluded from the main entrypoint.

## Install

```bash
npm install cantonjs cantonjs-splice-scan
```

## What Scan Is

Scan provides the public SV/DSO view of a Splice network: network metadata, public update history, public ANS lookups, public holdings snapshots, and similar read APIs.

It does **not** expose party-private ledger state. For party-scoped contract queries and commands, use the Canton Ledger API through `cantonjs`.

## Quick Start

```ts
import { createScanClient } from 'cantonjs-splice-scan'

const scan = createScanClient({
  url: 'https://example.com/api/scan',
})

const dso = await scan.getDsoInfo()
const history = await scan.getUpdates({ page_size: 25 })
```

Auth is optional. Many Scan deployments allow public access without a token:

```ts
const publicScan = createScanClient({
  url: 'https://example.com/api/scan',
})

const authenticatedScan = createScanClient({
  url: 'https://example.com/api/scan',
  token: process.env.SPLICE_SCAN_JWT,
})
```

Per-request auth/session providers from `cantonjs` are also supported:

```ts
const scan = createScanClient({
  url: 'https://example.com/api/scan',
  session: async ({ request }) => {
    if (request.path === '/v2/updates') {
      return { token: await getToken() }
    }
    return undefined
  },
})
```

## Iterating `/v2/updates`

`iterateUpdates()` advances `/v2/updates` by reusing the last item from the prior page as the next `after` cursor.

```ts
for await (const update of scan.iterateUpdates({ page_size: 100 })) {
  console.log(update.update_id, update.record_time)
}
```

## Package Policy

- Generated low-level types are committed in `src/generated/scan.types.ts`.
- The main entrypoint exports only stable public Scan helpers and stable public derived types.
- No network access is required at install time.

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
