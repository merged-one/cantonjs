import { createHash } from 'node:crypto'
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const OFFICIAL_RELEASE_REPOSITORY = 'https://github.com/digital-asset/decentralized-canton-sync'
const OFFICIAL_TOKEN_STANDARD_DOCS = 'https://docs.global.canton.network.sync.global/app_dev/token_standard/index.html'

const TARGETS = [
  {
    id: 'token-metadata-v1',
    purpose: 'Stable Token Standard V1 metadata interfaces',
    pattern: /^splice-api-token-metadata-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.MetadataV1'],
  },
  {
    id: 'token-holding-v1',
    purpose: 'Stable Token Standard V1 holding interfaces',
    pattern: /^splice-api-token-holding-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.HoldingV1'],
  },
  {
    id: 'token-transfer-instruction-v1',
    purpose: 'Stable Token Standard V1 transfer instruction interfaces',
    pattern: /^splice-api-token-transfer-instruction-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.TransferInstructionV1'],
  },
  {
    id: 'token-allocation-v1',
    purpose: 'Stable Token Standard V1 allocation interfaces',
    pattern: /^splice-api-token-allocation-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.AllocationV1'],
  },
  {
    id: 'token-allocation-request-v1',
    purpose: 'Stable Token Standard V1 allocation request interfaces',
    pattern: /^splice-api-token-allocation-request-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.AllocationRequestV1'],
  },
  {
    id: 'token-allocation-instruction-v1',
    purpose: 'Stable Token Standard V1 allocation instruction interfaces',
    pattern: /^splice-api-token-allocation-instruction-v1-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.Token.AllocationInstructionV1'],
  },
  {
    id: 'featured-app-v2',
    purpose: 'Stable featured app interfaces',
    pattern: /^splice-api-featured-app-v2-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Api.FeaturedAppRightV2'],
  },
  {
    id: 'featured-app-proxies',
    purpose: 'Official wallet user proxy utility templates',
    pattern: /^splice-util-featured-app-proxies-(\d+\.\d+\.\d+)\.dar$/,
    moduleNames: ['Splice.Util.FeaturedApp.WalletUserProxy'],
  },
]

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const spliceInterfacesRoot = path.join(repoRoot, 'packages', 'cantonjs-splice-interfaces')
const generatedRoot = path.join(spliceInterfacesRoot, 'src', 'generated')
const descriptorsRoot = path.join(spliceInterfacesRoot, 'src', 'descriptors')

function parseArgs(argv) {
  let tag
  let source = 'release'
  let verify = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--tag') {
      tag = argv[index + 1]

      if (!tag) {
        throw new Error('--tag requires a value')
      }

      index += 1
      continue
    }

    if (arg === '--source') {
      source = argv[index + 1]

      if (source !== 'release' && source !== 'vendor') {
        throw new Error(`Unsupported --source value: ${String(source)}`)
      }

      index += 1
      continue
    }

    if (arg === '--verify') {
      verify = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { tag, source, verify }
}

function normalizeTag(tag) {
  const match = tag.match(/^v?(\d+\.\d+\.\d+)$/)

  if (!match) {
    throw new Error(`Unsupported Splice tag format: ${tag}`)
  }

  return match[1]
}

async function resolveTag(tagArg) {
  if (tagArg) {
    return normalizeTag(tagArg)
  }

  const manifestPath = path.join(repoRoot, 'vendor', 'splice', 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const resolvedTag = manifest?.upstream?.resolvedTag

  if (typeof resolvedTag !== 'string') {
    throw new Error('Unable to resolve a default Splice tag from vendor/splice/manifest.json')
  }

  return normalizeTag(resolvedTag)
}

function compareVersions(left, right) {
  return left.localeCompare(right, undefined, { numeric: true })
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function toPosixPath(...segments) {
  return path.posix.join(...segments)
}

function releaseBundleUrl(tag) {
  return `${OFFICIAL_RELEASE_REPOSITORY}/releases/download/v${tag}/${tag}_splice-node.tar.gz`
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: repoRoot,
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  })
}

async function downloadBundle(url, destinationPath) {
  const response = await fetch(url)

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  await mkdir(path.dirname(destinationPath), { recursive: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destinationPath))
}

async function listBundleEntries(bundlePath) {
  const { stdout } = await run('tar', ['-tzf', bundlePath])
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean)
}

function selectBundleArtifacts(entries) {
  return selectArtifactFileNames(entries.map((entry) => path.posix.basename(entry))).map(
    (artifact) => ({
      ...artifact,
      bundleEntry: `splice-node/dars/${artifact.fileName}`,
    }),
  )
}

function selectArtifactFileNames(fileNames) {
  return TARGETS.map((target) => {
    const candidates = fileNames
      .map((fileName) => {
        const match = target.pattern.exec(fileName)
        return match ? { fileName, version: match[1] } : null
      })
      .filter(Boolean)

    if (candidates.length === 0) {
      throw new Error(`Unable to locate ${target.id} in the selected DAR set`)
    }

    candidates.sort((left, right) => compareVersions(left.version, right.version))

    const selected = candidates[candidates.length - 1]

    return {
      ...target,
      fileName: selected.fileName,
      version: selected.version,
    }
  })
}

async function extractBundleArtifacts(bundlePath, targets, extractionRoot) {
  await rm(extractionRoot, { recursive: true, force: true })
  await mkdir(extractionRoot, { recursive: true })

  await run('tar', [
    '-xzf',
    bundlePath,
    '-C',
    extractionRoot,
    ...targets.map((target) => target.bundleEntry),
  ])
}

function parseManifestHeaders(manifestContents) {
  const logicalLines = []
  let currentLine = ''

  for (const rawLine of manifestContents.replace(/\r/g, '').split('\n')) {
    if (rawLine.startsWith(' ')) {
      currentLine += rawLine.slice(1)
      continue
    }

    if (currentLine) {
      logicalLines.push(currentLine)
    }

    currentLine = rawLine
  }

  if (currentLine) {
    logicalLines.push(currentLine)
  }

  const headers = new Map()

  for (const line of logicalLines) {
    const separator = line.indexOf(':')

    if (separator === -1) {
      continue
    }

    headers.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim())
  }

  return headers
}

function parsePackageCoordinates(manifestName) {
  const match = manifestName.match(/^(.*)-(\d+\.\d+\.\d+)$/)

  if (!match) {
    throw new Error(`Unable to parse package name/version from DAR manifest name: ${manifestName}`)
  }

  return {
    packageName: match[1],
    packageVersion: match[2],
  }
}

async function listDarEntries(darPath) {
  const { stdout } = await run('unzip', ['-Z1', darPath])
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean)
}

