# ADR 0007: Codegen Architecture

**Status:** Accepted
**Date:** 2026-04-01
**Authors:** Charles Dusek

## Context

cantonjs provides generic, untyped functions for interacting with the Canton ledger:

```typescript
await client.createContract('#my-pkg:Main:Asset', { owner: 'Alice', value: '100' })
```

This works but offers no type safety — the template ID is a raw string, the arguments are `Record<string, unknown>`. Daml's rich type system (records, variants, enums, templates with choices) is lost.

The existing `daml codegen js` is inadequate:
- Targets the deprecated JSON API v1
- Produces CJS output (not tree-shakeable)
- Generates full client wrappers (not composable with cantonjs)
- Weak TypeScript types

We need our own codegen that produces modern, minimal TypeScript from DAR files.

### DAR File Structure

DAR (Daml Archive) files are ZIP archives containing:
- One or more `.dalf` files (Daml-LF packages encoded as Protocol Buffers)
- A `META-INF/MANIFEST.MF` manifest

Each DALF contains a protobuf `Archive` message wrapping a `Package` with:
- `modules[]` — each containing `data_types[]` (records, variants, enums) and `templates[]`
- `interned_strings[]` and `interned_dotted_names[]` for string interning

## Decision

### 1. Separate CLI Package

The codegen lives in `packages/cantonjs-codegen/` as a separate npm package:
- Depends on `protobufjs` and `jszip` (heavy, build-time only)
- Core `cantonjs` package stays zero-dependency
- Installed as a dev dependency: `npm install -D cantonjs-codegen`

### 2. Minimal Output: Types + Companion Objects

Generated code produces **types and companion const objects**, not client wrappers:

```typescript
// Generated from #my-package:Main:Asset
export type Asset = {
  readonly owner: string
  readonly description: string
  readonly value: string
}

export const Asset = {
  templateId: '#my-package:Main:Asset' as const,
  choices: {
    Transfer: { name: 'Transfer' as const },
    Archive: { name: 'Archive' as const },
  },
} as const

export type Asset_Transfer = {
  readonly newOwner: string
}
```

TypeScript declaration merging allows a `type` and `const` to share the same name.

**Rationale:** The core library provides generic type-parameterized functions. Codegen adds the types; the library provides the behavior. This separation is cleaner than generating full client wrappers.

### 3. Runtime Support via cantonjs/codegen Subpath

A small `cantonjs/codegen` subpath exports:
- `TemplateDescriptor<TPayload, TChoices>` — type linking template ID to payload and choice types
- Type-safe overloads on LedgerClient that accept descriptors

```typescript
const contract = await client.createContract(Asset, {
  owner: alice,         // ← type-checked
  description: 'Gold',
  value: '100.0',
})
```

### 4. Daml-LF Type Mapping

| Daml-LF Type | TypeScript Type | Rationale |
|---|---|---|
| Text | `string` | Direct mapping |
| Bool | `boolean` | Direct mapping |
| Int64 | `string` | Canton JSON API encodes as string for precision |
| Numeric | `string` | Canton JSON API encodes as string for precision |
| Party | `string` | Matches Party branded type |
| ContractId T | `string` | Contract IDs are strings on the wire |
| Timestamp | `string` | ISO 8601 string |
| Date | `string` | ISO date string |
| Unit | `Record<string, never>` | Empty object |
| Optional T | `T \| null` | Canton JSON uses null for None |
| List T | `readonly T[]` | Readonly array |
| TextMap T | `Readonly<Record<string, T>>` | Object keys are strings |
| GenMap K V | `ReadonlyArray<readonly [K, V]>` | Key-value pairs |
| Record | `{ readonly field: Type; ... }` | Named fields |
| Variant | Discriminated union | `{ tag: 'A'; value: TA } \| ...` |
| Enum | String union | `'Red' \| 'Green' \| 'Blue'` |

### 5. DAR Parsing via Protobufjs

Use `protobufjs` with pre-generated static decoders from vendored Daml-LF `.proto` files. This avoids loading `.proto` files at runtime and provides type-safe AST traversal.

## Consequences

### Positive
- Type-safe contract operations with IDE autocomplete
- Zero-dependency core package preserved
- Generated code is tree-shakeable ESM
- `as const` enables deep type inference
- Declaration merging (type + const same name) is idiomatic TypeScript

### Negative
- Requires a build step (DAR → TypeScript)
- Must vendor and maintain Daml-LF proto definitions
- String interning adds decode complexity
- Protobuf dependency makes the codegen CLI package heavier

## References

- [How to Parse Daml Archive Files](https://docs.digitalasset.com/build/3.4/component-howtos/development-tooling-authors/how-to-parse-daml-archive-files.html)
- [Daml-LF JSON Encoding](https://docs.daml.com/json-api/lf-value-specification.html)
- [daml_lf.proto source](https://github.com/digital-asset/daml/blob/master/daml-lf/archive/src/main/protobuf/com/digitalasset/daml_lf_dev/daml_lf.proto)
