/**
 * Main codegen orchestration.
 *
 * Ties together DAR parsing, type mapping, and code emission.
 * Can be used programmatically or via the CLI.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseDar } from './dar/parse.js'
import { decodeDalf } from './dar/decode.js'
import { emitModule } from './emitter/emitModule.js'
import type { EmittedModule } from './emitter/emitModule.js'
import type { DalfPackage } from './dar/types.js'

/** Options for code generation. */
export type GenerateOptions = {
  /** Path to the DAR file. */
  readonly dar: string
  /** Output directory for generated TypeScript files. */
  readonly output: string
}

/** Result of code generation. */
export type GenerateResult = {
  readonly packageName: string
  readonly packageId: string
  readonly modules: readonly EmittedModule[]
  readonly filesWritten: readonly string[]
}

/**
 * Generate TypeScript types from a DAR file.
 *
 * @param options - Generation options (dar path, output directory)
 * @returns Information about what was generated
 */
export async function generateFromDar(options: GenerateOptions): Promise<GenerateResult> {
  const { dar: darPath, output: outputDir } = options

  // Read DAR file
  const darBytes = new Uint8Array(fs.readFileSync(darPath))

  // Parse DAR (extract DALFs)
  const { dalfs, mainDalf } = await parseDar(darBytes)

  // Decode all DALFs
  const packages: DalfPackage[] = []
  for (const dalf of dalfs) {
    // Use filename (without .dalf extension) as package ID
    const packageId = path.basename(dalf.filename, '.dalf')
    const pkg = await decodeDalf(dalf.bytes, packageId)
    packages.push(pkg)
  }

  // Find the main package
  const mainPackageId = path.basename(mainDalf, '.dalf')
  const mainPackage = packages.find((p) => p.packageId === mainPackageId) ?? packages[0]

  /* v8 ignore next -- parseDar guarantees at least one DALF, so decode always yields at least one package */
  if (!mainPackage) {
    throw new Error('No packages found in DAR')
  }

  const packageName = mainPackage.name ?? mainPackage.packageId

  // Emit TypeScript for each module
  const emitted: EmittedModule[] = []
  for (const module of mainPackage.modules) {
    const result = emitModule(module, packageName)
    // Skip modules with no meaningful content
    if (result.content.split('\n').length > 4) {
      emitted.push(result)
    }
  }

  // Write files
  const filesWritten: string[] = []

  for (const mod of emitted) {
    const filePath = path.join(outputDir, packageName, mod.fileName)
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, mod.content, 'utf-8')
    filesWritten.push(filePath)
  }

  // Write barrel index
  if (emitted.length > 0) {
    const indexPath = path.join(outputDir, packageName, 'index.ts')
    const indexContent = emitted
      .map((m) => {
        const importPath = './' + m.fileName.replace(/\.ts$/, '.js')
        return `export * from '${importPath}'`
      })
      .join('\n') + '\n'

    fs.mkdirSync(path.dirname(indexPath), { recursive: true })
    fs.writeFileSync(indexPath, indexContent, 'utf-8')
    filesWritten.push(indexPath)
  }

  return {
    packageName,
    packageId: mainPackage.packageId,
    modules: emitted,
    filesWritten,
  }
}
