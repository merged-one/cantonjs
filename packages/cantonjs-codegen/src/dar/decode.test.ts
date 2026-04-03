import { afterEach, describe, expect, it } from 'vitest'
import {
  buildArchiveWithoutPackage,
  buildCustomDalf,
  buildDemoDalf,
} from '../../test/archiveFixtures.js'
import {
  decodeDalf,
  resetProtoCache,
} from './decode.js'

afterEach(() => {
  resetProtoCache()
})

describe('decodeDalf', () => {
  it('reuses the cached protobuf root across repeated decodes', async () => {
    const first = await buildDemoDalf({ packageId: 'pkg-cache-a' })
    const second = await buildDemoDalf({ packageId: 'pkg-cache-b' })

    await expect(decodeDalf(first, 'pkg-cache-a')).resolves.toMatchObject({
      packageId: 'pkg-cache-a',
    })
    await expect(decodeDalf(second, 'pkg-cache-b')).resolves.toMatchObject({
      packageId: 'pkg-cache-b',
    })
  })

  it('decodes interned package metadata, modules, data types, and templates', async () => {
    const dalfBytes = await buildDemoDalf({
      packageId: 'pkg-123',
      packageName: 'demo-package',
      packageVersion: '2.0.0',
    })

    const pkg = await decodeDalf(dalfBytes, 'pkg-123')

    expect(pkg).toMatchObject({
      packageId: 'pkg-123',
      name: 'demo-package',
      version: '2.0.0',
    })

    expect(pkg.modules[0]).toMatchObject({
      name: 'Main',
      dataTypes: [
        {
          name: 'Main.Asset',
          definition: {
            kind: 'record',
          },
        },
        {
          name: 'Main.TransferArgs',
          definition: {
            kind: 'record',
          },
        },
        {
          name: 'Main.Wrapper',
          typeParams: ['a'],
          definition: {
            kind: 'variant',
          },
        },
        {
          name: 'Main.Color',
          definition: {
            kind: 'enum',
            constructors: ['Red', 'Blue'],
          },
        },
      ],
      templates: [
        {
          name: 'Main.Asset',
          choices: [
            {
              name: 'Transfer',
              consuming: true,
            },
          ],
        },
      ],
    })

    expect(pkg.modules[0]?.templates[0]?.choices[0]?.argType).toEqual({
      kind: 'con',
      module: 'Main',
      name: 'Main.TransferArgs',
      args: [],
    })
  })

  it('throws when the archive payload does not contain a package', async () => {
    const dalfBytes = await buildArchiveWithoutPackage()

    await expect(decodeDalf(dalfBytes, 'pkg-empty')).rejects.toThrow(
      'Failed to decode package from DALF: no Package field found',
    )
  })

  it('returns an empty package when the archive omits metadata and modules', async () => {
    const dalfBytes = await buildCustomDalf({})

    await expect(decodeDalf(dalfBytes, 'pkg-minimal')).resolves.toEqual({
      packageId: 'pkg-minimal',
      name: undefined,
      version: undefined,
      modules: [],
    })
  })

  it('supports decoder fallbacks for missing metadata, unknown types, and empty data types', async () => {
    const strings: string[] = []
    const dottedNames: Array<{ segments_interned_str: number[] }> = []
    const internString = (value: string): number => {
      const existing = strings.indexOf(value)
      if (existing !== -1) {
        return existing
      }

      strings.push(value)
      return strings.length - 1
    }
    const internDottedName = (value: string): number => {
      dottedNames.push({
        segments_interned_str: value.split('.').map((segment) => internString(segment)),
      })
      return dottedNames.length - 1
    }

    const dalfBytes = await buildCustomDalf(
      {
        modules: [
          {
            name_interned_dname: internDottedName('Legacy'),
            data_types: [
              {
                name_interned_dname: internDottedName('Legacy.LegacyRecord'),
                params: [{ var_interned_str: internString('a') }],
                record: {
                  fields: [
                    {
                      field_interned_str: internString('payload'),
                      type: {
                        prim: {
                          prim: 7,
                          args: [{ var: { var_interned_str: internString('a') } }],
                        },
                      },
                    },
                    {
                      field_interned_str: internString('linked'),
                      type: {
                        con: {
                          tycon: {
                            module_ref: {
                              module_name_interned_dname: internDottedName('Legacy'),
                            },
                            name_interned_dname: internDottedName('Legacy.LegacyVariant'),
                          },
                          args: [],
                        },
                      },
                    },
                    {
                      field_interned_str: internString('mystery'),
                    },
                  ],
                },
              },
              {
                name_interned_dname: internDottedName('Legacy.LegacyVariant'),
                variant: {
                  fields: [
                    {
                      field_interned_str: internString('count'),
                      type: { nat: '7' },
                    },
                    {
                      field_interned_str: internString('unknownPrimitive'),
                      type: { prim: { prim: 999, args: [] } },
                    },
                  ],
                },
              },
              {
                name_interned_dname: internDottedName('Legacy.Empty'),
              },
            ],
            templates: [
              {
                tycon_interned_dname: internDottedName('Legacy.LegacyRecord'),
                choices: [
                  {
                    name_interned_str: internString('Archive'),
                  },
                ],
              },
            ],
          },
        ],
        interned_strings: strings,
        interned_dotted_names: dottedNames,
      },
      { packageId: 'pkg-legacy' },
    )

    const pkg = await decodeDalf(dalfBytes, 'pkg-legacy')

    expect(pkg.name).toBeUndefined()
    expect(pkg.version).toBeUndefined()
    expect(pkg.modules[0]).toMatchObject({
      name: 'Legacy',
      dataTypes: [
        {
          name: 'Legacy.LegacyRecord',
          typeParams: ['a'],
          definition: {
            kind: 'record',
            fields: [
              {
                name: 'payload',
                type: {
                  kind: 'prim',
                  prim: 'LIST',
                  args: [{ kind: 'var', name: 'a' }],
                },
              },
              {
                name: 'linked',
                type: {
                  kind: 'con',
                  module: 'Legacy',
                  name: 'Legacy.LegacyVariant',
                  args: [],
                },
              },
              {
                name: 'mystery',
                type: {
                  kind: 'prim',
                  prim: 'ANY',
                  args: [],
                },
              },
            ],
          },
        },
        {
          name: 'Legacy.LegacyVariant',
          definition: {
            kind: 'variant',
            constructors: [
              {
                name: 'count',
                type: {
                  kind: 'nat',
                  value: 7,
                },
              },
              {
                name: 'unknownPrimitive',
                type: {
                  kind: 'prim',
                  prim: 'ANY',
                  args: [],
                },
              },
            ],
          },
        },
        {
          name: 'Legacy.Empty',
          definition: {
            kind: 'record',
            fields: [],
          },
        },
      ],
      templates: [
        {
          name: 'Legacy.LegacyRecord',
          choices: [
            {
              name: 'Archive',
              consuming: false,
              argType: {
                kind: 'prim',
                prim: 'UNIT',
                args: [],
              },
              returnType: {
                kind: 'prim',
                prim: 'UNIT',
                args: [],
              },
            },
          ],
        },
      ],
    })
  })

  it('decodes interned field collections, local type refs, and templates without choices', async () => {
    const strings: string[] = []
    const dottedNames: Array<{ segments_interned_str: number[] }> = []
    const internString = (value: string): number => {
      const existing = strings.indexOf(value)
      if (existing !== -1) {
        return existing
      }

      strings.push(value)
      return strings.length - 1
    }
    const internDottedName = (value: string): number => {
      dottedNames.push({
        segments_interned_str: value.split('.').map((segment) => internString(segment)),
      })
      return dottedNames.length - 1
    }

    const dalfBytes = await buildCustomDalf(
      {
        modules: [
          {
            name_interned_dname: internDottedName('Branchy'),
            data_types: [
              {
                name_interned_dname: internDottedName('Branchy.Payload'),
                params: [{ var_interned_str: internString('x') }],
                record: {
                  fields_interned_str: [
                    {
                      field_interned_str: internString('alias'),
                      type: { var: { var: 'x' } },
                    },
                    {
                      field_interned_str: internString('self'),
                      type: {
                        con: {
                          tycon: {
                            name_interned_dname: internDottedName('Branchy.Payload'),
                          },
                          args: [],
                        },
                      },
                    },
                  ],
                },
              },
              {
                name_interned_dname: internDottedName('Branchy.Options'),
                variant: {
                  fields_interned_str: [
                    {
                      field_interned_str: internString('count'),
                      type: { nat: 9 },
                    },
                  ],
                },
              },
            ],
            templates: [
              {
                tycon_interned_dname: internDottedName('Branchy.Payload'),
              },
            ],
          },
        ],
        interned_strings: strings,
        interned_dotted_names: dottedNames,
      },
      { packageId: 'pkg-branchy' },
    )

    const pkg = await decodeDalf(dalfBytes, 'pkg-branchy')

    expect(pkg.modules[0]?.name).toBe('Branchy')
    expect(pkg.modules[0]?.dataTypes).toHaveLength(2)
    expect(pkg.modules[0]?.templates).toEqual([
      {
        name: 'Branchy.Payload',
        choices: [],
      },
    ])
  })

  it('decodes sparse intern tables, empty collections, and fallback type shapes', async () => {
    const dalfBytes = await buildCustomDalf(
      {
        modules: [
          {
            name_interned_dname: 2,
            data_types: [
              {
                name_interned_dname: 1,
                params: [{ var_interned_str: 99 }],
                record: {
                  fields: [
                    {
                      field_interned_str: 0,
                      type: { var: { var_interned_str: 0 } },
                    },
                    {
                      field_interned_str: 0,
                      type: { interned: 1 },
                    },
                    {
                      field_interned_str: 0,
                      type: { prim: {} },
                    },
                    {
                      field_interned_str: 0,
                      type: {},
                    },
                    {
                      field_interned_str: 0,
                      type: {
                        con: {
                          tycon: {
                            name_interned_dname: 0,
                          },
                        },
                      },
                    },
                  ],
                },
              },
              {
                name_interned_dname: 0,
                variant: {},
              },
              {
                name_interned_dname: 0,
                enum: {},
              },
            ],
            templates: [
              {
                tycon_interned_dname: 1,
              },
              {
                tycon_interned_dname: 0,
                choices: [
                  {
                    name_interned_str: 99,
                    arg_binder: {
                      type: {
                        con: {
                          tycon: {
                            module_ref: { module_name_interned_dname: 1 },
                            name_interned_dname: 0,
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            name_interned_dname: 99,
          },
        ],
        interned_strings: ['LegacyRaw'],
        interned_dotted_names: [
          { segments_interned_str: [0] },
          {},
          { segments_interned_str: [99] },
        ],
      },
      { packageId: 'pkg-raw' },
    )

    const pkg = await decodeDalf(dalfBytes, 'pkg-raw')

    expect(pkg.modules[0]).toEqual({
      name: '',
      dataTypes: [
        {
          name: '',
          typeParams: [''],
          definition: {
            kind: 'record',
            fields: [
              {
                name: 'LegacyRaw',
                type: {
                  kind: 'var',
                  name: 'LegacyRaw',
                },
              },
              {
                name: 'LegacyRaw',
                type: {
                  kind: 'prim',
                  prim: 'ANY',
                  args: [],
                },
              },
              {
                name: 'LegacyRaw',
                type: {
                  kind: 'prim',
                  prim: 'UNIT',
                  args: [],
                },
              },
              {
                name: 'LegacyRaw',
                type: {
                  kind: 'prim',
                  prim: 'ANY',
                  args: [],
                },
              },
              {
                name: 'LegacyRaw',
                type: {
                  kind: 'con',
                  module: '',
                  name: 'LegacyRaw',
                  args: [],
                },
              },
            ],
          },
        },
        {
          name: 'LegacyRaw',
          typeParams: [],
          definition: {
            kind: 'variant',
            constructors: [],
          },
        },
        {
          name: 'LegacyRaw',
          typeParams: [],
          definition: {
            kind: 'enum',
            constructors: [],
          },
        },
      ],
      templates: [
        {
          name: '',
          choices: [],
        },
        {
          name: 'LegacyRaw',
          choices: [
            {
              name: '',
              consuming: false,
              argType: {
                kind: 'con',
                module: '',
                name: 'LegacyRaw',
                args: [],
              },
              returnType: {
                kind: 'prim',
                prim: 'UNIT',
                args: [],
              },
            },
          ],
        },
      ],
    })

    expect(pkg.modules[1]).toEqual({
      name: '',
      dataTypes: [],
      templates: [],
    })
  })
})
