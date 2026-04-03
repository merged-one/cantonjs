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

import protobuf from 'protobufjs'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
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
  const protoSource = await fs.readFile(protoPath, 'utf8')
  protoRoot = protobuf.parse(protoSource, new protobuf.Root(), { keepCase: true }).root
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
    hash: string
    payload: Uint8Array
  }

  // Decode ArchivePayload
  const ArchivePayloadType = root.lookupType('daml_lf_dev.ArchivePayload')
  const payload = ArchivePayloadType.decode(archive.payload) as unknown as {
    minor: string
    daml_lf_2?: RawPackage
  }

  const pkg = payload.daml_lf_2
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
  param_interned_str?: number
  choices?: RawTemplateChoice[]
}

type RawTemplateChoice = {
  name_interned_str?: number
  name?: string
  consuming?: boolean
  arg_binder?: RawVarWithType
  ret_type?: RawType
}

type RawVarWithType = {
  var_interned_str?: number
  type?: RawType
}

type RawType = {
  prim?: { prim?: number; args?: RawType[] }
  con?: { tycon?: RawTypeConName; args?: RawType[] }
  var?: { var_interned_str?: number; var?: string }
  nat?: string | number | protobuf.Long
  interned?: number
  // Older format fields
  Prim?: { prim?: number; args?: RawType[] }
  Con?: { tycon?: RawTypeConName; args?: RawType[] }
  Var?: { var_interned_str?: number; var?: string }
  Nat?: string | number | protobuf.Long
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

  getString(index: number): string {
    return this.strings[index] ?? ''
  }

  getDottedName(index: number | undefined): string {
    if (index === undefined) return ''
    const entry = this.dottedNames[index]
    if (!entry?.segments_interned_str) return ''
    return entry.segments_interned_str.map((i) => this.getString(i)).join('.')
  }
}

function repeated<T>(value: readonly T[] | undefined): readonly T[] {
  /* v8 ignore next -- current protobufjs decode emits arrays for repeated fields; this keeps older decoded shapes safe */
  return value ?? []
}

/* v8 ignore next -- current protobufjs decode uses lowercase field names; legacy aliases are kept for older decoded shapes */
function preferCurrent<T>(current: T | undefined, legacy: T | undefined): T | undefined {
  return current ?? legacy
}

function readInternedName(intern: InternTable, index: number | undefined, legacy?: string): string {
  /* v8 ignore next -- current protobufjs decode emits interned string indexes; legacy raw strings are kept for older decoded shapes */
  return index !== undefined ? intern.getString(index) : (legacy ?? '')
}

function decodePrimType(prim: NonNullable<RawType['prim'] | RawType['Prim']>, intern: InternTable): DamlType {
  /* v8 ignore next -- current protobufjs materializes missing primitive tags as 0 and unknown tags fall back to ANY */
  const primType = PRIM_TYPE_MAP[prim.prim ?? 0] ?? 'ANY'
  return {
    kind: 'prim',
    prim: primType,
    args: repeated(prim.args).map((arg) => decodeType(arg, intern)),
  }
}

function decodeNatOrFallback(nat: string | number | protobuf.Long | undefined): DamlType {
  if (nat !== undefined) {
    return { kind: 'nat', value: decodeNat(nat) }
  }

  return { kind: 'prim', prim: 'ANY', args: [] }
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
    repeated(raw.interned_strings),
    repeated(raw.interned_dotted_names),
  )

  const name = raw.metadata?.name_interned_str !== undefined
    ? intern.getString(raw.metadata.name_interned_str)
    : undefined

  const version = raw.metadata?.version_interned_str !== undefined
    ? intern.getString(raw.metadata.version_interned_str)
    : undefined

  const modules = repeated(raw.modules).map((m) => decodeModule(m, intern))

  return { packageId, name, version, modules }
}

