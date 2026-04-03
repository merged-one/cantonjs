import { describe, it, expect } from 'vitest'
import { mapType } from './typeMapper.js'
import type { DamlType } from '../dar/types.js'

describe('mapType', () => {
  describe('primitive types', () => {
    it('maps Text to string', () => {
      expect(mapType({ kind: 'prim', prim: 'TEXT', args: [] })).toBe('string')
    })

    it('maps Bool to boolean', () => {
      expect(mapType({ kind: 'prim', prim: 'BOOL', args: [] })).toBe('boolean')
    })

    it('maps Int64 to string (precision)', () => {
      expect(mapType({ kind: 'prim', prim: 'INT64', args: [] })).toBe('string')
    })

    it('maps Numeric to string (precision)', () => {
      expect(mapType({ kind: 'prim', prim: 'NUMERIC', args: [] })).toBe('string')
    })

    it('maps Party to string', () => {
      expect(mapType({ kind: 'prim', prim: 'PARTY', args: [] })).toBe('string')
    })

    it('maps Timestamp to string', () => {
      expect(mapType({ kind: 'prim', prim: 'TIMESTAMP', args: [] })).toBe('string')
    })

    it('maps Date to string', () => {
      expect(mapType({ kind: 'prim', prim: 'DATE', args: [] })).toBe('string')
    })

    it('maps Unit to Record<string, never>', () => {
      expect(mapType({ kind: 'prim', prim: 'UNIT', args: [] })).toBe('Record<string, never>')
    })
  })

  describe('container types', () => {
    it('maps Optional<Text> to string | null', () => {
      const type: DamlType = { kind: 'prim', prim: 'OPTIONAL', args: [
        { kind: 'prim', prim: 'TEXT', args: [] },
      ]}
      expect(mapType(type)).toBe('string | null')
    })

    it('maps List<Int64> to readonly string[]', () => {
      const type: DamlType = { kind: 'prim', prim: 'LIST', args: [
        { kind: 'prim', prim: 'INT64', args: [] },
      ]}
      expect(mapType(type)).toBe('readonly string[]')
    })

    it('maps List<Optional<Text>> with wrapped union', () => {
      const type: DamlType = { kind: 'prim', prim: 'LIST', args: [
        { kind: 'prim', prim: 'OPTIONAL', args: [
          { kind: 'prim', prim: 'TEXT', args: [] },
        ]},
      ]}
      expect(mapType(type)).toBe('readonly (string | null)[]')
    })

    it('maps TextMap<Bool> to Readonly<Record<string, boolean>>', () => {
      const type: DamlType = { kind: 'prim', prim: 'TEXTMAP', args: [
        { kind: 'prim', prim: 'BOOL', args: [] },
      ]}
      expect(mapType(type)).toBe('Readonly<Record<string, boolean>>')
    })

    it('maps GenMap<Text, Int64> to ReadonlyArray<readonly [string, string]>', () => {
      const type: DamlType = { kind: 'prim', prim: 'GENMAP', args: [
        { kind: 'prim', prim: 'TEXT', args: [] },
        { kind: 'prim', prim: 'INT64', args: [] },
      ]}
      expect(mapType(type)).toBe('ReadonlyArray<readonly [string, string]>')
    })

    it('maps ContractId<T> to string with comment', () => {
      const type: DamlType = { kind: 'prim', prim: 'CONTRACT_ID', args: [
        { kind: 'con', module: 'Main', name: 'Asset', args: [] },
      ]}
      expect(mapType(type)).toBe('string /* ContractId<Asset> */')
    })

    it('falls back to unknown container element types when args are missing', () => {
      expect(mapType({ kind: 'prim', prim: 'OPTIONAL', args: [] })).toBe('unknown | null')
      expect(mapType({ kind: 'prim', prim: 'LIST', args: [] })).toBe('readonly unknown[]')
      expect(mapType({ kind: 'prim', prim: 'TEXTMAP', args: [] })).toBe(
        'Readonly<Record<string, unknown>>',
      )
      expect(mapType({ kind: 'prim', prim: 'GENMAP', args: [] })).toBe(
        'ReadonlyArray<readonly [unknown, unknown]>',
      )
      expect(mapType({ kind: 'prim', prim: 'CONTRACT_ID', args: [] })).toBe(
        'string /* ContractId<unknown> */',
      )
    })
  })

  describe('type constructors', () => {
    it('maps simple type con reference', () => {
      const type: DamlType = { kind: 'con', module: 'Main', name: 'Asset', args: [] }
      expect(mapType(type)).toBe('Asset')
    })

    it('maps parameterized type con', () => {
      const type: DamlType = { kind: 'con', module: 'Main', name: 'Wrapper', args: [
        { kind: 'prim', prim: 'TEXT', args: [] },
      ]}
      expect(mapType(type)).toBe('Wrapper<string>')
    })

    it('uses qualifyModule for cross-module references', () => {
      const type: DamlType = { kind: 'con', module: 'Other', name: 'Thing', args: [] }
      const qualify = (mod: string, name: string) =>
        mod === 'Other' ? `Other_${name}` : name
      expect(mapType(type, qualify)).toBe('Other_Thing')
    })
  })

  describe('type variables', () => {
    it('maps type var to its name', () => {
      const type: DamlType = { kind: 'var', name: 'a' }
      expect(mapType(type)).toBe('a')
    })
  })

  describe('nat', () => {
    it('maps nat to number', () => {
      const type: DamlType = { kind: 'nat', value: 10 }
      expect(mapType(type)).toBe('number')
    })
  })

  describe('fallback primitive mappings', () => {
    it('maps unsupported runtime primitives to unknown', () => {
      expect(mapType({ kind: 'prim', prim: 'ANY', args: [] })).toBe('unknown')
      expect(mapType({ kind: 'prim', prim: 'ARROW', args: [] })).toBe('unknown')
    })
  })
})
