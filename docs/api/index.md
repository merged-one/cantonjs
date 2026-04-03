# API Reference

Complete API reference for cantonjs.

## Clients

| Factory | Description |
|---------|-------------|
| [`createLedgerClient(config)`](/api/clients#createledgerclient) | Party-scoped client for contract operations |
| [`createAdminClient(config)`](/api/clients#createadminclient) | Node administration (parties, users, packages) |
| [`createTestClient(config)`](/api/clients#createtestclient) | Testing client extending both Ledger + Admin |

## Transport

| Factory | Description |
|---------|-------------|
| [`jsonApi(config)`](/api/transport#jsonapi) | HTTP transport for Canton JSON API V2 |
| [`grpc(config)`](/api/transport#grpc) | gRPC transport via injected ConnectRPC client |
| [`fallback(config)`](/api/transport#fallback) | Failover across multiple transports |

## Streaming

| Function | Description |
|----------|-------------|
| [`streamUpdates(transport, options)`](/api/streaming#streamupdates) | Transaction update stream (unbounded, auto-reconnect) |
| [`streamContracts(transport, options)`](/api/streaming#streamcontracts) | Active contract snapshot stream (bounded) |
| [`streamCompletions(transport, options)`](/api/streaming#streamcompletions) | Command completion stream (unbounded, auto-reconnect) |
| [`toWebSocketUrl(url)`](/api/streaming#towebsocketurl) | Convert HTTP URL to WebSocket URL |

## Errors

| Class | Code Range | Description |
|-------|-----------|-------------|
| [`CantonjsError`](/api/errors#cantonjserror) | — | Base error with `code`, `metaMessages`, `docsPath`, `walk()` |
| [`ConnectionError`](/api/errors#connectionerror) | CJ1xxx | Cannot reach the Canton node |
| [`HttpError`](/api/errors#httperror) | CJ1xxx | HTTP-level failure |
| [`TimeoutError`](/api/errors#timeouterror) | CJ1xxx | Request timed out |
| [`TokenExpiredError`](/api/errors#tokenexpirederror) | CJ2xxx | JWT has expired |
| [`CommandRejectedError`](/api/errors#commandrejectederror) | CJ3xxx | Ledger rejected the command |
| [`ContractNotFoundError`](/api/errors#contractnotfounderror) | CJ3xxx | Contract doesn't exist |

## Chains

| Export | Description |
|--------|-------------|
| [`defineChainPreset(config)`](/api/chains#helper-functions) | Define a custom chain preset |
| [`withChainOverrides(chain, overrides)`](/api/chains#override-friendly-usage) | Layer runtime URLs and auth hints onto a preset |
| [`localNet`](/api/chains#localnet) | Local development with concrete participant URLs |
| [`devNet`](/api/chains#devnet) | Discovery-first public dev preset |
| [`testNet`](/api/chains#testnet) | Discovery-first public test preset |
| [`mainNet`](/api/chains#mainnet) | Discovery-first public main preset |

## Packages

| Package | Description |
|---------|-------------|
| [`cantonjs`](https://github.com/merged-one/cantonjs) | Core library |
| [`cantonjs-codegen`](/packages/codegen) | DAR-to-TypeScript code generation CLI |
| [`cantonjs-react`](/packages/react) | React hooks for Canton dApps |
| [`cantonjs-splice-scan`](/guide/scan) | Public Scan client for Splice networks |
| [`cantonjs-splice-validator`](/guide/validator-ans) | Validator ANS and public Scan Proxy clients |
| [`cantonjs-splice-token-standard`](/guide/token-standard) | Ledger-centric Token Standard helpers |
| [`cantonjs-wallet-adapters`](/guide/wallet-adapters) | Experimental CIP-0103 wallet boundary adapters |