async function readDarTextEntry(darPath, entryPath) {
  const { stdout } = await run('unzip', ['-p', darPath, entryPath], {
    encoding: 'utf8',
  })
  return stdout
}

function normalizeTypeText(typeText) {
  return typeText.replace(/\s+/g, ' ').trim()
}

function stripInlineComment(line) {
  return line.replace(/\s+--.*$/, '')
}

function isTopLevelCodeLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('--')) {
    return false
  }

  return /^\S/.test(line)
}

function collectIndentedBlock(lines, startIndex) {
  let endIndex = startIndex + 1

  while (endIndex < lines.length && !isTopLevelCodeLine(lines[endIndex])) {
    endIndex += 1
  }

  return {
    blockLines: lines.slice(startIndex, endIndex),
    nextIndex: endIndex,
  }
}

function parseImport(line) {
  const qualifiedAsMatch = line.match(/^import\s+qualified\s+([A-Za-z0-9_.]+)\s+as\s+([A-Za-z0-9_]+)$/)

  if (qualifiedAsMatch) {
    return {
      moduleName: qualifiedAsMatch[1],
      alias: qualifiedAsMatch[2],
      qualified: true,
      symbols: null,
    }
  }

  const postQualifiedMatch = line.match(/^import\s+([A-Za-z0-9_.]+)\s+qualified\s+as\s+([A-Za-z0-9_]+)$/)

  if (postQualifiedMatch) {
    return {
      moduleName: postQualifiedMatch[1],
      alias: postQualifiedMatch[2],
      qualified: true,
      symbols: null,
    }
  }

  const aliasMatch = line.match(/^import\s+([A-Za-z0-9_.]+)\s+as\s+([A-Za-z0-9_]+)$/)

  if (aliasMatch) {
    return {
      moduleName: aliasMatch[1],
      alias: aliasMatch[2],
      qualified: false,
      symbols: null,
    }
  }

  const symbolsMatch = line.match(/^import\s+([A-Za-z0-9_.]+)\s*\(([^)]+)\)$/)

  if (symbolsMatch) {
    return {
      moduleName: symbolsMatch[1],
      alias: null,
      qualified: false,
      symbols: symbolsMatch[2].split(',').map((symbol) => symbol.trim()).filter(Boolean),
    }
  }

  const plainMatch = line.match(/^import\s+([A-Za-z0-9_.]+)$/)

  if (plainMatch) {
    return {
      moduleName: plainMatch[1],
      alias: null,
      qualified: false,
      symbols: null,
    }
  }

  throw new Error(`Unsupported import syntax: ${line}`)
}

function parseFields(lines, startIndex, stopPatterns = []) {
  const fields = []
  let index = startIndex

  while (index < lines.length) {
    const rawLine = lines[index]
    const line = stripInlineComment(rawLine)
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('--')) {
      index += 1
      continue
    }

    if (stopPatterns.some((pattern) => pattern.test(trimmed))) {
      break
    }

    if (isTopLevelCodeLine(rawLine)) {
      break
    }

    const fieldMatch = line.match(/^\s+([A-Za-z0-9_]+)\s*:\s*(.+)$/)

    if (!fieldMatch) {
      break
    }

    fields.push({
      name: fieldMatch[1],
      type: normalizeTypeText(fieldMatch[2]),
    })
    index += 1
  }

  return { fields, nextIndex: index }
}

