# Codegen

`cantonjs-codegen` is the optional convenience package for generating TypeScript types from Daml DAR files that already exist in your workflow.

It is not the canonical Daml build, test, or codegen toolchain. DPM remains the canonical upstream tool for Daml project lifecycle work. `cantonjs-codegen` starts later, when an application team already has DAR artifacts and wants TypeScript descriptors and types for app-side code.

## Installation

```bash
npm install --save-dev cantonjs-codegen
```

## Usage

```bash
cantonjs-codegen --dar ./model.dar --output ./src/generated
```

This reads the DAR file, extracts Daml-LF package definitions, and generates TypeScript modules.

Use it when you want better app-side typing. Do not use it as the reason to skip the official Daml toolchain.

See [Package Architecture](/guide/package-architecture) for where `cantonjs-codegen` sits relative to the core SDK, add-ons, and adapters.

## Generated Output

### Records

Daml records become TypeScript type aliases with readonly fields:

```haskell
data Asset = Asset with
  owner : Party
  value : Int
```

```typescript
// Generated: src/generated/Main.ts
export type Asset = {
  readonly owner: string
  readonly value: string  // Int64 → string for precision
}
```

### Variants

Daml variants become discriminated unions:

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

Daml enums become string union types:

```haskell
data Color = Red | Green | Blue
```

```typescript
export type Color = 'Red' | 'Green' | 'Blue'
```

### Templates

Templates generate companion const objects with `templateId` and choice definitions:

```haskell
template Asset with
    owner : Party
    value : Int
  where
    signatory owner
    choice Transfer : ContractId Asset
      with newOwner : Party
      controller owner
      do create this with owner = newOwner
```

```typescript
export const Asset = {
  templateId: '#my-pkg:Main:Asset' as const,
  choices: {
    Transfer: {
      name: 'Transfer' as const,
    },
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
| `Date` | `string` | ISO 8601 |
| `Time` | `string` | ISO 8601 |
| `Optional a` | `T \| null` | |
| `List a` | `readonly T[]` | |
| `Map k v` | `ReadonlyMap<K, V>` | |
| `Unit` | `{}` | |

## Runtime Support

The `cantonjs/codegen` subpath provides runtime types for working with generated code:

```typescript
import type { TemplateDescriptor, InferPayload, InferChoiceArgs } from 'cantonjs/codegen'

// Type-safe contract creation
function createTyped<T extends TemplateDescriptor>(
  client: LedgerClient,
  template: T,
  payload: InferPayload<T>,
) {
  return client.createContract(template.templateId, payload)
}
```
