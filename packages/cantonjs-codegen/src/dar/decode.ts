/**
 * DALF protobuf decoder.
 *
 * Decodes Daml-LF protobuf-encoded packages into a typed AST.
 * Uses protobufjs for raw decoding, then maps to our DalfPackage type.
 *
 * Daml-LF archive format:
 * - Archive: { hash_function, hash, payload (ArchivePayload bytes) }
 * - ArchivePayload: { minor version, Package }
 * - Package: { modules[], interned_strings[], interned_dotted_names[], metadata }
 *
 * Modern Daml-LF (v2+) uses string interning: names are stored as indices
 * into interned_strings[] and interned_dotted_names[] arrays.
 *
 * @see https://docs.digitalasset.com/build/3.4/component-howtos/development-tooling-authors/how-to-parse-daml-archive-files.html
 */

import * as protobuf from 'protobufjs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  DalfPackage,
  DamlModule,
  DamlDataType,
  DamlDataTypeDef,
  DamlTemplate,
  DamlChoice,
  DamlField,
  DamlType,
  DamlPrimType,
} from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Lazy-loaded protobuf root
let protoRoot: protobuf.Root | null = null

async function getProtoRoot(): Promise<protobuf.Root> {
  if (protoRoot) return protoRoot
  const protoPath = path.resolve(__dirname, '../../proto/daml_lf.proto')
  protoRoot = await protobuf.load(protoPath)
  return protoRoot
}

/**
 * Decode a DALF file's raw bytes into a DalfPackage.
 *
 * @param dalfBytes - Raw protobuf bytes of a .dalf file
 * @param packageId - The package ID (typically the SHA-256 hash)
 */
export async function decodeDalf(
  dalfBytes: Uint8Array,
  packageId: string,
): Promise<DalfPackage> {
  const root = await getProtoRoot()

  // Decode Archive message
  const ArchiveType = root.lookupType('daml_lf_dev.Archive')
  const archive = ArchiveType.decode(dalfBytes) as unknown as {
    hashFunction: number
    hash: string
    payload: Uint8Array
  }

  // Decode ArchivePayload
  const ArchivePayloadType = root.lookupType('daml_lf_dev.ArchivePayload')
  const payload = ArchivePayloadType.decode(archive.payload) as unknown as {
    minor: string
    Package?: RawPackage
    daml_lf_2?: RawPackage
  }

  const pkg = payload.Package ?? payload.daml_lf_2
  if (!pkg) {
    throw new Error(`Failed to decode package from DALF: no Package field found`)
  }

  return decodePackage(pkg, packageId)
}

// --- Raw protobuf message types (decoded by protobufjs) ---

type RawPackage = {
  modules?: RawModule[]
  interned_strings?: string[]
  interned_dotted_names?: RawInternedDottedName[]
  metadata?: { name_interned_str?: number; version_interned_str?: number }
}

type RawInternedDottedName = {
  segments_interned_str?: number[]
}

type RawModule = {
  name_interned_dname?: number
  data_types?: RawDefDataType[]
  templates?: RawDefTemplate[]
}

type RawRecordOrVariant = {
  fields_interned_str?: RawFieldWithType[]
  fields?: RawFieldWithType[]
}

type RawEnumDef = {
  constructors_interned_str?: number[]
}

type RawDefDataType = {
  name_interned_dname?: number
  params?: RawTypeVarWithKind[]
  DataRecord?: RawRecordOrVariant
  DataVariant?: RawRecordOrVariant
  DataEnum?: RawEnumDef
  record?: RawRecordOrVariant
  variant?: RawRecordOrVariant
  enum?: RawEnumDef
}

type RawTypeVarWithKind = {
  var_interned_str?: number
  var?: string
}

type RawFieldWithType = {
  field_interned_str?: number
  field?: string
  type?: RawType
}

type RawDefTemplate = {
  tycon_interned_dname?: number
  choices?: RawTemplateChoice[]
}

type RawTemplateChoice = {
  name_interned_str?: number
  name?: string
  consuming?: boolean
  arg_type?: RawType
  ret_type?: RawType
}

type RawType = {
  prim?: { prim?: number; args?: RawType[] }
  con?: { tycon?: RawTypeConName; args?: RawType[] }
  var?: { var_interned_str?: number; var?: string }
  nat?: string | number
  interned?: number
  // Older format fields
  Prim?: { prim?: number; args?: RawType[] }
  Con?: { tycon?: RawTypeConName; args?: RawType[] }
  Var?: { var_interned_str?: number; var?: string }
  Nat?: string | number
}

type RawTypeConName = {
  module_ref?: { module_name_interned_dname?: number; package_ref?: unknown }
  name_interned_dname?: number
}

// --- Decoder helpers ---

class InternTable {
  private strings: readonly string[]
  private dottedNames: readonly RawInternedDottedName[]

  constructor(strings: readonly string[], dottedNames: readonly RawInternedDottedName[]) {
    this.strings = strings
    this.dottedNames = dottedNames
  }

  getString(index: number | undefined): string {
    if (index === undefined) return ''
    return this.strings[index] ?? ''
  }

  getDottedName(index: number | undefined): string {
    if (index === undefined) return ''
    const entry = this.dottedNames[index]
    if (!entry?.segments_interned_str) return ''
    return entry.segments_interned_str.map((i) => this.getString(i)).join('.')
  }
}

