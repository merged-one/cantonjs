/**
 * Runtime types for cantonjs codegen output.
 *
 * Generated code imports these types to describe templates and choices.
 * The core library uses them for type-safe contract operations.
 */

/** Describes a choice on a template. */
export type ChoiceDescriptor<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  _TResult = unknown,
> = {
  readonly name: string
  readonly _args?: TArgs
}

/** Describes a template with its payload type and available choices. */
export type TemplateDescriptor<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TChoices extends Record<string, ChoiceDescriptor> = Record<string, ChoiceDescriptor>,
> = {
  readonly templateId: string
  readonly choices: TChoices
  readonly _payload?: TPayload
}

/**
 * Extract the payload type from a TemplateDescriptor.
 *
 * @example
 * ```typescript
 * type AssetPayload = InferPayload<typeof Asset>
 * // { readonly owner: string; readonly value: string }
 * ```
 */
export type InferPayload<T extends TemplateDescriptor> =
  T extends TemplateDescriptor<infer P, Record<string, ChoiceDescriptor>> ? P : never

/**
 * Extract the choice argument type for a specific choice.
 *
 * @example
 * ```typescript
 * type TransferArgs = InferChoiceArgs<typeof Asset, 'Transfer'>
 * // { readonly newOwner: string }
 * ```
 */
export type InferChoiceArgs<
  T extends TemplateDescriptor,
  C extends keyof T['choices'],
> = T['choices'][C] extends ChoiceDescriptor<infer A> ? A : never
