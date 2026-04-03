import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'

type CodeBlock = {
  readonly language?: string
  readonly code: string
}

const currentFile = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFile)
const repoRoot = resolve(currentDir, '../..')
const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
const codeBlocks = extractCodeBlocks(readme)

describe('README snippets', () => {
  it('keeps TypeScript snippets syntactically valid', () => {
    const diagnostics = codeBlocks
      .filter((block) => block.language === 'typescript' || block.language === 'tsx')
      .flatMap((block) => transpileSnippet(block))

    expect(diagnostics).toEqual([])
  })

  it('keeps codegen and testing snippets aligned with current tooling', () => {
    const codegenBlock = findCodeBlockContaining('cantonjs-codegen --dar')
    expect(codegenBlock.code).toContain('npx cantonjs-codegen --dar ./model.dar --output ./src/generated')

    const mockTransportBlock = findCodeBlockContaining('createMockTransport')
    expect(mockTransportBlock.code).toContain("import { createLedgerClient } from 'cantonjs'")
    expect(mockTransportBlock.code).toContain("import { createMockTransport } from 'cantonjs/testing'")

    const sandboxBlock = findCodeBlockContaining('setupCantonSandbox')
    expect(sandboxBlock.code).toContain('const sandbox = await setupCantonSandbox()')
    expect(sandboxBlock.code).not.toContain('cantonctlPath')
  })

  it('keeps the root React example self-contained', () => {
    const reactBlock = findCodeBlockContaining('<CantonProvider client={client}>')

    expect(reactBlock.code).toContain("import { createLedgerClient, jsonApi } from 'cantonjs'")
    expect(reactBlock.code).toContain(
      "import { CantonProvider, useContracts, useCreateContract } from 'cantonjs-react'",
    )
    expect(reactBlock.code).toContain('const client = createLedgerClient({')
  })
})

function extractCodeBlocks(markdown: string): CodeBlock[] {
  return Array.from(markdown.matchAll(/```([a-z]+)?\n([\s\S]*?)```/g), (match) => ({
    language: match[1],
    code: match[2] ?? '',
  }))
}

function findCodeBlockContaining(marker: string): CodeBlock {
  const block = codeBlocks.find((candidate) => candidate.code.includes(marker))
  if (block === undefined) {
    throw new Error(`Unable to find README code block containing "${marker}"`)
  }

  return block
}

function transpileSnippet(block: CodeBlock): string[] {
  const fileName = block.language === 'tsx' ? 'README-snippet.tsx' : 'README-snippet.ts'
  const result = ts.transpileModule(block.code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName,
    reportDiagnostics: true,
  })

  return (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}
