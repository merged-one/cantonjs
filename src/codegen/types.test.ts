import { describe, it, expect } from 'vitest'
import type {
  TemplateDescriptor,
  ChoiceDescriptor,
  InferPayload,
  InferChoiceArgs,
} from './types.js'

// Example generated types (simulating codegen output)
type AssetPayload = {
  readonly owner: string
  readonly description: string
  readonly value: string
}

type AssetTransferArgs = {
  readonly newOwner: string
}

const Asset = {
  templateId: '#my-package:Main:Asset' as const,
  choices: {
    Transfer: { name: 'Transfer' as const } as ChoiceDescriptor<AssetTransferArgs, Record<string, never>>,
    Archive: { name: 'Archive' as const } as ChoiceDescriptor<Record<string, never>>,
  },
} as const satisfies TemplateDescriptor<AssetPayload>

describe('codegen runtime types', () => {
  describe('TemplateDescriptor', () => {
    it('can describe a template with templateId and choices', () => {
      expect(Asset.templateId).toBe('#my-package:Main:Asset')
      expect(Asset.choices.Transfer.name).toBe('Transfer')
      expect(Asset.choices.Archive.name).toBe('Archive')
    })

    it('has the correct shape for type-safe usage', () => {
      const descriptor: TemplateDescriptor = Asset
      expect(descriptor.templateId).toBe('#my-package:Main:Asset')
    })
  })

  describe('ChoiceDescriptor', () => {
    it('can describe a choice with a name', () => {
      const choice: ChoiceDescriptor<AssetTransferArgs> = {
        name: 'Transfer',
      }
      expect(choice.name).toBe('Transfer')
    })
  })

  describe('InferPayload', () => {
    it('extracts payload type from TemplateDescriptor', () => {
      type Inferred = InferPayload<typeof Asset>
      // Verify the inferred type is assignable to AssetPayload
      const payload: Inferred = { owner: 'Alice', description: 'Gold', value: '100' }
      expect(payload.owner).toBe('Alice')
    })
  })

  describe('InferChoiceArgs', () => {
    it('extracts choice argument type', () => {
      type TransferArgs = InferChoiceArgs<typeof Asset, 'Transfer'>
      const args: TransferArgs = { newOwner: 'Bob' }
      expect(args.newOwner).toBe('Bob')
    })

    it('extracts empty args for Archive choice', () => {
      type ArchiveArgs = InferChoiceArgs<typeof Asset, 'Archive'>
      const args: ArchiveArgs = {}
      expect(args).toEqual({})
    })
  })

  describe('declaration merging pattern', () => {
    it('type and const can share the same name (generated output pattern)', () => {
      // This tests the declaration merging pattern used by codegen output
      // TypeScript allows a type and a const with the same name
      type MyTemplate = { readonly field: string }
      const MyTemplate = {
        templateId: '#pkg:Mod:MyTemplate' as const,
        choices: {},
      } as const satisfies TemplateDescriptor<MyTemplate>

      // Both usable
      const payload: MyTemplate = { field: 'hello' }
      expect(payload.field).toBe('hello')
      expect(MyTemplate.templateId).toBe('#pkg:Mod:MyTemplate')
    })
  })
})
