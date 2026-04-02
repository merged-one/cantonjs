# cantonjs-codegen

Generate TypeScript types from Daml DAR files for use with [cantonjs](https://github.com/merged-one/cantonjs).

[![npm version](https://img.shields.io/npm/v/cantonjs-codegen.svg)](https://www.npmjs.com/package/cantonjs-codegen)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/merged-one/cantonjs/blob/main/LICENSE)

## Install

```bash
npm install --save-dev cantonjs-codegen
```

## Usage

```bash
cantonjs-codegen --dar ./model.dar --output ./src/generated
```

This reads your DAR file, extracts Daml-LF package definitions, and generates TypeScript modules.

## Generated Output

### Records

```haskell
data Asset = Asset with
  owner : Party
  value : Int
```

```typescript
export type Asset = {
  readonly owner: string
  readonly value: string  // Int64 -> string for precision
}
```

### Variants

```haskell
data Result = Success with value : Int
            | Failure with reason : Text
```

```typescript
export type Result =
  | { readonly tag: 'Success'; readonly value: { readonly value: string } }
  | { readonly tag: 'Failure'; readonly value: { readonly reason: string } }
```

### Enums

```haskell
data Color = Red | Green | Blue
```

```typescript
export type Color = 'Red' | 'Green' | 'Blue'
```

### Templates

Templates generate companion const objects with `templateId` and choice definitions:

```typescript
export const Asset = {
  templateId: '#my-pkg:Main:Asset' as const,
  choices: {
    Transfer: { name: 'Transfer' as const },
  },
} as const
```

## Type Mapping

| Daml Type | TypeScript Type | Notes |
|-----------|-----------------|-------|
| `Int` / `Int64` | `string` | Precision preservation |
| `Numeric n` | `string` | Arbitrary precision |
| `Text` | `string` | |
| `Bool` | `boolean` | |
| `Party` | `string` | |
| `ContractId a` | `string` | |
| `Date` / `Time` | `string` | ISO 8601 |
| `Optional a` | `T \| null` | |
| `List a` | `readonly T[]` | |
| `Map k v` | `ReadonlyMap<K, V>` | |

## Using Generated Types with cantonjs

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'
import { Asset } from './generated/Main.js'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: jwt }),
  actAs: 'Alice::1234',
})

// Type-safe template ID and arguments
const created = await client.createContract(Asset.templateId, {
  owner: 'Alice',
  value: '100',
})

await client.exerciseChoice(
  Asset.templateId,
  created.contractId,
  Asset.choices.Transfer.name,
  { newOwner: 'Bob' },
)
```

## How It Works

1. **Parse** &mdash; extract `.dalf` files from the DAR (ZIP) archive using JSZip
2. **Decode** &mdash; parse Daml-LF protobuf with intern table resolution using protobufjs
3. **Emit** &mdash; generate TypeScript modules from decoded type definitions

## Requirements

- Node.js >= 18

## Related

- [cantonjs](https://github.com/merged-one/cantonjs) &mdash; Core TypeScript library for Canton
- [cantonjs-react](https://github.com/merged-one/cantonjs/tree/main/packages/cantonjs-react) &mdash; React hooks for Canton dApps

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
