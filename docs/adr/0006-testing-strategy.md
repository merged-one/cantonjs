# ADR 0006: Testing Strategy

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

cantonjs needs three layers of testing:

1. **Unit tests** — fast, no network, mock transport
2. **Integration tests** — against a real Canton sandbox
3. **Consumer testing** — help dApp developers test their own code

Unit tests are covered (142 passing via mock transport). We need to decide how to support integration testing and how to provide testing utilities to consumers.

Key constraints:
- cantonctl (`merged-one/cantonctl`) already manages Canton sandbox lifecycle
- Canton sandbox requires JVM and significant startup time (5-15 seconds)
- JWT tokens are required for authenticated API access
- cantonjs should remain zero-dependency in production

## Decision

### 1. cantonctl as Sandbox Manager

Use `cantonctl dev` for sandbox lifecycle rather than managing Canton directly.

**Rationale:**
- cantonctl already solves sandbox start/stop/reset with health checks
- cantonctl generates JWT tokens via `cantonctl auth`
- Avoids duplicating complex JVM/Docker orchestration
- Users building with cantonjs likely already have cantonctl installed
- cantonctl is optional — integration tests skip if not available

### 2. setupCantonSandbox() Fixture

Provide a vitest fixture that:
- Detects cantonctl availability
- Starts sandbox via `cantonctl dev start`
- Waits for health check (`GET /livez`)
- Creates a configured TestClient with valid JWT
- Cleans up via `cantonctl dev stop`

### 3. Mock Transport with Recording/Replay

Provide `createMockTransport()` and `createRecordingTransport()` for consumer testing:
- **Mock transport** — returns pre-configured responses for specific request patterns
- **Recording transport** — wraps a real transport and records all request/response pairs for later replay

**Rationale:** dApp developers need to test their code without running a Canton sandbox. Recording/replay enables realistic offline testing.

### 4. Testing Subpath Export

All testing utilities ship under `cantonjs/testing`:
- `createTestClient()` (existing)
- `setupCantonSandbox()` (new)
- `createMockTransport()` (new)
- `createRecordingTransport()` (new)

**Rationale:** Tree-shaking ensures testing code is never bundled in production. The subpath export makes the boundary explicit.

## Consequences

### Positive
- Reuses battle-tested cantonctl sandbox management
- Zero production dependencies (testing utils are dev-only)
- Recording/replay enables fast, deterministic consumer tests
- Integration tests validate real Canton behavior

### Negative
- cantonctl is an external dependency for integration tests
- Sandbox startup adds 5-15 seconds to integration test suites
- Recording/replay can go stale if API changes

## References

- [cantonctl repository](https://github.com/merged-one/cantonctl)
- [Vitest fixtures](https://vitest.dev/guide/test-context.html)
- [nock](https://github.com/nock/nock) — inspiration for recording/replay pattern
