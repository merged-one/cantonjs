# cantonjs-codegen

CLI tool for generating TypeScript types from Daml DAR files.

## Installation

```bash
npm install --save-dev cantonjs-codegen
```

## Usage

```bash
cantonjs-codegen --dar ./model.dar --output ./src/generated
```

### Options

| Flag | Description |
|------|-------------|
| `--dar <path>` | Path to the DAR file |
| `--output <dir>` | Output directory for generated TypeScript |

## What Gets Generated

Given a Daml model:

```haskell
module Main where

data Asset = Asset with
    owner : Party
    value : Int
    description : Text
  deriving (Eq, Show)

data Color = Red | Green | Blue

data Result
  = Success with value : Int
  | Failure with reason : Text

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

cantonjs-codegen produces:

```typescript
// src/generated/Main.ts

export type Asset = {
  readonly owner: string
  readonly value: string
  readonly description: string
}

export type Color = 'Red' | 'Green' | 'Blue'

export type Result =
  | { readonly tag: 'Success'; readonly value: { readonly value: string } }
  | { readonly tag: 'Failure'; readonly value: { readonly reason: string } }

export const Asset = {
  templateId: '#my-pkg:Main:Asset' as const,
  choices: {
    Transfer: {
      name: 'Transfer' as const,
    },
  },
} as const
```

## Type Mapping Reference

See the [Codegen guide](/guide/codegen#type-mapping) for the complete Daml-to-TypeScript type mapping table.

## Architecture

cantonjs-codegen works in three stages:

1. **Parse** — Extract `.dalf` files from the DAR (ZIP) archive
2. **Decode** — Parse Daml-LF protobuf with intern table resolution
3. **Emit** — Generate TypeScript modules from the decoded type definitions

For architectural details, see [ADR 0007: Codegen Architecture](/adr/0007-codegen-architecture).
