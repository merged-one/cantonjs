# Errors API

All errors extend `CantonjsError` with structured metadata.

## CantonjsError

Base error class for all cantonjs errors.

```typescript
class CantonjsError extends Error {
  readonly code: ErrorCode
  readonly metaMessages: readonly string[]
  readonly docsPath: string

  walk(fn: (error: CantonjsError) => void): void
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | `ErrorCode` | Machine-readable error code (e.g., `'CJ1001'`) |
| `metaMessages` | `string[]` | Recovery hints for developers |
| `docsPath` | `string` | Path to error documentation |

### walk()

Traverses the error cause chain:

```typescript
error.walk((cause) => {
  console.log(cause.code, cause.message)
})
```

## Transport Errors (CJ1xxx)

### ConnectionError

Cannot reach the Canton node.

```typescript
class ConnectionError extends CantonjsError {
  readonly code: 'CJ1001'
}
```

### HttpError

HTTP-level failure (non-2xx response).

```typescript
class HttpError extends CantonjsError {
  readonly code: 'CJ1002'
  readonly statusCode: number
  readonly responseBody: unknown
}
```

### GrpcError

gRPC-level failure.

```typescript
class GrpcError extends CantonjsError {
  readonly code: 'CJ1003'
  readonly grpcCode: number
}
```

### TimeoutError

Request timed out.

```typescript
class TimeoutError extends CantonjsError {
  readonly code: 'CJ1004'
}
```

## Authentication Errors (CJ2xxx)

### TokenExpiredError

JWT has expired.

```typescript
class TokenExpiredError extends CantonjsError {
  readonly code: 'CJ2001'
}
```

### InvalidTokenError

JWT is malformed or invalid.

```typescript
class InvalidTokenError extends CantonjsError {
  readonly code: 'CJ2002'
}
```

## Ledger Errors (CJ3xxx)

### CommandRejectedError

Ledger rejected the submitted command.

```typescript
class CommandRejectedError extends CantonjsError {
  readonly code: 'CJ3001'
}
```

### ContractNotFoundError

Contract does not exist or is not visible.

```typescript
class ContractNotFoundError extends CantonjsError {
  readonly code: 'CJ3002'
}
```

### AuthorizationError

Insufficient permissions for the operation.

```typescript
class AuthorizationError extends CantonjsError {
  readonly code: 'CJ3003'
}
```

## Streaming Errors (CJ5xxx)

### WebSocketError

WebSocket connection failure.

```typescript
class WebSocketError extends CantonjsError {
  readonly code: 'CJ5001'
}
```

### StreamClosedError

Stream ended unexpectedly.

```typescript
class StreamClosedError extends CantonjsError {
  readonly code: 'CJ5002'
}
```

### ReconnectFailedError

Maximum reconnection attempts exceeded.

```typescript
class ReconnectFailedError extends CantonjsError {
  readonly code: 'CJ5003'
}
```
