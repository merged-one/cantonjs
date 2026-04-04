# ADR 0008: React Integration Architecture

> [!NOTE]
> Historical ADR. It may reference earlier positioning or package scope. For the current product boundary, see [Positioning](/positioning) and [Package Architecture](/guide/package-architecture).

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

Canton dApp developers need React bindings to build interactive UIs on top of cantonjs. The existing Daml React library (`@daml/react`) is tightly coupled to the deprecated JSON API v1, uses class-based patterns, and lacks modern React features like concurrent rendering support.

cantonjs-react must:
- Provide hooks for querying, creating, and exercising contracts
- Handle caching, deduplication, and automatic refetching
- Support real-time contract updates
- Work with React 18+ (concurrent features) and React 19
- Be tree-shakeable and lightweight

### Alternatives Considered

1. **Build custom state management** — Roll our own caching, deduplication, and refetching logic. Maximum control but duplicates well-solved problems.

2. **Wrap TanStack Query** — Leverage battle-tested caching and mutation infrastructure. Minimal code, strong community, React 18/19 support built in.

3. **Wrap SWR** — Similar to TanStack Query but less feature-rich for mutations. No built-in mutation/cache invalidation patterns.

## Decision

**Wrap TanStack Query** (`@tanstack/react-query` v5) as a peer dependency. This gives us:

- **Automatic caching and deduplication** via query keys
- **Mutation hooks** with cache invalidation on success
- **AbortSignal integration** for automatic query cancellation
- **Stale-while-revalidate** for responsive UIs
- **DevTools** via `@tanstack/react-query-devtools`

### Architecture

```
CantonProvider
├── CantonContext.Provider (holds LedgerClient)
└── QueryClientProvider (holds QueryClient)
    └── children
```

**Provider pattern:** `CantonProvider` wraps both a React context (for `LedgerClient`) and TanStack's `QueryClientProvider`. Users supply their `LedgerClient` instance; an optional `QueryClient` can be provided for custom cache configuration.

**Hook hierarchy:**
- `useCantonClient()` — Access the LedgerClient from context
- `useParty()` — Shorthand for the `actAs` party
- `useContracts(options)` — Query active contracts (wraps `useQuery`)
- `useCreateContract(options)` — Create contracts (wraps `useMutation`)
- `useExercise(options)` — Exercise choices (wraps `useMutation`)
- `useStreamContracts(options)` — Polling-based live updates (wraps `useEffect`)

**Query key convention:** `['canton', 'contracts', templateId, actAs]`

Mutations automatically invalidate the `['canton', 'contracts', templateId]` prefix, so all queries for that template refresh after a create or exercise.

### Streaming Strategy

`useStreamContracts` uses polling (5-second interval) as an interim solution. The hook uses `useEffect` with `setInterval` and `AbortController` for cleanup. This will be replaced with WebSocket-based streaming when cantonjs adds `streamUpdates()` support.

### Type Independence

cantonjs-react defines minimal local type interfaces (`LedgerClient`, `ActiveContract`, etc.) that match cantonjs exports structurally. This allows the package to be developed, tested, and type-checked without requiring cantonjs to be published. At runtime, users pass their actual cantonjs client instances which satisfy these interfaces via structural typing.

## Consequences

- **Positive:** Minimal code (~200 lines), proven caching infrastructure, DevTools support, automatic AbortSignal cancellation, React 18/19 compatible.
- **Positive:** Users who already use TanStack Query get seamless integration — they can share a single `QueryClient` across Canton and other data sources.
- **Negative:** Adds `@tanstack/react-query` as a peer dependency (~40KB gzipped). Acceptable for a React app.
- **Negative:** Polling-based streaming is not truly real-time. Will be replaced with WebSocket streaming in a future phase.
