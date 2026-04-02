# Transport

The `Transport` interface is the foundation of cantonjs. All network communication flows through it, enabling testability and flexibility.

## JSON API Transport

The primary transport for Canton's JSON API V2:

```typescript
import { jsonApi } from 'cantonjs'

const transport = jsonApi({
  url: 'http://localhost:7575',
  token: 'your-jwt-token',
})
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | — | Canton JSON API V2 base URL |
| `token` | `string` | — | JWT bearer token for authentication |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `headers` | `Record<string, string>` | `{}` | Additional HTTP headers |

## gRPC Transport

Zero-dependency gRPC transport via an injected ConnectRPC client:

```typescript
import { grpc } from 'cantonjs'
import { createGrpcTransport } from '@connectrpc/connect-node'

const transport = grpc({
  grpcTransport: createGrpcTransport({ baseUrl: 'http://localhost:7575' }),
  token: 'your-jwt-token',
})
```

The gRPC transport maps JSON API paths to gRPC service/method names internally, so client code works identically regardless of transport.

## Fallback Transport

Tries transports in sequence, retrying on connection errors:

```typescript
import { jsonApi, grpc, fallback } from 'cantonjs'

const transport = fallback({
  transports: [
    jsonApi({ url: 'http://primary:7575', token: jwt }),
    jsonApi({ url: 'http://backup:7575', token: jwt }),
  ],
  retries: 3,
})
```

The fallback transport only retries on `ConnectionError` and `TimeoutError`. Application-level errors (like `HttpError`) are thrown immediately.

## Custom Transports

Implement the `Transport` interface for custom behavior:

```typescript
import type { Transport, TransportRequest } from 'cantonjs'

const myTransport: Transport = {
  type: 'custom',
  url: 'http://localhost:7575',
  request: async <T>(args: TransportRequest): Promise<T> => {
    // Your custom implementation
  },
}
```

## AbortSignal Support

All transports support `AbortSignal` for request cancellation:

```typescript
const controller = new AbortController()

const contracts = await client.queryContracts('#pkg:Mod:T', {
  signal: controller.signal,
})

// Cancel the request
controller.abort()
```
