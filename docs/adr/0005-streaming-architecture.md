# ADR 0005: Streaming Architecture

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

Canton's JSON Ledger API V2 exposes three WebSocket streaming endpoints:

- `/v2/updates` — unified update stream (transactions, reassignments, topology, offset checkpoints)
- `/v2/state/active-contracts` — streaming ACS snapshot (bounded)
- `/v2/commands/completions` — command completion notifications

WebSocket is the recommended approach for production. HTTP POST alternatives impose higher server load, limit results (default 1024), and lack streaming semantics.

Key protocol characteristics:
- Authentication via WebSocket subprotocols: `['daml.ws.auth', 'jwt.token.<JWT>']`
- One subscription per connection (no multiplexing)
- Messages are individual JSON frames (one complete JSON object per frame)
- Offsets are int64 for resumption via `beginExclusive`
- `OffsetCheckpoint` messages serve as heartbeats
- Server closes bounded streams on completion; open-ended streams run until timeout or client disconnect

## Decision

### 1. AsyncIterable Pattern

Expose streams as `AsyncIterable<T>` rather than EventEmitter or Observable:

```typescript
const stream = streamUpdates(transport, { ... })
for await (const update of stream) {
  // process update
}
```

**Rationale:** AsyncIterable is a language primitive, requires no dependencies, integrates with AbortSignal via break/return, and works with for-await-of. Observable would require rxjs; EventEmitter lacks backpressure.

### 2. WebSocket Abstraction

Rather than a full WebSocket transport (which would imply multiplexing), provide stream functions that each open a dedicated WebSocket connection.

**Rationale:** Canton requires one subscription per WebSocket connection. A "WebSocket transport" would be misleading since each stream needs its own connection.

### 3. Auto-Reconnect with Exponential Backoff

Streams automatically reconnect on disconnect with:
- Initial delay: 1 second
- Max delay: 30 seconds
- Backoff factor: 2x
- Jitter: ±25%
- Offset-based resumption via last-seen offset as `beginExclusive`

**Rationale:** Canton has max session duration (default 2h) and idle timeouts. Reconnection is not optional — it's expected.

### 4. Injectable WebSocket Constructor

Accept a `WebSocket` constructor parameter for testability and environment compatibility (browser `WebSocket` vs Node.js `ws` package).

**Rationale:** Node.js <21 does not have built-in WebSocket. Dependency injection avoids bundling `ws` as a required dependency.

## Consequences

### Positive
- AsyncIterable is composable with standard JS constructs (for-await-of, break, generators)
- AbortSignal cancellation works naturally (abort → close WebSocket → iterator returns)
- No runtime dependencies (no rxjs, no event-emitter library)
- Mock WebSocket enables full unit testing without network
- Offset tracking enables gap-free resumption

### Negative
- AsyncIterable lacks built-in fan-out (multiple consumers need manual tee)
- No built-in filtering/mapping operators (unlike rxjs)
- Each stream opens its own WebSocket connection (no connection sharing)

## References

- [Canton JSON API WebSocket docs](https://docs.digitalasset.com/build/3.5/tutorials/json-api/canton_and_the_json_ledger_api_ts_websocket.html)
- [Canton AsyncAPI spec](https://docs.digitalasset.com/build/3.4/reference/json-api/asyncapi.html)
- [MDN AsyncIterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols)
