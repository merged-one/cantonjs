/**
 * Daml-LF AST types.
 *
 * These types represent the decoded structure from DALF protobuf files.
 * They are a TypeScript representation of the Daml-LF archive schema,
 * covering only the subset needed for codegen (data types, templates, choices).
 *
 * @see https://github.com/digital-asset/daml/blob/main/sdk/daml-lf/archive/src/main/protobuf/com/digitalasset/daml_lf_dev/daml_lf.proto
 */

/** Top-level DAR contents. */
export type DarContents = {
  readonly packages: readonly DalfPackage[]
  readonly mainPackageId: string
}

/** A decoded DALF package. */
export type DalfPackage = {
  readonly packageId: string
  readonly name?: string
  readonly version?: string
  readonly modules: readonly DamlModule[]
}

/** A Daml module within a package. */
export type DamlModule = {
  readonly name: string
  readonly dataTypes: readonly DamlDataType[]
  readonly templates: readonly DamlTemplate[]
}

/** A data type definition (record, variant, or enum). */
export type DamlDataType = {
  readonly name: string
  readonly typeParams: readonly string[]
  readonly definition: DamlDataTypeDef
}

/** The kind of data type. */
export type DamlDataTypeDef =
  | { readonly kind: 'record'; readonly fields: readonly DamlField[] }
  | { readonly kind: 'variant'; readonly constructors: readonly DamlField[] }
  | { readonly kind: 'enum'; readonly constructors: readonly string[] }

/** A field in a record or variant constructor. */
export type DamlField = {
  readonly name: string
  readonly type: DamlType
}

/** A Daml-LF type reference. */
export type DamlType =
  | { readonly kind: 'prim'; readonly prim: DamlPrimType; readonly args: readonly DamlType[] }
  | { readonly kind: 'con'; readonly module: string; readonly name: string; readonly args: readonly DamlType[] }
  | { readonly kind: 'var'; readonly name: string }
  | { readonly kind: 'nat'; readonly value: number }

/** Primitive types in Daml-LF. */
export type DamlPrimType =
  | 'UNIT'
  | 'BOOL'
  | 'INT64'
  | 'NUMERIC'
  | 'TEXT'
  | 'TIMESTAMP'
  | 'PARTY'
  | 'DATE'
  | 'CONTRACT_ID'
  | 'OPTIONAL'
  | 'LIST'
  | 'TEXTMAP'
  | 'GENMAP'
  | 'ANY'
  | 'UPDATE'
  | 'SCENARIO'
  | 'ARROW'

/** A template definition. */
export type DamlTemplate = {
  readonly name: string
  readonly choices: readonly DamlChoice[]
}

/** A choice on a template. */
export type DamlChoice = {
  readonly name: string
  readonly consuming: boolean
  readonly argType: DamlType
  readonly returnType: DamlType
}
