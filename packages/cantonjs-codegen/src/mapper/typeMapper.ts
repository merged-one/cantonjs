/**
 * Maps Daml-LF types to TypeScript type strings.
 *
 * Follows the Canton JSON API Daml-LF JSON encoding:
 * - Int64, Numeric → string (precision preservation)
 * - Timestamp, Date → string (ISO format)
 * - Party → string
 * - ContractId → string
 * - Optional → T | null
 * - List → readonly T[]
 * - TextMap → Readonly<Record<string, T>>
 * - GenMap → ReadonlyArray<readonly [K, V]>
 */

import type { DamlType, DamlPrimType } from '../dar/types.js'

/** Map a Daml-LF primitive type to its TypeScript equivalent. */
const PRIM_TYPE_TS: Record<DamlPrimType, string> = {
  UNIT: 'Record<string, never>',
  BOOL: 'boolean',
  INT64: 'string',
  NUMERIC: 'string',
  TEXT: 'string',
  TIMESTAMP: 'string',
  PARTY: 'string',
  DATE: 'string',
  CONTRACT_ID: 'string',
  OPTIONAL: '', // handled specially
  LIST: '',     // handled specially
  TEXTMAP: '',  // handled specially
  GENMAP: '',   // handled specially
  ANY: 'unknown',
  UPDATE: 'unknown',
  SCENARIO: 'unknown',
  ARROW: 'unknown',
}

/**
 * Convert a Daml-LF type to a TypeScript type string.
 *
 * @param type - The Daml-LF type to convert
 * @param qualifyModule - Optional function to resolve module-qualified type names
 */
export function mapType(
  type: DamlType,
  qualifyModule?: (module: string, name: string) => string,
): string {
  switch (type.kind) {
    case 'prim':
      return mapPrimType(type.prim, type.args, qualifyModule)

    case 'con': {
      const baseName = qualifyModule
        ? qualifyModule(type.module, type.name)
        : type.name
      if (type.args.length === 0) return baseName
      const typeArgs = type.args.map((a) => mapType(a, qualifyModule)).join(', ')
      return `${baseName}<${typeArgs}>`
    }

    case 'var':
      return type.name

    case 'nat':
      return 'number'
  }
}

function mapPrimType(
  prim: DamlPrimType,
  args: readonly DamlType[],
  qualifyModule?: (module: string, name: string) => string,
): string {
  switch (prim) {
    case 'OPTIONAL': {
      const inner = args[0] ? mapType(args[0], qualifyModule) : 'unknown'
      return `${inner} | null`
    }

    case 'LIST': {
      const inner = args[0] ? mapType(args[0], qualifyModule) : 'unknown'
      return `readonly ${wrapIfComplex(inner)}[]`
    }

    case 'TEXTMAP': {
      const inner = args[0] ? mapType(args[0], qualifyModule) : 'unknown'
      return `Readonly<Record<string, ${inner}>>`
    }

    case 'GENMAP': {
      const keyType = args[0] ? mapType(args[0], qualifyModule) : 'unknown'
      const valType = args[1] ? mapType(args[1], qualifyModule) : 'unknown'
      return `ReadonlyArray<readonly [${keyType}, ${valType}]>`
    }

    case 'CONTRACT_ID': {
      const inner = args[0] ? mapType(args[0], qualifyModule) : 'unknown'
      return `string /* ContractId<${inner}> */`
    }

    default: {
      const ts = PRIM_TYPE_TS[prim]
      return ts || 'unknown'
    }
  }
}

/** Wrap type string in parens if it contains | (union type) for array usage. */
function wrapIfComplex(typeStr: string): string {
  if (typeStr.includes('|')) return `(${typeStr})`
  return typeStr
}
