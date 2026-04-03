import { generateFromDar } from '../generate.js'

export type CliParseResult =
  | { readonly kind: 'run'; readonly dar: string; readonly output: string }
  | { readonly kind: 'help' }
  | { readonly kind: 'version' }
  | { readonly kind: 'error'; readonly message: string }

export type CliIo = {
  readonly stdout: (line: string) => void
  readonly stderr: (line: string) => void
}

export type CliDependencies = {
  readonly generateFromDar: typeof generateFromDar
}

export function formatUsage(): string {
  return `
Usage: cantonjs-codegen [options]

Options:
  -d, --dar <path>      Path to DAR file (required)
  -o, --output <dir>    Output directory (default: ./generated)
  -h, --help            Show this help message
  -v, --version         Show version

Examples:
  cantonjs-codegen --dar ./model.dar --output ./src/generated
  cantonjs-codegen -d my-app.dar -o ./codegen
`.trim()
}

export function parseArgs(argv: readonly string[]): CliParseResult {
  let dar = ''
  let output = ''

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if ((arg === '--dar' || arg === '-d') && argv[i + 1]) {
      dar = argv[++i]!
    } else if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      output = argv[++i]!
    } else if (arg === '--help' || arg === '-h') {
      return { kind: 'help' }
    } else if (arg === '--version' || arg === '-v') {
      return { kind: 'version' }
    }
  }

  if (!dar) {
    return { kind: 'error', message: 'Error: --dar <path> is required' }
  }

  return {
    kind: 'run',
    dar,
    output: output || './generated',
  }
}

export async function runCli(
  argv: readonly string[] = process.argv,
  io: CliIo = {
    stdout: (line) => {
      console.log(line)
    },
    stderr: (line) => {
      console.error(line)
    },
  },
  dependencies: CliDependencies = { generateFromDar },
): Promise<number> {
  const parsed = parseArgs(argv)

  if (parsed.kind === 'help') {
    io.stdout(formatUsage())
    return 0
  }

  if (parsed.kind === 'version') {
    io.stdout('cantonjs-codegen 0.0.1')
    return 0
  }

  if (parsed.kind === 'error') {
    io.stderr(parsed.message)
    io.stdout(formatUsage())
    return 1
  }

  io.stdout(`Generating TypeScript from ${parsed.dar}...`)

  try {
    const result = await dependencies.generateFromDar({
      dar: parsed.dar,
      output: parsed.output,
    })

    io.stdout(`Package: ${result.packageName} (${result.packageId})`)
    io.stdout(`Modules: ${result.modules.length}`)
    io.stdout('Files written:')
    for (const file of result.filesWritten) {
      io.stdout(`  ${file}`)
    }

    return 0
  } catch (error) {
    io.stderr(`Error: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}
