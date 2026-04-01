#!/usr/bin/env node

/**
 * CLI entry point for cantonjs-codegen.
 *
 * Usage:
 *   cantonjs-codegen --dar <path> --output <dir>
 */

import { generateFromDar } from '../generate.js'

function parseArgs(argv: string[]): { dar: string; output: string } {
  let dar = ''
  let output = ''

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if ((arg === '--dar' || arg === '-d') && argv[i + 1]) {
      dar = argv[++i]!
    } else if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      output = argv[++i]!
    } else if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    } else if (arg === '--version' || arg === '-v') {
      console.log('cantonjs-codegen 0.0.1')
      process.exit(0)
    }
  }

  if (!dar) {
    console.error('Error: --dar <path> is required')
    printUsage()
    process.exit(1)
  }

  if (!output) {
    output = './generated'
  }

  return { dar, output }
}

function printUsage(): void {
  console.log(`
Usage: cantonjs-codegen [options]

Options:
  -d, --dar <path>      Path to DAR file (required)
  -o, --output <dir>    Output directory (default: ./generated)
  -h, --help            Show this help message
  -v, --version         Show version

Examples:
  cantonjs-codegen --dar ./model.dar --output ./src/generated
  cantonjs-codegen -d my-app.dar -o ./codegen
`.trim())
}

async function main(): Promise<void> {
  const { dar, output } = parseArgs(process.argv)

  console.log(`Generating TypeScript from ${dar}...`)

  const result = await generateFromDar({ dar, output })

  console.log(`Package: ${result.packageName} (${result.packageId})`)
  console.log(`Modules: ${result.modules.length}`)
  console.log(`Files written:`)
  for (const file of result.filesWritten) {
    console.log(`  ${file}`)
  }
}

main().catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
