import { describe, expect, it, vi } from 'vitest'
import {
  formatUsage,
  parseArgs,
  runCli,
} from './runCli.js'

function createIo() {
  return {
    stdout: vi.fn<(line: string) => void>(),
    stderr: vi.fn<(line: string) => void>(),
  }
}

describe('parseArgs', () => {
  it('returns help and version control actions directly', () => {
    expect(parseArgs(['node', 'cli', '--help'])).toEqual({ kind: 'help' })
    expect(parseArgs(['node', 'cli', '--version'])).toEqual({ kind: 'version' })
    expect(parseArgs(['node', 'cli', '-h'])).toEqual({ kind: 'help' })
    expect(parseArgs(['node', 'cli', '-v'])).toEqual({ kind: 'version' })
  })

  it('applies the default output directory when omitted', () => {
    expect(parseArgs(['node', 'cli', '--dar', './model.dar'])).toEqual({
      kind: 'run',
      dar: './model.dar',
      output: './generated',
    })
  })

  it('supports short flags and explicit output overrides', () => {
    expect(parseArgs(['node', 'cli', '-d', './model.dar', '-o', './out'])).toEqual({
      kind: 'run',
      dar: './model.dar',
      output: './out',
    })
  })
})

describe('runCli', () => {
  it('prints usage for help requests', async () => {
    const io = createIo()

    await expect(runCli(['node', 'cli', '--help'], io)).resolves.toBe(0)
    expect(io.stdout).toHaveBeenCalledWith(formatUsage())
    expect(io.stderr).not.toHaveBeenCalled()
  })

  it('prints the version banner', async () => {
    const io = createIo()

    await expect(runCli(['node', 'cli', '--version'], io)).resolves.toBe(0)
    expect(io.stdout).toHaveBeenCalledWith('cantonjs-codegen 0.0.1')
  })

  it('reports missing DAR paths as a usage error', async () => {
    const io = createIo()

    await expect(runCli(['node', 'cli'], io)).resolves.toBe(1)
    expect(io.stderr).toHaveBeenCalledWith('Error: --dar <path> is required')
    expect(io.stdout).toHaveBeenCalledWith(formatUsage())
  })

  it('runs code generation and prints a summary for successful executions', async () => {
    const io = createIo()
    const generateFromDar = vi.fn().mockResolvedValue({
      packageName: 'demo-package',
      packageId: 'pkg-123',
      modules: [{ fileName: 'Main.ts', content: 'export {}' }],
      filesWritten: ['./generated/demo-package/Main.ts'],
    })

    await expect(
      runCli(
        ['node', 'cli', '--dar', './model.dar'],
        io,
        { generateFromDar },
      ),
    ).resolves.toBe(0)

    expect(generateFromDar).toHaveBeenCalledWith({
      dar: './model.dar',
      output: './generated',
    })
    expect(io.stdout.mock.calls.map((call) => call[0])).toEqual([
      'Generating TypeScript from ./model.dar...',
      'Package: demo-package (pkg-123)',
      'Modules: 1',
      'Files written:',
      '  ./generated/demo-package/Main.ts',
    ])
  })

  it('returns a non-zero exit code when generation fails', async () => {
    const io = createIo()

    await expect(
      runCli(
        ['node', 'cli', '--dar', './broken.dar', '--output', './out'],
        io,
        {
          generateFromDar: async () => {
            throw new Error('invalid archive')
          },
        },
      ),
    ).resolves.toBe(1)

    expect(io.stderr).toHaveBeenCalledWith('Error: invalid archive')
  })

  it('stringifies non-Error failures from generation', async () => {
    const io = createIo()

    await expect(
      runCli(
        ['node', 'cli', '--dar', './broken.dar'],
        io,
        {
          generateFromDar: async () => {
            throw 'boom'
          },
        },
      ),
    ).resolves.toBe(1)

    expect(io.stderr).toHaveBeenCalledWith('Error: boom')
  })

  it('uses the default IO bindings when none are provided', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(runCli(['node', 'cli', '--help'])).resolves.toBe(0)
    await expect(runCli(['node', 'cli'])).resolves.toBe(1)

    expect(logSpy).toHaveBeenCalledWith(formatUsage())
    expect(errorSpy).toHaveBeenCalledWith('Error: --dar <path> is required')
  })
})