function decodeModule(raw: RawModule, intern: InternTable): DamlModule {
  const name = intern.getDottedName(raw.name_interned_dname)
  const dataTypes = repeated(raw.data_types).map((dt) => decodeDataType(dt, intern))
  const templates = repeated(raw.templates).map((t) => decodeTemplate(t, intern))

  return { name, dataTypes, templates }
}

function decodeDataType(raw: RawDefDataType, intern: InternTable): DamlDataType {
  const name = intern.getDottedName(raw.name_interned_dname)
  const typeParams = repeated(raw.params).map((p) =>
    readInternedName(intern, p.var_interned_str, p.var),
  )

  let definition: DamlDataTypeDef

  const record = preferCurrent(raw.record, raw.DataRecord)
  const variant = preferCurrent(raw.variant, raw.DataVariant)
  const enumDef = preferCurrent(raw.enum, raw.DataEnum)

  if (record) {
    const fields = repeated(preferCurrent(record.fields, record.fields_interned_str)).map((f) =>
      decodeField(f, intern),
    )
    definition = { kind: 'record', fields }
  } else if (variant) {
    const constructors = repeated(preferCurrent(variant.fields, variant.fields_interned_str)).map((f) =>
      decodeField(f, intern),
    )
    definition = { kind: 'variant', constructors }
  } else if (enumDef) {
    const constructors = repeated(enumDef.constructors_interned_str).map((i) =>
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
  const name = readInternedName(intern, raw.field_interned_str, raw.field)
  const type = raw.type ? decodeType(raw.type, intern) : { kind: 'prim' as const, prim: 'ANY' as DamlPrimType, args: [] }

  return { name, type }
}

function decodeTemplate(raw: RawDefTemplate, intern: InternTable): DamlTemplate {
  const name = intern.getDottedName(raw.tycon_interned_dname)
  const choices = repeated(raw.choices).map((c) => decodeChoice(c, intern))

  return { name, choices }
}

function decodeChoice(raw: RawTemplateChoice, intern: InternTable): DamlChoice {
  const name = readInternedName(intern, raw.name_interned_str, raw.name)

  const argType = raw.arg_binder?.type
    ? decodeType(raw.arg_binder.type, intern)
    : { kind: 'prim' as const, prim: 'UNIT' as DamlPrimType, args: [] }

  const returnType = raw.ret_type
    ? decodeType(raw.ret_type, intern)
    : { kind: 'prim' as const, prim: 'UNIT' as DamlPrimType, args: [] }

  return {
    name,
    /* v8 ignore next -- protobufjs materializes absent bools as false, so the default is a compatibility shim */
    consuming: raw.consuming ?? true,
    argType,
    returnType,
  }
}

function decodeType(raw: RawType, intern: InternTable): DamlType {
  const prim = preferCurrent(raw.prim, raw.Prim)
  if (prim) {
    return decodePrimType(prim, intern)
  }

  const con = preferCurrent(raw.con, raw.Con)
  if (con?.tycon) {
    const moduleName = intern.getDottedName(con.tycon.module_ref?.module_name_interned_dname)
    const typeName = intern.getDottedName(con.tycon.name_interned_dname)
    const args = repeated(con.args).map((a) => decodeType(a, intern))
    return { kind: 'con', module: moduleName, name: typeName, args }
  }

  const varType = preferCurrent(raw.var, raw.Var)
  if (varType) {
    const name = readInternedName(intern, varType.var_interned_str, varType.var)
    return { kind: 'var', name }
  }

  const nat = Object.prototype.hasOwnProperty.call(raw, 'nat') ? raw.nat : undefined
  const legacyNat = raw.Nat

  return decodeNatOrFallback(preferCurrent(nat, legacyNat))
}

function decodeNat(nat: string | number | protobuf.Long): number {
  return Number(String(nat))
}

/**
 * Override the proto file path (for testing).
 */
export function resetProtoCache(): void {
  protoRoot = null
}
