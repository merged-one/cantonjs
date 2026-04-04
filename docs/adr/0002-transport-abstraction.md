# ADR 0002: Composable Transport Abstraction

> [!NOTE]
> Historical ADR. It may reference earlier positioning or package scope. For the current product boundary, see [Positioning](/positioning) and [Package Architecture](/guide/package-architecture).

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

Canton uniquely offers two parallel API surfaces for the same Ledger API V2: a gRPC API (protobuf-based, port 6865) and a JSON API (HTTP + WebSocket, port 7575). Both provide near-identical functionality. Different use cases favor different transports: browsers prefer HTTP/JSON, high-throughput servers benefit from gRPC's binary serialization.

viem's transport pattern (`http()`, `webSocket()`, `custom()`, `fallback()`) has proven effective at separating client logic from communication concerns.

## Decision

Implement a **Transport interface** that abstracts all communication with Canton nodes. Clients are instantiated with a transport, and all requests flow through it.

```typescript
type Transport = {
  type: string
  url: string
  request: <T>(args: TransportRequest) => Promise<T>
}
```

Transport factories:
- `jsonApi({ url, token })` — JSON Ledger API V2 via HTTP (primary, Phase 0)
- `grpc({ url, token })` — gRPC via ConnectRPC (Phase 6)
- `fallback([t1, t2])` — Ordered failover (Phase 6)

The JSON API is the primary transport because it works in all environments (browser, Node.js, edge) without requiring protobuf compilation or a gRPC proxy.

## Consequences

### Positive
- Users choose the best transport for their use case
- Browser dApps work out of the box with JSON API
- Testing uses mock transports — no network required
- gRPC can be added later without API changes

### Negative
- Two transport implementations to maintain (once gRPC is added)
- Subtle behavioral differences between transports must be documented
- JSON serialization overhead compared to binary protobuf

## References

- [viem transports](https://viem.sh/docs/clients/intro)
- [ConnectRPC](https://github.com/connectrpc/connect-es)
- [canton-ledger-api-research.md](../research/canton-ledger-api-research.md) — Section 1: Transport Layers
