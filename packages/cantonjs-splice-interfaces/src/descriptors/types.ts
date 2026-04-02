import type { ChoiceDescriptor as CantonChoiceDescriptor } from 'cantonjs/codegen'

export type ChoiceDescriptor<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> = CantonChoiceDescriptor<TArgs, TResult>

type StableDescriptorBase<
  TChoices extends Record<string, ChoiceDescriptor> = Record<string, ChoiceDescriptor>,
> = {
  readonly packageName: string
  readonly packageVersion: string
  readonly packageId: string
  readonly moduleName: string
  readonly entityName: string
  readonly choices: TChoices
}

export type StableTemplateDescriptor<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TChoices extends Record<string, ChoiceDescriptor> = Record<string, ChoiceDescriptor>,
> = StableDescriptorBase<TChoices> & {
  readonly kind: 'template'
  readonly templateId: string
  readonly _payload?: TPayload
}

export type StableInterfaceDescriptor<
  TView = unknown,
  TChoices extends Record<string, ChoiceDescriptor> = Record<string, ChoiceDescriptor>,
> = StableDescriptorBase<TChoices> & {
  readonly kind: 'interface'
  readonly interfaceId: string
  readonly _view?: TView
}

export type StableDescriptor =
  | StableTemplateDescriptor<Record<string, unknown>, Record<string, ChoiceDescriptor>>
  | StableInterfaceDescriptor<unknown, Record<string, ChoiceDescriptor>>

export type InferPayload<T extends StableTemplateDescriptor> =
  T extends StableTemplateDescriptor<infer P, Record<string, ChoiceDescriptor>> ? P : never

export type InferView<T extends StableInterfaceDescriptor> =
  T extends StableInterfaceDescriptor<infer V, Record<string, ChoiceDescriptor>> ? V : never

export type InferChoiceArgs<
  T extends StableDescriptor,
  C extends keyof T['choices'],
> = T['choices'][C] extends ChoiceDescriptor<infer A> ? A : never
