# Contributing to cantonjs

Thank you for your interest in contributing to cantonjs. This document covers the development setup, coding conventions, and pull request process.

## Development Setup

```bash
git clone https://github.com/merged-one/cantonjs.git
cd cantonjs
npm install
```

### Running Tests

```bash
# Core package (192 tests)
npm test

# Codegen package (29 tests)
cd packages/cantonjs-codegen && npm test

# React package (16 tests)
cd packages/cantonjs-react && npm test

# With coverage
npm run test:coverage
```

### Other Commands

```bash
npm run typecheck     # Type-check without emitting
npm run lint          # Lint source files
npm run build         # Build ESM + CJS + types
npm run size          # Check bundle size limits
npm run docs:dev      # Start docs dev server
```

## Architecture Rules

These rules are non-negotiable. PRs that violate them will be asked to revise.

1. **Function exports, not classes.** Every public API is a function. `createLedgerClient()`, not `new LedgerClient()`. This enables tree-shaking.

2. **Dependency injection.** All I/O goes through the `Transport` interface. No direct `fetch()` calls in client code. Tests use mock transports, never `vi.mock()`.

3. **AbortSignal support.** Long-running operations (streaming, commands) accept an `AbortSignal` for cancellation.

4. **Structured errors.** Every error is a `CantonjsError` with `code`, `metaMessages`, and `docsPath`. Use `walk()` to traverse cause chains.

5. **ESM-first, tree-shakeable.** Ship ESM + CJS via dual build. Mark `sideEffects: false`.

6. **Test-first TDD.** Write the test, then the implementation.

## Coding Conventions

### TypeScript

- Use `readonly` for all properties and parameters that should not be mutated
- Prefer type aliases over interfaces for data types
- Use discriminated unions (tagged unions) for variant types
- Keep types co-located with their implementations

### Testing

- Use `createMockTransport()` for unit tests, not `vi.mock()`
- Test behavior, not implementation details
- Each test file mirrors its source file: `foo.ts` -> `foo.test.ts`

### Errors

- Use the appropriate error class from `src/errors/`
- Include `metaMessages` with recovery hints
- Set `docsPath` pointing to the error documentation
- Error codes follow the range conventions in CLAUDE.md

### Commits

- Write clear, descriptive commit messages
- Use imperative mood: "Add feature" not "Added feature"
- Reference issues when applicable: "Fix #123"

## Pull Request Process

1. **Fork and branch.** Create a feature branch from `main`.

2. **Write tests first.** New features and bug fixes should include tests.

3. **Run the full check suite** before submitting:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build && npm run size
   ```

4. **Keep PRs focused.** One feature or fix per PR. Separate refactoring from behavior changes.

5. **Update documentation** if your change affects the public API. This includes:
   - TSDoc comments on exported functions and types
   - Guide pages in `docs/guide/` if adding a new feature
   - API reference pages in `docs/api/` if changing signatures
   - `llms.txt` if adding new exports or endpoints

6. **Bundle size matters.** If `npm run size` fails, investigate. We track bundle size in CI.

## Project Structure

```
cantonjs/
  src/
    clients/       # Client factories (LedgerClient, AdminClient, TestClient)
    transport/     # Transport abstraction (JSON API, gRPC, fallback)
    streaming/     # WebSocket streaming (updates, contracts, completions)
    types/         # Canton data types (contracts, parties, commands)
    errors/        # Structured error hierarchy
    chains/        # Network definitions (localNet, devNet, testNet, mainNet)
    codegen/       # Runtime support for generated types
    testing/       # Test utilities (mock transport, sandbox fixture)
    ledger/        # Subpath barrel: cantonjs/ledger
    admin/         # Subpath barrel: cantonjs/admin
  packages/
    cantonjs-codegen/   # CLI: DAR -> TypeScript codegen
    cantonjs-react/     # React hooks for Canton dApps
  docs/
    guide/         # VitePress guide pages
    api/           # API reference pages
    examples/      # Example pages
    adr/           # Architecture Decision Records
```

## Architecture Decision Records

Significant design decisions are documented as ADRs in `docs/adr/`. If your contribution involves a non-trivial architectural choice, write an ADR.

## Questions?

Open an [issue](https://github.com/merged-one/cantonjs/issues) or start a [discussion](https://github.com/merged-one/cantonjs/discussions).

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 License](./LICENSE).
