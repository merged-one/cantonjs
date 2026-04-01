/**
 * cantonjs-codegen — Generate TypeScript types from Daml DAR files.
 *
 * @packageDocumentation
 */

export { generateFromDar } from './generate.js'
export type { GenerateOptions, GenerateResult } from './generate.js'
export type { EmittedModule } from './emitter/emitModule.js'
export { emitModule } from './emitter/emitModule.js'
export { mapType } from './mapper/typeMapper.js'
export { parseDar } from './dar/parse.js'
export { decodeDalf } from './dar/decode.js'
export type {
  DarContents,
  DalfPackage,
  DamlModule,
  DamlDataType,
  DamlDataTypeDef,
  DamlField,
  DamlType,
  DamlPrimType,
  DamlTemplate,
  DamlChoice,
} from './dar/types.js'
