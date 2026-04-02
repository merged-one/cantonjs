# Error Handling

cantonjs uses structured errors with error codes, recovery hints, and traversable cause chains.

## Error Hierarchy

All errors extend `CantonjsError`:

```
CantonjsError
├── ConnectionError    (CJ1xxx) — Cannot reach the node
├── HttpError          (CJ1xxx) — HTTP-level failure
├── GrpcError          (CJ1xxx) — gRPC-level failure
├── TimeoutError       (CJ1xxx) — Request timed out
├── TokenExpiredError   (CJ2xxx) — JWT has expired
├── InvalidTokenError   (CJ2xxx) — JWT is malformed
├── CommandRejectedError (CJ3xxx) — Ledger rejected command
├── ContractNotFoundError (CJ3xxx) — Contract doesn't exist
├── AuthorizationError   (CJ3xxx) — Insufficient permissions
├── WebSocketError      (CJ5xxx) — WebSocket connection failure
├── StreamClosedError   (CJ5xxx) — Stream ended unexpectedly
└── ReconnectFailedError (CJ5xxx) — Max reconnect attempts exceeded
```

## Error Codes

| Range | Domain |
|-------|--------|
| CJ1xxx | Transport (connection, HTTP, gRPC, timeout) |
| CJ2xxx | Authentication (JWT, token lifecycle) |
| CJ3xxx | Ledger (command rejection, contract not found, authorization) |
| CJ4xxx | Admin (party, user, package management) |
| CJ5xxx | Streaming (subscription, reconnection) |
| CJ6xxx | Codegen (type mismatch, generation) |

## Error Properties

Every `CantonjsError` includes:

```typescript
try {
  await client.createContract(templateId, args)
} catch (error) {
  if (error instanceof CantonjsError) {
    error.code          // 'CJ3001' — machine-readable code
    error.metaMessages  // ['Check that template ID uses # prefix'] — recovery hints
    error.docsPath      // '/errors/CJ3001' — link to documentation
    error.message       // Human-readable description
  }
}
```

## Traversing Cause Chains

Use `walk()` to traverse nested error causes:

```typescript
import { CantonjsError } from 'cantonjs'

try {
  await client.exerciseChoice(templateId, contractId, choice, args)
} catch (error) {
  if (error instanceof CantonjsError) {
    error.walk((cause) => {
      console.log(cause.message)
      if (cause instanceof ContractNotFoundError) {
        // Handle specifically
      }
    })
  }
}
```

## Catching Specific Errors

```typescript
import {
  ConnectionError,
  TimeoutError,
  CommandRejectedError,
  TokenExpiredError,
} from 'cantonjs'

try {
  await client.createContract(templateId, args)
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Refresh JWT and retry
  } else if (error instanceof ConnectionError) {
    // Node is unreachable
  } else if (error instanceof CommandRejectedError) {
    // Command was rejected by the ledger
  } else if (error instanceof TimeoutError) {
    // Request timed out — retry?
  }
}
```

## Alignment with cantonctl

cantonjs error codes complement cantonctl's E1xxx-E8xxx ranges. The two tools share error conventions so that developers see consistent patterns across the CLI and SDK.
