import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import protobuf from 'protobufjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const protoPath = path.resolve(__dirname, '../proto/daml_lf.proto')

let protoRootPromise: Promise<protobuf.Root> | undefined

async function getProtoRoot(): Promise<protobuf.Root> {
  protoRootPromise ??= fs.readFile(protoPath, 'utf8').then((source) =>
    protobuf.parse(source, new protobuf.Root(), { keepCase: true }).root,
  )
  return await protoRootPromise
}

type DemoArchiveOptions = {
  readonly packageId?: string
  readonly packageName?: string
  readonly packageVersion?: string
  readonly includeMetadata?: boolean
  readonly emptyModule?: boolean
}

export async function buildCustomDalf(
  rawPackage: Record<string, unknown>,
  options: {
    readonly packageId?: string
    readonly minor?: string
  } = {},
): Promise<Uint8Array> {
  const root = await getProtoRoot()
  const ArchiveType = root.lookupType('daml_lf_dev.Archive')
  const ArchivePayloadType = root.lookupType('daml_lf_dev.ArchivePayload')

  const payload = ArchivePayloadType.encode(
    ArchivePayloadType.create({
      minor: options.minor ?? 'dev',
      daml_lf_2: rawPackage,
    }),
  ).finish()

  return ArchiveType.encode(
    ArchiveType.create({
      hash: options.packageId ?? 'custom-package-id',
      payload,
    }),
  ).finish()
}

export async function buildArchiveWithoutPackage(): Promise<Uint8Array> {
  const root = await getProtoRoot()
  const ArchiveType = root.lookupType('daml_lf_dev.Archive')
  const ArchivePayloadType = root.lookupType('daml_lf_dev.ArchivePayload')

  const payload = ArchivePayloadType.encode(
    ArchivePayloadType.create({
      minor: 'dev',
    }),
  ).finish()

  return ArchiveType.encode(
    ArchiveType.create({
      hash: 'missing-package',
      payload,
    }),
  ).finish()
}

export async function buildDemoDalf(
  options: DemoArchiveOptions = {},
): Promise<Uint8Array> {
  const root = await getProtoRoot()
  const ArchiveType = root.lookupType('daml_lf_dev.Archive')
  const ArchivePayloadType = root.lookupType('daml_lf_dev.ArchivePayload')

  const strings: string[] = []
  const dottedNames: Array<{ segments_interned_str: number[] }> = []

  const internString = (value: string): number => {
    const existingIndex = strings.indexOf(value)
    if (existingIndex !== -1) {
      return existingIndex
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

  const packageName = options.packageName ?? 'demo-package'
  const packageVersion = options.packageVersion ?? '1.0.0'
  const moduleName = 'Main'
  const assetTypeName = 'Asset'
  const transferArgsTypeName = 'TransferArgs'
  const wrapperTypeName = 'Wrapper'
  const colorTypeName = 'Color'
  const choiceName = 'Transfer'
  const ownerField = 'owner'
  const descriptionField = 'description'
  const amountField = 'amount'
  const labelField = 'label'
  const argField = 'arg'
  const valueField = 'value'
  const redConstructor = 'Red'
  const blueConstructor = 'Blue'
  const typeParameter = 'a'

  const rawPackage = {
    modules: [
      {
        name_interned_dname: internDottedName(moduleName),
        data_types: options.emptyModule ? [] : [
          {
            name_interned_dname: internDottedName(`${moduleName}.${assetTypeName}`),
            params: [],
            serializable: true,
            record: {
              fields: [
                {
                  field_interned_str: internString(ownerField),
                  type: { prim: { prim: 6, args: [] } },
                },
                {
                  field_interned_str: internString(descriptionField),
                  type: { prim: { prim: 4, args: [] } },
                },
              ],
            },
          },
          {
            name_interned_dname: internDottedName(`${moduleName}.${transferArgsTypeName}`),
            params: [],
            serializable: true,
            record: {
              fields: [
                {
                  field_interned_str: internString(amountField),
                  type: { prim: { prim: 15, args: [] } },
                },
              ],
            },
          },
          {
            name_interned_dname: internDottedName(`${moduleName}.${wrapperTypeName}`),
            params: [{ var_interned_str: internString(typeParameter) }],
            serializable: true,
            variant: {
              fields: [
                {
                  field_interned_str: internString(valueField),
                  type: { var: { var_interned_str: internString(typeParameter) } },
                },
                {
                  field_interned_str: internString(labelField),
                  type: { prim: { prim: 0, args: [] } },
                },
              ],
            },
          },
          {
            name_interned_dname: internDottedName(`${moduleName}.${colorTypeName}`),
            params: [],
            serializable: true,
            enum: {
              constructors_interned_str: [
                internString(redConstructor),
                internString(blueConstructor),
              ],
            },
          },
        ],
        templates: options.emptyModule ? [] : [
          {
            tycon_interned_dname: internDottedName(`${moduleName}.${assetTypeName}`),
            param_interned_str: internString(ownerField),
            choices: [
              {
                name_interned_str: internString(choiceName),
                consuming: true,
                arg_binder: {
                  var_interned_str: internString(argField),
                  type: {
                    con: {
                      tycon: {
                        module_ref: {
                          module_name_interned_dname: internDottedName(moduleName),
                        },
                        name_interned_dname: internDottedName(
                          `${moduleName}.${transferArgsTypeName}`,
                        ),
                      },
                      args: [],
                    },
                  },
                },
                ret_type: { prim: { prim: 0, args: [] } },
              },
            ],
          },
        ],
      },
    ],
    interned_strings: strings,
    interned_dotted_names: dottedNames,
    metadata: options.includeMetadata === false
      ? undefined
      : {
          name_interned_str: internString(packageName),
          version_interned_str: internString(packageVersion),
        },
  }

  const payload = ArchivePayloadType.encode(
    ArchivePayloadType.create({
      minor: 'dev',
      daml_lf_2: rawPackage,
    }),
  ).finish()

  return ArchiveType.encode(
    ArchiveType.create({
      hash: options.packageId ?? 'demo-package-id',
      payload,
    }),
  ).finish()
}

export async function buildDemoDar(
  options: DemoArchiveOptions = {},
): Promise<{
  readonly darBytes: Uint8Array
  readonly dalfBytes: Uint8Array
  readonly packageId: string
  readonly mainDalf: string
}> {
  const packageId = options.packageId ?? 'demo-package-id'
  const zip = new JSZip()
  const mainDalf = `demo/${packageId}.dalf`
  const dalfBytes = await buildDemoDalf({
    ...options,
    packageId,
  })

  zip.file(
    'META-INF/MANIFEST.MF',
    [
      'Manifest-Version: 1.0',
      `Main-Dalf: ${mainDalf}`,
      '',
    ].join('\n'),
  )
  zip.file(mainDalf, dalfBytes)

  return {
    darBytes: await zip.generateAsync({ type: 'uint8array' }),
    dalfBytes,
    packageId,
    mainDalf,
  }
}