// Daml-LF PrimType enum values
const PRIM_TYPE_MAP: Record<number, DamlPrimType> = {
  0: 'UNIT',
  1: 'BOOL',
  2: 'INT64',
  3: 'TEXT',      // Older DECIMAL
  4: 'TEXT',      // TEXT in some versions
  5: 'TIMESTAMP',
  6: 'PARTY',
  7: 'LIST',
  8: 'UPDATE',
  9: 'SCENARIO',
  10: 'DATE',
  11: 'CONTRACT_ID',
  12: 'OPTIONAL',
  13: 'ARROW',
  14: 'TEXTMAP',
  15: 'NUMERIC',
  16: 'ANY',
  17: 'GENMAP',
}

function decodePackage(raw: RawPackage, packageId: string): DalfPackage {
  const intern = new InternTable(
    raw.interned_strings ?? [],
    raw.interned_dotted_names ?? [],
  )

  const name = raw.metadata?.name_interned_str !== undefined
    ? intern.getString(raw.metadata.name_interned_str)
    : undefined

  const version = raw.metadata?.version_interned_str !== undefined
    ? intern.getString(raw.metadata.version_interned_str)
    : undefined

  const modules = (raw.modules ?? []).map((m) => decodeModule(m, intern))

  return { packageId, name, version, modules }
}

function decodeModule(raw: RawModule, intern: InternTable): DamlModule {
  const name = intern.getDottedName(raw.name_interned_dname)
  const dataTypes = (raw.data_types ?? []).map((dt) => decodeDataType(dt, intern))
  const templates = (raw.templates ?? []).map((t) => decodeTemplate(t, intern))

  return { name, dataTypes, templates }
}

function decodeDataType(raw: RawDefDataType, intern: InternTable): DamlDataType {
  const name = intern.getDottedName(raw.name_interned_dname)
  const typeParams = (raw.params ?? []).map((p) =>
    p.var_interned_str !== undefined ? intern.getString(p.var_interned_str) : (p.var ?? ''),
  )

  let definition: DamlDataTypeDef

  const record = raw.DataRecord ?? raw.record
  const variant = raw.DataVariant ?? raw.variant
  const enumDef = raw.DataEnum ?? raw.enum

  if (record) {
    const fields = (record.fields_interned_str ?? record.fields ?? []).map((f) =>
      decodeField(f, intern),
    )
    definition = { kind: 'record', fields }
  } else if (variant) {
    const constructors = (variant.fields_interned_str ?? variant.fields ?? []).map((f) =>
      decodeField(f, intern),
    )
    definition = { kind: 'variant', constructors }
  } else if (enumDef) {
    const constructors = (enumDef.constructors_interned_str ?? []).map((i) =>
      intern.getString(i),
    )
    definition = { kind: 'enum', constructors }
  } else {
    // Unknown kind — treat as empty record
    definition = { kind: 'record', fields: [] }
  }

  return { name, typeParams, definition }
}

function decodeField(raw: RawFieldWithType, intern: InternTable): DamlField {
  const name = raw.field_interned_str !== undefined
    ? intern.getString(raw.field_interned_str)
    : (raw.field ?? '')
  const type = raw.type ? decodeType(raw.type, intern) : { kind: 'prim' as const, prim: 'ANY' as DamlPrimType, args: [] }

  return { name, type }
}

function decodeTemplate(raw: RawDefTemplate, intern: InternTable): DamlTemplate {
  const name = intern.getDottedName(raw.tycon_interned_dname)
  const choices = (raw.choices ?? []).map((c) => decodeChoice(c, intern))

  return { name, choices }
}

function decodeChoice(raw: RawTemplateChoice, intern: InternTable): DamlChoice {
  const name = raw.name_interned_str !== undefined
    ? intern.getString(raw.name_interned_str)
    : (raw.name ?? '')

  const argType = raw.arg_type
    ? decodeType(raw.arg_type, intern)
    : { kind: 'prim' as const, prim: 'UNIT' as DamlPrimType, args: [] }

  const returnType = raw.ret_type
    ? decodeType(raw.ret_type, intern)
    : { kind: 'prim' as const, prim: 'UNIT' as DamlPrimType, args: [] }

  return {
    name,
    consuming: raw.consuming ?? true,
    argType,
    returnType,
  }
}

function decodeType(raw: RawType, intern: InternTable): DamlType {
  const prim = raw.prim ?? raw.Prim
  if (prim) {
    const primType = PRIM_TYPE_MAP[prim.prim ?? 0] ?? 'ANY'
    const args = (prim.args ?? []).map((a) => decodeType(a, intern))
    return { kind: 'prim', prim: primType, args }
  }

  const con = raw.con ?? raw.Con
  if (con?.tycon) {
    const moduleName = intern.getDottedName(con.tycon.module_ref?.module_name_interned_dname)
    const typeName = intern.getDottedName(con.tycon.name_interned_dname)
    const args = (con.args ?? []).map((a) => decodeType(a, intern))
    return { kind: 'con', module: moduleName, name: typeName, args }
  }

  const varType = raw.var ?? raw.Var
  if (varType) {
    const name = varType.var_interned_str !== undefined
      ? intern.getString(varType.var_interned_str)
      : (varType.var ?? '')
    return { kind: 'var', name }
  }

  const nat = raw.nat ?? raw.Nat
  if (nat !== undefined) {
    return { kind: 'nat', value: typeof nat === 'string' ? parseInt(nat, 10) : nat }
  }

  // Fallback
  return { kind: 'prim', prim: 'ANY', args: [] }
}

/**
 * Override the proto file path (for testing).
 */
export function resetProtoCache(): void {
  protoRoot = null
}
