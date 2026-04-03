import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function run(command, args) {
  try {
    await execFileAsync(command, args, {
      cwd: repoRoot,
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    const stderr = typeof error === 'object' && error !== null && 'stderr' in error
      ? String(error.stderr ?? '')
      : ''
    const stdout = typeof error === 'object' && error !== null && 'stdout' in error
      ? String(error.stdout ?? '')
      : ''
    const details = [stdout, stderr].filter(Boolean).join('\n').trim()
    throw new Error(details.length > 0 ? details : `${command} ${args.join(' ')} failed`)
  }
}

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath)
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function resolveVendoredTag() {
  const manifest = await readJson(path.join('vendor', 'splice', 'manifest.json'))
  const tag = manifest?.upstream?.resolvedTag

  if (typeof tag !== 'string' || tag.length === 0) {
    throw new Error('Unable to resolve a vendored Splice tag from vendor/splice/manifest.json')
  }

  return tag
}

async function compareFile(label, actualPath, expectedPath) {
  const [actualContents, expectedContents] = await Promise.all([
    readFile(actualPath, 'utf8'),
    readFile(expectedPath, 'utf8'),
  ])

  if (actualContents !== expectedContents) {
    throw new Error(`${label} is stale: ${path.relative(repoRoot, expectedPath)}`)
  }
}

async function generateOpenApi(packagePrefix, specPath, outputPath) {
  await run('npm', [
    'exec',
    '--prefix',
    packagePrefix,
    '--',
    'openapi-typescript',
    specPath,
    '-o',
    outputPath,
  ])
}

async function withLinkedScanSpec(tag, callback) {
  const scanOpenApiDir = path.join(repoRoot, 'scan', 'src', 'main', 'openapi')
  const linkedScanPath = path.join(scanOpenApiDir, 'scan.yaml')
  const vendoredScanPath = path.join(repoRoot, 'vendor', 'splice', tag, 'openapi', 'scan.yaml')

  await mkdir(scanOpenApiDir, { recursive: true })
  await rm(linkedScanPath, { force: true })
  await symlink(vendoredScanPath, linkedScanPath)

  try {
    await callback()
  } finally {
    await rm(linkedScanPath, { force: true })
  }
}

async function main() {
  const tag = await resolveVendoredTag()
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'cantonjs-generated-'))

  try {
    const vendoredOpenApiRoot = path.join(repoRoot, 'vendor', 'splice', tag, 'openapi')

    const scanOutput = path.join(tempRoot, 'scan.types.ts')
    await generateOpenApi(
      'packages/cantonjs-splice-scan',
      path.join(vendoredOpenApiRoot, 'scan.yaml'),
      scanOutput,
    )
    await compareFile(
      'Scan generated types',
      scanOutput,
      path.join(repoRoot, 'packages', 'cantonjs-splice-scan', 'src', 'generated', 'scan.types.ts'),
    )

    const ansOutput = path.join(tempRoot, 'ans.types.ts')
    await generateOpenApi(
      'packages/cantonjs-splice-validator',
      path.join(vendoredOpenApiRoot, 'ans-external.yaml'),
      ansOutput,
    )
    await compareFile(
      'Validator ANS generated types',
      ansOutput,
      path.join(repoRoot, 'packages', 'cantonjs-splice-validator', 'src', 'generated', 'ans.types.ts'),
    )

    await withLinkedScanSpec(tag, async () => {
      const scanProxyOutput = path.join(tempRoot, 'scanProxy.types.ts')
      await generateOpenApi(
        'packages/cantonjs-splice-validator',
        path.join(vendoredOpenApiRoot, 'scan-proxy.yaml'),
        scanProxyOutput,
      )
      await compareFile(
        'Validator Scan Proxy generated types',
        scanProxyOutput,
        path.join(repoRoot, 'packages', 'cantonjs-splice-validator', 'src', 'generated', 'scanProxy.types.ts'),
      )
    })

    const walletOutput = path.join(tempRoot, 'walletExternal.types.ts')
    await generateOpenApi(
      'packages/cantonjs-splice-validator',
      path.join(vendoredOpenApiRoot, 'wallet-external.yaml'),
      walletOutput,
    )
    await compareFile(
      'Validator wallet generated types',
      walletOutput,
      path.join(repoRoot, 'packages', 'cantonjs-splice-validator', 'src', 'generated', 'walletExternal.types.ts'),
    )

    await run('node', [
      'scripts/import-splice-dars.mjs',
      '--source',
      'vendor',
      '--verify',
      '--tag',
      tag,
    ])

    console.log(`Verified generated OpenAPI and DAR outputs for vendored Splice ${tag}`)
  } finally {
    await rm(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
