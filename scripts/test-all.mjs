import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const COMMAND_SETS = {
  packages: [
    ['npm', ['run', 'build']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-interfaces', 'run', 'typecheck']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-interfaces', 'test']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-interfaces', 'run', 'build']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-scan', 'run', 'typecheck']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-scan', 'test']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-scan', 'run', 'build']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-validator', 'run', 'typecheck']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-validator', 'test']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-validator', 'run', 'build']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-token-standard', 'run', 'typecheck']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-token-standard', 'test']],
    ['npm', ['--prefix', 'packages/cantonjs-splice-token-standard', 'run', 'build']],
    ['npm', ['--prefix', 'packages/cantonjs-wallet-adapters', 'run', 'typecheck']],
    ['npm', ['--prefix', 'packages/cantonjs-wallet-adapters', 'test']],
    ['npm', ['--prefix', 'packages/cantonjs-wallet-adapters', 'run', 'build']],
  ],
  live: [
    ['node', ['scripts/splice-live-smoke.mjs']],
  ],
}

async function run(command, args) {
  process.stdout.write(`\n$ ${command} ${args.join(' ')}\n`)

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${String(code)}`))
    })
  })
}

async function main() {
  const mode = process.argv[2]

  if (mode !== 'packages' && mode !== 'live') {
    throw new Error('Usage: node scripts/test-all.mjs <packages|live>')
  }

  for (const [command, args] of COMMAND_SETS[mode]) {
    await run(command, args)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
