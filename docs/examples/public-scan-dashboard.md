# Public Scan Dashboard

| Example profile | |
| --- | --- |
| Audience | Public Scan consumers, dashboards, and public-data ingestion teams |
| Data scope | Public |
| Depends on | Public Scan |

This example shows a dashboard that reads only public, network-visible Splice data.

It does not create a `LedgerClient`, does not require a participant JWT, and does not read party-private contracts. Keep this boundary separate from participant-private app logic.

## Setup

```bash
npm install cantonjs cantonjs-splice-scan react @tanstack/react-query
```

## Create A Public Scan Client

```tsx
// src/scanClient.ts
import { createScanClient } from 'cantonjs-splice-scan'

export const scan = createScanClient({
  url: import.meta.env.VITE_SPLICE_SCAN_URL,
})
```

## Build A Dashboard Without `CantonProvider`

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PublicOverview } from './PublicOverview'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PublicOverview />
    </QueryClientProvider>
  )
}
```

## Query Public Network State

```tsx
// src/PublicOverview.tsx
import { useQuery } from '@tanstack/react-query'
import { scan } from './scanClient'

export function PublicOverview() {
  const dso = useQuery({
    queryKey: ['scan', 'dso'],
    queryFn: async () => await scan.getDsoInfo(),
  })

  const updates = useQuery({
    queryKey: ['scan', 'updates'],
    queryFn: async () => await scan.getUpdates({ page_size: 10 }),
  })

  const ans = useQuery({
    queryKey: ['scan', 'ans'],
    queryFn: async () => await scan.listAnsEntries({ page_size: 10 }),
  })

  if (dso.isLoading || updates.isLoading || ans.isLoading) {
    return <p>Loading public network data...</p>
  }

  return (
    <div>
      <h1>Public Network Overview</h1>
      <pre>{JSON.stringify(dso.data, null, 2)}</pre>
      <pre>{JSON.stringify(updates.data, null, 2)}</pre>
      <pre>{JSON.stringify(ans.data, null, 2)}</pre>
    </div>
  )
}
```

## Public-Only Boundary

This example stays outside the participant boundary on purpose:

- `createScanClient()` reads public network-visible data
- no `LedgerClient` is created
- no `CantonProvider` is needed
- no participant JWT is required unless your Scan deployment adds one

If you need party-private contracts or submissions, move that logic to [Participant Service](/examples/basic), [Participant Stream Worker](/examples/streaming), or [Participant-Private React App](/examples/react).
