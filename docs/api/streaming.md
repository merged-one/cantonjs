# Streaming API

All streaming functions return `AsyncIterable` and support `AbortSignal` for cancellation.

## streamUpdates

Subscribe to transaction updates. Unbounded stream with auto-reconnect.

```typescript
function streamUpdates(
  transport: Transport,
  options: StreamUpdatesOptions,
): AsyncIterable<JsTransaction>
```

### StreamUpdatesOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `beginExclusive` | `string` | Yes | — | Start offset (exclusive) |
| `filter` | `{ party, templateIds? }` | No | — | Event filter |
| `signal` | `AbortSignal` | No | — | Cancellation signal |
| `reconnect` | `ReconnectConfig` | No | defaults | Reconnect behavior |
| `WebSocket` | `WebSocketConstructor` | No | `globalThis.WebSocket` | WebSocket implementation |

## streamContracts

Get a snapshot of active contracts. Bounded stream (no reconnect).

```typescript
function streamContracts(
  transport: Transport,
  options: StreamContractsOptions,
): AsyncIterable<ActiveContractsResponse>
```

### StreamContractsOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `filter` | `{ party, templateIds? }` | Yes | Event filter |
| `signal` | `AbortSignal` | No | Cancellation signal |
| `WebSocket` | `WebSocketConstructor` | No | WebSocket implementation |

### ActiveContractsResponse

```typescript
type ActiveContractsResponse = {
  readonly activeContracts: readonly ActiveContract[]
  readonly offset: string
  readonly workflowId?: string
}
```

## streamCompletions

Monitor command completion status. Unbounded with auto-reconnect.

```typescript
function streamCompletions(
  transport: Transport,
  options: StreamCompletionsOptions,
): AsyncIterable<CompletionEvent>
```

### StreamCompletionsOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `parties` | `string[]` | Yes | Parties to monitor |
| `beginExclusive` | `string` | Yes | Start offset |
| `signal` | `AbortSignal` | No | Cancellation signal |
| `reconnect` | `ReconnectConfig` | No | Reconnect behavior |

## ReconnectConfig

```typescript
type ReconnectConfig = {
  readonly initialDelayMs?: number  // default: 1000
  readonly maxDelayMs?: number      // default: 30000
  readonly factor?: number          // default: 2
  readonly jitter?: number          // default: 0.25
}
```

## toWebSocketUrl

Convert an HTTP URL to a WebSocket URL.

```typescript
function toWebSocketUrl(url: string): string

toWebSocketUrl('http://localhost:7575')   // 'ws://localhost:7575'
toWebSocketUrl('https://canton.example') // 'wss://canton.example'
```
