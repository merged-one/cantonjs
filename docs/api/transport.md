# Transport API

## Transport Interface

```typescript
type Transport = {
  readonly type: string
  readonly url: string
  request: <TResponse = unknown>(args: TransportRequest) => Promise<TResponse>
}

type TransportRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeout?: number
}
```

## jsonApi

Creates an HTTP transport for Canton JSON API V2.

```typescript
function jsonApi(config: TransportConfig): Transport
```

### TransportConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `url` | `string` | Yes | — | Base URL of the Canton node |
| `token` | `string` | Yes | — | JWT bearer token |
| `timeout` | `number` | No | `30000` | Request timeout (ms) |
| `headers` | `Record<string, string>` | No | `{}` | Additional headers |

## grpc

Creates a gRPC transport via an injected ConnectRPC client.

```typescript
function grpc(config: GrpcTransportConfig): Transport
```

### GrpcTransportConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grpcTransport` | `GrpcTransportLike` | Yes | ConnectRPC transport instance |
| `token` | `string` | Yes | JWT bearer token |

### GrpcTransportLike

```typescript
type GrpcTransportLike = {
  readonly unary: (
    service: string,
    method: string,
    signal: AbortSignal | undefined,
    timeoutMs: number | undefined,
    header: Record<string, string>,
    message: unknown,
  ) => Promise<{ readonly message: unknown }>
}
```

## fallback

Creates a failover transport that tries transports in sequence.

```typescript
function fallback(config: FallbackTransportConfig): Transport
```

### FallbackTransportConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `transports` | `Transport[]` | Yes | — | Ordered list of transports to try |
| `retries` | `number` | No | `3` | Max retry attempts per transport |

Only retries on `ConnectionError` and `TimeoutError`. Application-level errors (e.g., `HttpError`) are thrown immediately.