function parseVariantConstructors(blockLines) {
  const constructors = []
  const contentLines = []
  const firstLine = stripInlineComment(blockLines[0])
  const firstLineMatch = firstLine.match(/^data\s+[A-Za-z0-9_']+(?:\s+[^=]+?)?(?:\s*=\s*(.*))?$/)
  let seededFromIndex = 1

  if (firstLineMatch?.[1]?.trim()) {
    contentLines.push(firstLineMatch[1])
  } else {
    const equalsLineIndex = blockLines.findIndex((line, index) => {
      if (index === 0) {
        return false
      }

      const trimmed = stripInlineComment(line).trim()
      return Boolean(trimmed) && !trimmed.startsWith('--') && trimmed.startsWith('=')
    })

    if (equalsLineIndex !== -1) {
      const equalsLine = stripInlineComment(blockLines[equalsLineIndex]).trim()
      contentLines.push(equalsLine.slice(1).trim())
      seededFromIndex = equalsLineIndex + 1
    }
  }

  contentLines.push(...blockLines.slice(seededFromIndex))

  let index = 0

  while (index < contentLines.length) {
    const rawLine = contentLines[index]
    const line = stripInlineComment(rawLine)
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('deriving')) {
      index += 1
      continue
    }

    const constructorMatch = line.match(/^\s*\|?\s*([A-Z][A-Za-z0-9_']*)(?:\s+(.*))?$/)

    if (!constructorMatch) {
      index += 1
      continue
    }

    const constructor = {
      name: constructorMatch[1],
      type: null,
      fields: [],
    }

    const remainder = normalizeTypeText(constructorMatch[2] ?? '')

    if (remainder && remainder !== 'with' && remainder !== '{}') {
      constructor.type = remainder
    }

    index += 1

    while (index < contentLines.length) {
      const nextRawLine = contentLines[index]
      const nextLine = stripInlineComment(nextRawLine)
      const nextTrimmed = nextLine.trim()

      if (!nextTrimmed || nextTrimmed.startsWith('--')) {
        index += 1
        continue
      }

      if (nextTrimmed.startsWith('deriving')) {
        break
      }

      if (/^\s*\|?\s*[A-Z][A-Za-z0-9_']*(?:\s+.*)?$/.test(nextLine)) {
        break
      }

      if (nextTrimmed === 'with') {
        const parsedFields = parseFields(contentLines, index + 1, [/^deriving$/i, /^\|/, /^[A-Z][A-Za-z0-9_']*/])
        constructor.fields = parsedFields.fields
        index = parsedFields.nextIndex
        continue
      }

      index += 1
    }

    constructors.push(constructor)
  }

  return constructors
}

function parseDataDeclaration(blockLines) {
  const header = stripInlineComment(blockLines[0])
  const headerMatch = header.match(/^data\s+([A-Za-z0-9_']+)(?:\s+([^=]+?))?(?:\s*=\s*(.*))?$/)

  if (!headerMatch) {
    throw new Error(`Unsupported data declaration: ${blockLines[0]}`)
  }

  const name = headerMatch[1]
  const typeParams = headerMatch[2]?.trim()
    ? headerMatch[2].trim().split(/\s+/)
    : []
  let remainder = normalizeTypeText(headerMatch[3] ?? '')

  if (!remainder) {
    const equalsLine = blockLines
      .slice(1)
      .map((line) => stripInlineComment(line).trim())
      .find((line) => line && !line.startsWith('--') && line.startsWith('='))

    if (equalsLine) {
      remainder = normalizeTypeText(equalsLine.slice(1))
    }
  }
  const firstContinuation = blockLines
    .slice(1)
    .map((line) => stripInlineComment(line).trim())
    .find((line) => line && !line.startsWith('--')) ?? null

  if (remainder === `${name} {}`) {
    return {
      kind: 'record',
      name,
      typeParams,
      fields: [],
    }
  }

  if (
    remainder === `${name}` ||
    remainder === `${name} with` ||
    (remainder === '' && firstContinuation === 'with')
  ) {
    const withLineIndex = blockLines.findIndex((line, index) =>
      index === 0
        ? remainder === `${name} with`
        : line.trim() === 'with',
    )

    const parsedFields = parseFields(blockLines, withLineIndex === 0 ? 1 : withLineIndex + 1, [/^deriving/i])

    return {
      kind: 'record',
      name,
      typeParams,
      fields: parsedFields.fields,
    }
  }

  const constructors = parseVariantConstructors(blockLines)
  const isEnum = constructors.every((constructor) => !constructor.type && constructor.fields.length === 0)

  return {
    kind: isEnum ? 'enum' : 'variant',
    name,
    typeParams,
    constructors,
  }
}

function parseTypeAlias(line) {
  const match = stripInlineComment(line).match(/^type\s+([A-Za-z0-9_']+)(?:\s+([^=]+?))?\s*=\s*(.+)$/)

  if (!match) {
    throw new Error(`Unsupported type alias declaration: ${line}`)
  }

  return {
    name: match[1],
    typeParams: match[2]?.trim() ? match[2].trim().split(/\s+/) : [],
    type: normalizeTypeText(match[3]),
  }
}

function parseChoice(lines, startIndex) {
  const header = stripInlineComment(lines[startIndex])
  const choiceMatch = header.match(/^\s*(nonconsuming\s+)?choice\s+([A-Za-z0-9_']+)(?:\s*:\s*(.+))?$/)

  if (!choiceMatch) {
    throw new Error(`Unsupported choice declaration: ${lines[startIndex]}`)
  }

  let returnType = normalizeTypeText(choiceMatch[3] ?? '')
  let index = startIndex + 1

  if (!returnType) {
    while (index < lines.length) {
      const candidate = stripInlineComment(lines[index]).trim()

      if (!candidate || candidate.startsWith('--')) {
        index += 1
        continue
      }

      if (candidate.startsWith(':')) {
        returnType = normalizeTypeText(candidate.slice(1))
        index += 1
      }

      break
    }
  }

  const choice = {
    name: choiceMatch[2],
    consuming: !choiceMatch[1],
    returnType,
    fields: [],
  }

  while (index < lines.length) {
    const rawLine = lines[index]
    const line = stripInlineComment(rawLine)
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('--')) {
      index += 1
      continue
    }

    if (isTopLevelCodeLine(rawLine) || /^\s*(nonconsuming\s+)?choice\s+/.test(line)) {
      break
    }

    if (trimmed === 'with') {
      const parsedFields = parseFields(lines, index + 1, [
        /^(controller|observer|authorizer|do)\b/,
        /^(nonconsuming\s+)?choice\b/,
      ])
      choice.fields = parsedFields.fields
      index = parsedFields.nextIndex
      continue
    }

    index += 1
  }

  return { choice, nextIndex: index }
}

function parseInterface(blockLines) {
  const header = stripInlineComment(blockLines[0])
  const headerMatch = header.match(/^interface\s+([A-Za-z0-9_']+)\s+where(?:\s+viewtype\s+([A-Za-z0-9_.]+))?$/)

  if (!headerMatch) {
    throw new Error(`Unsupported interface declaration: ${blockLines[0]}`)
  }

  const parsed = {
    name: headerMatch[1],
    viewType: headerMatch[2] ?? null,
    choices: [],
  }

  for (let index = 1; index < blockLines.length; index += 1) {
    const line = stripInlineComment(blockLines[index]).trim()

    if (!parsed.viewType) {
      const viewTypeMatch = line.match(/^viewtype\s+([A-Za-z0-9_.]+)$/)

      if (viewTypeMatch) {
        parsed.viewType = viewTypeMatch[1]
        continue
      }
    }

    if (/^(nonconsuming\s+)?choice\s+/.test(line)) {
      const parsedChoice = parseChoice(blockLines, index)
      parsed.choices.push(parsedChoice.choice)
      index = parsedChoice.nextIndex - 1
    }
  }

  return parsed
}

function parseTemplate(blockLines) {
  const header = stripInlineComment(blockLines[0])
  const headerMatch = header.match(/^template\s+([A-Za-z0-9_']+)\s+with$/)

  if (!headerMatch) {
    throw new Error(`Unsupported template declaration: ${blockLines[0]}`)
  }

  const whereIndex = blockLines.findIndex((line) => line.trim() === 'where')

  if (whereIndex === -1) {
    throw new Error(`Template is missing a where clause: ${headerMatch[1]}`)
  }

  const template = {
    name: headerMatch[1],
    fields: parseFields(blockLines, 1, [/^where$/]).fields,
    choices: [],
  }

  for (let index = whereIndex + 1; index < blockLines.length; index += 1) {
    const line = stripInlineComment(blockLines[index]).trim()

    if (/^(nonconsuming\s+)?choice\s+/.test(line)) {
      const parsedChoice = parseChoice(blockLines, index)
      template.choices.push(parsedChoice.choice)
      index = parsedChoice.nextIndex - 1
    }
  }

  return template
}

function parseModuleSource(source) {
  const lines = source.replace(/\r/g, '').split('\n')
  const moduleMatch = lines
    .map((line) => line.match(/^module\s+([A-Za-z0-9_.]+)\s+where$/))
    .find(Boolean)

  if (!moduleMatch) {
    throw new Error('Unable to find module declaration in Daml source')
  }

  const imports = []
  const typeAliases = []
  const dataTypes = []
  const interfaces = []
  const templates = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = stripInlineComment(line).trim()

    if (!trimmed || trimmed.startsWith('--')) {
      continue
    }

    if (trimmed.startsWith('import ')) {
      imports.push(parseImport(trimmed))
      continue
    }

    if (trimmed.startsWith('type ')) {
      typeAliases.push(parseTypeAlias(trimmed))
      continue
    }

    if (trimmed.startsWith('data ')) {
      const block = collectIndentedBlock(lines, index)
      dataTypes.push(parseDataDeclaration(block.blockLines))
      index = block.nextIndex - 1
      continue
    }

    if (trimmed.startsWith('interface ')) {
      const block = collectIndentedBlock(lines, index)
      interfaces.push(parseInterface(block.blockLines))
      index = block.nextIndex - 1
      continue
    }

    if (trimmed.startsWith('template ')) {
      const block = collectIndentedBlock(lines, index)
      templates.push(parseTemplate(block.blockLines))
      index = block.nextIndex - 1
    }
  }

  return {
    moduleName: moduleMatch[1],
    imports,
    typeAliases,
    dataTypes,
    interfaces,
    templates,
  }
}

async function loadDarMetadata(darPath) {
  const manifestContents = await readDarTextEntry(darPath, 'META-INF/MANIFEST.MF')
  const headers = parseManifestHeaders(manifestContents)
  const manifestName = headers.get('Name')
  const mainDalf = headers.get('Main-Dalf')

  if (!manifestName || !mainDalf) {
    throw new Error(`DAR manifest is missing Name or Main-Dalf: ${darPath}`)
  }

  const { packageName, packageVersion } = parsePackageCoordinates(manifestName)
  const packageId = path.posix.basename(mainDalf, '.dalf')
  const entries = await listDarEntries(darPath)
  const sourceEntries = entries.filter((entry) => entry.endsWith('.daml')).sort()
  const modules = []

  for (const sourceEntry of sourceEntries) {
    const source = await readDarTextEntry(darPath, sourceEntry)
    modules.push({
      ...parseModuleSource(source),
      sourceEntry,
    })
  }

  return {
    packageName,
    packageVersion,
    packageId,
    modules,
  }
}

function buildModuleRegistry(moduleDescriptors) {
  const registry = new Map()

  for (const moduleDescriptor of moduleDescriptors) {
    const exports = new Set([
      ...moduleDescriptor.typeAliases.map((typeAlias) => typeAlias.name),
      ...moduleDescriptor.dataTypes.map((dataType) => dataType.name),
      ...moduleDescriptor.interfaces.map((iface) => iface.name),
      ...moduleDescriptor.interfaces.flatMap((iface) => iface.choices.map((choice) => choice.name)),
      ...moduleDescriptor.templates.map((template) => template.name),
      ...moduleDescriptor.templates.flatMap((template) => template.choices.map((choice) => choice.name)),
    ])

    registry.set(moduleDescriptor.moduleName, {
      moduleDescriptor,
      exports,
    })
  }

  return registry
}

function buildAvailableSymbols(moduleDescriptor) {
  return new Set([
    ...moduleDescriptor.typeAliases.map((typeAlias) => typeAlias.name),
    ...moduleDescriptor.dataTypes.map((dataType) => dataType.name),
    ...moduleDescriptor.interfaces.map((iface) => iface.name),
    ...moduleDescriptor.interfaces.flatMap((iface) => iface.choices.map((choice) => choice.name)),
    ...moduleDescriptor.templates.map((template) => template.name),
    ...moduleDescriptor.templates.flatMap((template) => template.choices.map((choice) => choice.name)),
  ])
}

function splitTopLevelTokens(typeText) {
  const tokens = []
  let current = ''
  let parenDepth = 0
  let bracketDepth = 0
  let braceDepth = 0

  for (const char of typeText.trim()) {
    if (char === '(') parenDepth += 1
    if (char === ')') parenDepth -= 1
    if (char === '[') bracketDepth += 1
    if (char === ']') bracketDepth -= 1
    if (char === '{') braceDepth += 1
    if (char === '}') braceDepth -= 1

    if (char === ' ' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function stripOuterParens(typeText) {
  let current = typeText.trim()

  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0
    let balanced = true

    for (let index = 0; index < current.length; index += 1) {
      const char = current[index]

      if (char === '(') depth += 1
      if (char === ')') depth -= 1

      if (depth === 0 && index < current.length - 1) {
        balanced = false
        break
      }
    }

    if (!balanced) {
      break
    }

    current = current.slice(1, -1).trim()
  }

  return current
}

function wrapIfNeeded(typeText) {
  return typeText.includes('|') ? `(${typeText})` : typeText
}

function getImportQualifier(importSpec) {
  return importSpec.alias ?? importSpec.moduleName.split('.').at(-1)
}

function resolveQualifiedType(typeText, moduleDescriptor, registry, usedImports, unresolvedTypes) {
  if (!typeText.includes('.')) {
    return null
  }

  const lastDot = typeText.lastIndexOf('.')
  const qualifier = typeText.slice(0, lastDot)
  const symbolName = typeText.slice(lastDot + 1)

  if (!qualifier || !symbolName) {
    return null
  }

  if (
    qualifier === 'TextMap' ||
    qualifier === 'TextMap.TextMap' ||
    qualifier === 'Map' ||
    qualifier === 'Map.Map' ||
    qualifier === 'M' ||
    qualifier === 'M.Map'
  ) {
    return null
  }

  if (registry.has(qualifier)) {
    const target = registry.get(qualifier)

    if (target.exports.has(symbolName)) {
      usedImports.set(qualifier, appendUnique(usedImports.get(qualifier), symbolName))
      return symbolName
    }
  }

  for (const importSpec of moduleDescriptor.imports) {
    if (getImportQualifier(importSpec) !== qualifier) {
      continue
    }

    const target = registry.get(importSpec.moduleName)

    if (target?.exports.has(symbolName)) {
      usedImports.set(importSpec.moduleName, appendUnique(usedImports.get(importSpec.moduleName), symbolName))
      return symbolName
    }
  }

  unresolvedTypes.add(symbolName)
  return symbolName
}

function appendUnique(values = [], value) {
  return values.includes(value) ? values : [...values, value]
}

function resolveBareType(typeText, context, usedImports, unresolvedTypes) {
  const {
    moduleDescriptor,
    registry,
    availableSymbols,
    localTypeParams,
  } = context

  if (localTypeParams.has(typeText) || availableSymbols.has(typeText)) {
    return typeText
  }

  const matches = []

  for (const importSpec of moduleDescriptor.imports) {
    if (importSpec.qualified) {
      continue
    }

    if (importSpec.moduleName === 'DA.TextMap' || importSpec.moduleName === 'DA.Map' || importSpec.moduleName === 'DA.Time') {
      continue
    }

    if (importSpec.symbols && !importSpec.symbols.includes(typeText)) {
      continue
    }

    const target = registry.get(importSpec.moduleName)

    if (target?.exports.has(typeText)) {
      matches.push(importSpec.moduleName)
    }
  }

  const uniqueMatches = [...new Set(matches)]

  if (uniqueMatches.length === 1) {
    usedImports.set(uniqueMatches[0], appendUnique(usedImports.get(uniqueMatches[0]), typeText))
    return typeText
  }

  unresolvedTypes.add(typeText)
  return typeText
}

function mapAtomicType(typeText, context, usedImports, unresolvedTypes) {
  switch (typeText) {
    case 'Text':
    case 'Time':
    case 'Date':
    case 'RelTime':
    case 'Decimal':
    case 'Int':
    case 'Int64':
    case 'Party':
      return 'string'
    case 'Bool':
      return 'boolean'
    case 'AnyContractId':
      return 'string'
    case '()':
      return 'Record<string, never>'
    default: {
      const qualified = resolveQualifiedType(typeText, context.moduleDescriptor, context.registry, usedImports, unresolvedTypes)

      if (qualified) {
        return qualified
      }

      return resolveBareType(typeText, context, usedImports, unresolvedTypes)
    }
  }
}

function mapDamlTypeToTs(typeText, context, usedImports, unresolvedTypes) {
  const normalized = stripOuterParens(typeText)

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    const inner = normalized.slice(1, -1)
    return `readonly ${wrapIfNeeded(mapDamlTypeToTs(inner, context, usedImports, unresolvedTypes))}[]`
  }

  const tokens = splitTopLevelTokens(normalized)

  if (tokens[0] === 'Optional' && tokens[1]) {
    return `${mapDamlTypeToTs(tokens.slice(1).join(' '), context, usedImports, unresolvedTypes)} | null`
  }

  if (tokens[0] === 'ContractId' && tokens[1]) {
    return `string /* ContractId<${tokens.slice(1).join(' ')}> */`
  }

  if (
    (tokens[0] === 'TextMap' ||
      tokens[0] === 'TextMap.TextMap') &&
    tokens[1]
  ) {
    return `Readonly<Record<string, ${mapDamlTypeToTs(tokens.slice(1).join(' '), context, usedImports, unresolvedTypes)}>>`
  }

  if (
    (tokens[0] === 'Map.Map' ||
      tokens[0] === 'M.Map') &&
    tokens[2]
  ) {
    return `ReadonlyArray<readonly [${mapDamlTypeToTs(tokens[1], context, usedImports, unresolvedTypes)}, ${mapDamlTypeToTs(tokens.slice(2).join(' '), context, usedImports, unresolvedTypes)}]>`
  }

  if (tokens[0] === 'Update' && tokens[1]) {
    return mapDamlTypeToTs(tokens.slice(1).join(' '), context, usedImports, unresolvedTypes)
  }

  if (tokens.length > 1) {
    const base = mapAtomicType(tokens[0], context, usedImports, unresolvedTypes)
    const args = tokens.slice(1)
      .map((token) => mapDamlTypeToTs(token, context, usedImports, unresolvedTypes))
      .join(', ')
    return `${base}<${args}>`
  }

  return mapAtomicType(normalized, context, usedImports, unresolvedTypes)
}

function renderRecordType(name, typeParams, fields, context, usedImports, unresolvedTypes) {
  const header = typeParams.length > 0 ? `${name}<${typeParams.join(', ')}>` : name

  if (fields.length === 0) {
    return `export type ${header} = Record<string, never>\n`
  }

  const lines = [`export type ${header} = {`]

  for (const field of fields) {
    lines.push(`  readonly ${field.name}: ${mapDamlTypeToTs(field.type, context, usedImports, unresolvedTypes)}`)
  }

  lines.push('}')
  return `${lines.join('\n')}\n`
}

function renderVariantType(name, typeParams, constructors, context, usedImports, unresolvedTypes) {
  const header = typeParams.length > 0 ? `${name}<${typeParams.join(', ')}>` : name
  const members = constructors.map((constructor) => {
    if (constructor.fields.length > 0) {
      return [
        `{`,
        `  readonly tag: '${constructor.name}'`,
        ...constructor.fields.map((field) =>
          `  readonly ${field.name}: ${mapDamlTypeToTs(field.type, context, usedImports, unresolvedTypes)}`,
        ),
        `}`,
      ].join('\n')
    }

    if (constructor.type) {
      return `{ readonly tag: '${constructor.name}'; readonly value: ${mapDamlTypeToTs(constructor.type, context, usedImports, unresolvedTypes)} }`
    }

    return `{ readonly tag: '${constructor.name}' }`
  })

  return `export type ${header} =\n  ${members.join('\n  | ')}\n`
}

function renderEnumType(name, typeParams, constructors) {
  const header = typeParams.length > 0 ? `${name}<${typeParams.join(', ')}>` : name
  return `export type ${header} = ${constructors.map((constructor) => `'${constructor.name}'`).join(' | ')}\n`
}

function renderTypeAlias(typeAlias, context, usedImports, unresolvedTypes) {
  const header = typeAlias.typeParams.length > 0
    ? `${typeAlias.name}<${typeAlias.typeParams.join(', ')}>`
    : typeAlias.name
  const aliasContext = {
    ...context,
    localTypeParams: new Set(typeAlias.typeParams),
  }
  return `export type ${header} = ${mapDamlTypeToTs(typeAlias.type, aliasContext, usedImports, unresolvedTypes)}\n`
}

function renderChoiceArgType(ownerName, choice, context, usedImports, unresolvedTypes) {
  const typeName = choiceArgTypeName(ownerName, choice.name)

  if (choice.fields.length === 0) {
    return `export type ${typeName} = Record<string, never>\n`
  }

  const lines = [`export type ${typeName} = {`]

  for (const field of choice.fields) {
    lines.push(`  readonly ${field.name}: ${mapDamlTypeToTs(field.type, context, usedImports, unresolvedTypes)}`)
  }

  lines.push('}')
  return `${lines.join('\n')}\n`
}

function renderTemplateConst(template, moduleDescriptor) {
  const choicesType = template.choices.length === 0
    ? 'Record<string, never>'
    : [
        '{',
        ...template.choices.map((choice) =>
          `  readonly ${choice.name}: ChoiceDescriptor<${choiceArgTypeName(template.name, choice.name)}>`,
        ),
        '}',
      ].join('\n')

  const lines = [`export const ${template.name} = {`]
  lines.push(`  templateId: '#${moduleDescriptor.packageName}:${moduleDescriptor.moduleName}:${template.name}' as const,`)
  lines.push('  choices: {')

  for (const choice of template.choices) {
    lines.push(`    ${choice.name}: { name: '${choice.name}' as const },`)
  }

  lines.push('  },')
  lines.push(`} as const satisfies TemplateDescriptor<${template.name}, ${choicesType}>`)

  return `${lines.join('\n')}\n`
}

function moduleFilePath(moduleDescriptor) {
  return path.posix.join(moduleDescriptor.packageName, ...moduleDescriptor.moduleName.split('.')) + '.ts'
}

function toJsImportPath(fromModuleDescriptor, toModuleDescriptor) {
  const fromDir = path.posix.dirname(moduleFilePath(fromModuleDescriptor))
  const toFile = moduleFilePath(toModuleDescriptor).replace(/\.ts$/, '.js')
  let relativePath = path.posix.relative(fromDir, toFile)

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`
  }

  return relativePath
}

function renderGeneratedModule(moduleDescriptor, registry) {
  const usedImports = new Map()
  const unresolvedTypes = new Set()
  const availableSymbols = buildAvailableSymbols(moduleDescriptor)
  const context = {
    moduleDescriptor,
    registry,
    availableSymbols,
    localTypeParams: new Set(),
  }
  const sections = []
  let needsTemplateDescriptor = false

  for (const typeAlias of moduleDescriptor.typeAliases) {
    sections.push(renderTypeAlias(typeAlias, context, usedImports, unresolvedTypes))
  }

  for (const dataType of moduleDescriptor.dataTypes) {
    const dataContext = {
      ...context,
      localTypeParams: new Set(dataType.typeParams),
    }

    if (dataType.kind === 'record') {
      sections.push(renderRecordType(dataType.name, dataType.typeParams, dataType.fields, dataContext, usedImports, unresolvedTypes))
      continue
    }

    if (dataType.kind === 'variant') {
      sections.push(renderVariantType(dataType.name, dataType.typeParams, dataType.constructors, dataContext, usedImports, unresolvedTypes))
      continue
    }

    sections.push(renderEnumType(dataType.name, dataType.typeParams, dataType.constructors))
  }

  for (const iface of moduleDescriptor.interfaces) {
    for (const choice of iface.choices) {
      sections.push(renderChoiceArgType(iface.name, choice, context, usedImports, unresolvedTypes))
    }
  }

  for (const template of moduleDescriptor.templates) {
    needsTemplateDescriptor = true

    for (const choice of template.choices) {
      sections.push(renderChoiceArgType(template.name, choice, context, usedImports, unresolvedTypes))
    }

    sections.push(renderRecordType(template.name, [], template.fields, context, usedImports, unresolvedTypes))
    sections.push(renderTemplateConst(template, moduleDescriptor))
  }

  const lines = []

  lines.push(`// Generated by scripts/import-splice-dars.mjs from ${moduleDescriptor.artifactFileName}`)
  lines.push('// Do not edit manually.')
  lines.push('')

  if (needsTemplateDescriptor) {
    lines.push("import type { ChoiceDescriptor, TemplateDescriptor } from 'cantonjs/codegen'")
  }

  const importLines = []

  for (const [importedModuleName, importedSymbols] of [...usedImports.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (importedSymbols.length === 0) {
      continue
    }

    const importedModule = registry.get(importedModuleName)?.moduleDescriptor

    if (!importedModule) {
      continue
    }

    importLines.push(
      `import type { ${importedSymbols.sort().join(', ')} } from '${toJsImportPath(moduleDescriptor, importedModule)}'`,
    )
  }

  if (importLines.length > 0) {
    if (needsTemplateDescriptor) {
      lines.push(...importLines)
    } else {
      lines.push(...importLines)
    }
  }

  if (needsTemplateDescriptor || importLines.length > 0) {
    lines.push('')
  }

  if (unresolvedTypes.size > 0) {
    lines.push('// Official dependency types not exposed as source in the selected DAR set.')
    for (const typeName of [...unresolvedTypes].sort()) {
      lines.push(`export type ${typeName} = unknown`)
    }
    lines.push('')
  }

  lines.push(sections.map((section) => section.trimEnd()).join('\n\n'))

  return `${lines.join('\n').trimEnd()}\n`
}

function descriptorExportName(moduleName, entityName) {
  const lastSegment = moduleName.split('.').at(-1)
  const versionSuffix = lastSegment?.match(/(V\d+)$/)?.[1]
  return versionSuffix ? `${entityName}${versionSuffix}` : entityName
}

function choiceArgTypeName(ownerName, choiceName) {
  return choiceName.startsWith(`${ownerName}_`) ? choiceName : `${ownerName}_${choiceName}`
}

function descriptorFileName(moduleName) {
  const lastSegment = moduleName.split('.').at(-1)
  return `${lastSegment[0].toLowerCase()}${lastSegment.slice(1)}.ts`
}

function namespaceExportName(moduleName) {
  const lastSegment = moduleName.split('.').at(-1)
  return `${lastSegment}Types`
}

function renderDescriptorFile(moduleDescriptor) {
  const importPath = `../generated/${moduleFilePath(moduleDescriptor).replace(/\.ts$/, '.js')}`
  const lines = []
  const interfaceImports = new Set()
  const templateValueImports = []
  const templateTypeImports = []
  const typeImportSpecifiers = []
  const needsChoiceDescriptor =
    moduleDescriptor.interfaces.some((iface) => iface.choices.length > 0) ||
    moduleDescriptor.templates.some((template) => template.choices.length > 0)

  lines.push(`// Generated by scripts/import-splice-dars.mjs from ${moduleDescriptor.artifactFileName}`)
  lines.push('// Do not edit manually.')
  lines.push('')

  if (needsChoiceDescriptor) {
    typeImportSpecifiers.push('ChoiceDescriptor')
  }
  if (moduleDescriptor.interfaces.length > 0) {
    typeImportSpecifiers.push('StableInterfaceDescriptor')
  }
  if (moduleDescriptor.templates.length > 0) {
    typeImportSpecifiers.push('StableTemplateDescriptor')
  }

  if (typeImportSpecifiers.length > 0) {
    lines.push(`import type { ${[...new Set(typeImportSpecifiers)].join(', ')} } from './types.js'`)
  }

  for (const iface of moduleDescriptor.interfaces) {
    if (iface.viewType) {
      interfaceImports.add(iface.viewType)
    }

    for (const choice of iface.choices) {
      interfaceImports.add(choiceArgTypeName(iface.name, choice.name))
    }
  }

  for (const template of moduleDescriptor.templates) {
    templateValueImports.push(`${template.name} as ${template.name}Generated`)
    templateTypeImports.push(`${template.name} as ${template.name}Payload`)

    for (const choice of template.choices) {
      templateTypeImports.push(choiceArgTypeName(template.name, choice.name))
    }
  }

  if (templateValueImports.length > 0) {
    lines.push(`import { ${templateValueImports.sort().join(', ')} } from '${importPath}'`)
  }

  const typeImports = [...new Set([
    ...interfaceImports,
    ...templateTypeImports,
  ])].sort()

  if (typeImports.length > 0) {
    lines.push(`import type { ${typeImports.join(', ')} } from '${importPath}'`)
  }

  lines.push('')

  for (const iface of moduleDescriptor.interfaces) {
    const exportName = descriptorExportName(moduleDescriptor.moduleName, iface.name)
    const choicesType = iface.choices.length === 0
      ? 'Record<string, never>'
      : [
          '{',
          ...iface.choices.map((choice) =>
            `  readonly ${choice.name}: ChoiceDescriptor<${choiceArgTypeName(iface.name, choice.name)}>`,
          ),
          '}',
        ].join('\n')

    lines.push(`export const ${exportName} = {`)
    lines.push("  kind: 'interface' as const,")
    lines.push(`  packageName: '${moduleDescriptor.packageName}' as const,`)
    lines.push(`  packageVersion: '${moduleDescriptor.packageVersion}' as const,`)
    lines.push(`  packageId: '${moduleDescriptor.packageId}' as const,`)
    lines.push(`  moduleName: '${moduleDescriptor.moduleName}' as const,`)
    lines.push(`  entityName: '${iface.name}' as const,`)
    lines.push(`  interfaceId: '#${moduleDescriptor.packageName}:${moduleDescriptor.moduleName}:${iface.name}' as const,`)
    lines.push('  choices: {')

    for (const choice of iface.choices) {
      lines.push(`    ${choice.name}: { name: '${choice.name}' as const },`)
    }

    lines.push('  },')
    lines.push(`} as const satisfies StableInterfaceDescriptor<${iface.viewType ?? 'unknown'}, ${choicesType}>`)
    lines.push('')
  }

  for (const template of moduleDescriptor.templates) {
    const exportName = descriptorExportName(moduleDescriptor.moduleName, template.name)
    const choicesType = template.choices.length === 0
      ? 'Record<string, never>'
      : [
          '{',
          ...template.choices.map((choice) =>
            `  readonly ${choice.name}: ChoiceDescriptor<${choiceArgTypeName(template.name, choice.name)}>`,
          ),
          '}',
        ].join('\n')

    lines.push(`export const ${exportName} = {`)
    lines.push("  kind: 'template' as const,")
    lines.push(`  packageName: '${moduleDescriptor.packageName}' as const,`)
    lines.push(`  packageVersion: '${moduleDescriptor.packageVersion}' as const,`)
    lines.push(`  packageId: '${moduleDescriptor.packageId}' as const,`)
    lines.push(`  moduleName: '${moduleDescriptor.moduleName}' as const,`)
    lines.push(`  entityName: '${template.name}' as const,`)
    lines.push(`  templateId: ${template.name}Generated.templateId,`)
    lines.push(`  choices: ${template.name}Generated.choices,`)
    lines.push(`} as const satisfies StableTemplateDescriptor<${template.name}Payload, ${choicesType}>`)
    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

async function writeGeneratedModules(moduleDescriptors, outputRoot = generatedRoot) {
  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })

  const registry = buildModuleRegistry(moduleDescriptors)
  const packageIndexLines = new Map()

  for (const moduleDescriptor of moduleDescriptors) {
    const filePath = path.join(outputRoot, moduleFilePath(moduleDescriptor))
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, renderGeneratedModule(moduleDescriptor, registry))

    const packageIndex = packageIndexLines.get(moduleDescriptor.packageName) ?? []
    let relativePath = path.posix.relative(moduleDescriptor.packageName, moduleFilePath(moduleDescriptor))
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`
    }
    packageIndex.push(`export * from '${relativePath.replace(/\.ts$/, '.js')}'`)
    packageIndexLines.set(moduleDescriptor.packageName, packageIndex)
  }

  for (const [packageName, lines] of packageIndexLines.entries()) {
    await writeFile(
      path.join(outputRoot, packageName, 'index.ts'),
      `${lines.sort().join('\n')}\n`,
    )
  }

  const barrelLines = moduleDescriptors.map((moduleDescriptor) =>
    `export * as ${namespaceExportName(moduleDescriptor.moduleName)} from './${moduleFilePath(moduleDescriptor).replace(/\.ts$/, '.js')}'`,
  )

  await writeFile(path.join(outputRoot, 'index.ts'), `${barrelLines.sort().join('\n')}\n`)
}

async function writeDescriptorFiles(moduleDescriptors, outputRoot = descriptorsRoot) {
  await mkdir(outputRoot, { recursive: true })

  if (outputRoot !== descriptorsRoot) {
    await copyFile(path.join(descriptorsRoot, 'types.ts'), path.join(outputRoot, 'types.ts'))
  }

  const filesToRemove = await readdir(outputRoot)

  for (const fileName of filesToRemove) {
    if (fileName === 'types.ts') {
      continue
    }

    await rm(path.join(outputRoot, fileName), { force: true })
  }

  const barrelLines = ["export * from './types.js'"]

  for (const moduleDescriptor of moduleDescriptors) {
    if (moduleDescriptor.interfaces.length === 0 && moduleDescriptor.templates.length === 0) {
      continue
    }

    const fileName = descriptorFileName(moduleDescriptor.moduleName)
    await writeFile(path.join(outputRoot, fileName), renderDescriptorFile(moduleDescriptor))
    barrelLines.push(`export * from './${fileName.replace(/\.ts$/, '.js')}'`)
  }

  await writeFile(path.join(outputRoot, 'index.ts'), `${barrelLines.sort().join('\n')}\n`)
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function listFilesRecursive(rootPath, currentPath = '.') {
  const directoryPath = currentPath === '.' ? rootPath : path.join(rootPath, currentPath)
  const entries = await readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = currentPath === '.'
      ? entry.name
      : path.posix.join(currentPath, entry.name)

    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(rootPath, relativePath))
      continue
    }

    files.push(relativePath)
  }

  return files
}

async function assertDirectoryMatches(actualRoot, expectedRoot, label) {
  const actualFiles = await listFilesRecursive(actualRoot)
  const expectedFiles = await listFilesRecursive(expectedRoot)

  if (actualFiles.length !== expectedFiles.length) {
    throw new Error(`${label} file set changed. Re-run scripts/import-splice-dars.mjs and commit the regenerated files.`)
  }

  for (let index = 0; index < actualFiles.length; index += 1) {
    if (actualFiles[index] !== expectedFiles[index]) {
      throw new Error(`${label} file set changed. Re-run scripts/import-splice-dars.mjs and commit the regenerated files.`)
    }
  }

  for (const relativePath of actualFiles) {
    const [actualContents, expectedContents] = await Promise.all([
      readFile(path.join(actualRoot, relativePath), 'utf8'),
      readFile(path.join(expectedRoot, relativePath), 'utf8'),
    ])

    if (actualContents !== expectedContents) {
      throw new Error(`${label} is stale: ${relativePath}`)
    }
  }
}

async function main() {
  const { tag: tagArg, source, verify } = parseArgs(process.argv.slice(2))
  const tag = await resolveTag(tagArg)

  if (source === 'vendor') {
    const vendorRoot = path.join(repoRoot, 'vendor', 'splice', tag, 'daml')
    const selectedArtifacts = selectArtifactFileNames(
      (await readdir(vendorRoot)).filter((entry) => entry.endsWith('.dar')),
    )
    const moduleDescriptors = []

    for (const artifact of selectedArtifacts) {
      const vendorPath = path.join(vendorRoot, artifact.fileName)
      const metadata = await loadDarMetadata(vendorPath)
      const selectedModules = metadata.modules.filter((moduleDescriptor) =>
        artifact.moduleNames.includes(moduleDescriptor.moduleName),
      )

      if (selectedModules.length === 0) {
        throw new Error(`Unable to locate expected source modules for ${artifact.id} in ${artifact.fileName}`)
      }

      for (const moduleDescriptor of selectedModules) {
        moduleDescriptors.push({
          ...moduleDescriptor,
          artifactFileName: artifact.fileName,
          packageName: metadata.packageName,
          packageVersion: metadata.packageVersion,
          packageId: metadata.packageId,
        })
      }
    }

    moduleDescriptors.sort((left, right) => left.moduleName.localeCompare(right.moduleName))

    if (verify) {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), `cantonjs-splice-verify-${tag}-`))
      const tempGeneratedRoot = path.join(tempRoot, 'generated')
      const tempDescriptorsRoot = path.join(tempRoot, 'descriptors')

      try {
        await writeGeneratedModules(moduleDescriptors, tempGeneratedRoot)
        await writeDescriptorFiles(moduleDescriptors, tempDescriptorsRoot)
        await assertDirectoryMatches(tempGeneratedRoot, generatedRoot, 'Generated interfaces')
        await assertDirectoryMatches(tempDescriptorsRoot, descriptorsRoot, 'Descriptor files')
      } finally {
        await rm(tempRoot, { recursive: true, force: true })
      }

      console.log(`Verified Splice interface outputs against vendored DARs for ${tag}`)
      return
    }

    await writeGeneratedModules(moduleDescriptors)
    await writeDescriptorFiles(moduleDescriptors)

    console.log(`Regenerated Splice interface outputs from vendored DARs for ${tag}`)
    return
  }

  if (verify) {
    throw new Error('--verify is supported only with --source vendor')
  }

  const bundleUrl = releaseBundleUrl(tag)
  const tempRoot = path.join(os.tmpdir(), `cantonjs-splice-${tag}`)
  const bundlePath = path.join(tempRoot, `${tag}_splice-node.tar.gz`)
  const extractionRoot = path.join(tempRoot, 'bundle')
  const vendorRoot = path.join(repoRoot, 'vendor', 'splice', tag, 'daml')

  await mkdir(tempRoot, { recursive: true })

  if (!await fileExists(bundlePath)) {
    await downloadBundle(bundleUrl, bundlePath)
  }

  const bundleEntries = await listBundleEntries(bundlePath)
  const selectedArtifacts = selectBundleArtifacts(bundleEntries)

  await extractBundleArtifacts(bundlePath, selectedArtifacts, extractionRoot)
  await rm(vendorRoot, { recursive: true, force: true })
  await mkdir(vendorRoot, { recursive: true })

  const moduleDescriptors = []
  const manifestArtifacts = []

  for (const artifact of selectedArtifacts) {
    const extractedPath = path.join(extractionRoot, 'splice-node', 'dars', artifact.fileName)
    const vendorPath = path.join(vendorRoot, artifact.fileName)
    const bytes = await readFile(extractedPath)

    await copyFile(extractedPath, vendorPath)

    const metadata = await loadDarMetadata(vendorPath)

    const selectedModules = metadata.modules.filter((moduleDescriptor) =>
      artifact.moduleNames.includes(moduleDescriptor.moduleName),
    )

    if (selectedModules.length === 0) {
      throw new Error(`Unable to locate expected source modules for ${artifact.id} in ${artifact.fileName}`)
    }

    for (const moduleDescriptor of selectedModules) {
      moduleDescriptors.push({
        ...moduleDescriptor,
        artifactFileName: artifact.fileName,
        packageName: metadata.packageName,
        packageVersion: metadata.packageVersion,
        packageId: metadata.packageId,
      })
    }

    manifestArtifacts.push({
      id: artifact.id,
      path: toPosixPath('vendor', 'splice', tag, 'daml', artifact.fileName),
      sourceBundle: bundleUrl,
      sourcePath: artifact.bundleEntry,
      sha256: sha256(bytes),
      packageName: metadata.packageName,
      packageVersion: metadata.packageVersion,
      packageId: metadata.packageId,
      purpose: artifact.purpose,
      modules: selectedModules.map((moduleDescriptor) => ({
        moduleName: moduleDescriptor.moduleName,
        sourceEntry: moduleDescriptor.sourceEntry,
        typeAliases: moduleDescriptor.typeAliases.map((typeAlias) => typeAlias.name),
        dataTypes: moduleDescriptor.dataTypes.map((dataType) => dataType.name),
        interfaces: moduleDescriptor.interfaces.map((iface) => ({
          name: iface.name,
          viewType: iface.viewType,
          choices: iface.choices.map((choice) => choice.name),
        })),
        templates: moduleDescriptor.templates.map((template) => ({
          name: template.name,
          choices: template.choices.map((choice) => choice.name),
        })),
      })),
    })
  }

  moduleDescriptors.sort((left, right) => left.moduleName.localeCompare(right.moduleName))

  await writeGeneratedModules(moduleDescriptors)
  await writeDescriptorFiles(moduleDescriptors)

  const manifest = {
    schemaVersion: 1,
    upstream: {
      releaseRepository: OFFICIAL_RELEASE_REPOSITORY,
      releaseTag: tag,
      bundleUrl,
      docs: OFFICIAL_TOKEN_STANDARD_DOCS,
    },
    generation: {
      script: 'scripts/import-splice-dars.mjs',
      outputPackage: 'packages/cantonjs-splice-interfaces',
      source: 'embedded-daml-source',
    },
    artifacts: manifestArtifacts,
  }

  await writeFile(
    path.join(vendorRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  console.log(`Imported ${manifestArtifacts.length} official Splice DARs for ${tag}`)
  console.log(`Manifest: ${toPosixPath('vendor', 'splice', tag, 'daml', 'manifest.json')}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
