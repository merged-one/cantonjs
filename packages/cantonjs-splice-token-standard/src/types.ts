import type {
  ActiveContract,
  CommandOptions,
  JsTransaction,
  LedgerClient,
  Party,
  PartySignatures,
  PrepareSubmissionResponse,
  QueryOptions,
  Transport,
} from 'cantonjs'
import {
  AllocationFactoryV1,
  AllocationInstructionV1,
  AllocationRequestV1,
  AllocationV1,
  AnyContractV1,
  HoldingV1,
  TransferFactoryV1,
  TransferInstructionV1,
  type InferChoiceArgs,
  type InferView,
  type StableDescriptor,
  type StableInterfaceDescriptor,
} from 'cantonjs-splice-interfaces'

export type TokenAnyValue =
  | { readonly tag: 'AV_Text'; readonly value: string }
  | { readonly tag: 'AV_Int'; readonly value: string }
  | { readonly tag: 'AV_Decimal'; readonly value: string }
  | { readonly tag: 'AV_Bool'; readonly value: boolean }
  | { readonly tag: 'AV_Date'; readonly value: string }
  | { readonly tag: 'AV_Time'; readonly value: string }
  | { readonly tag: 'AV_RelTime'; readonly value: string }
  | { readonly tag: 'AV_Party'; readonly value: string }
  | { readonly tag: 'AV_ContractId'; readonly value: string }
  | { readonly tag: 'AV_List'; readonly value: readonly TokenAnyValue[] }
  | { readonly tag: 'AV_Map'; readonly value: Readonly<Record<string, TokenAnyValue>> }

export type TokenChoiceContext = {
  readonly values: Readonly<Record<string, TokenAnyValue>>
}

export type TokenMetadata = {
  readonly values: Readonly<Record<string, string>>
}

export type TokenExtraArgs = {
  readonly context: TokenChoiceContext
  readonly meta: TokenMetadata
}

export const EMPTY_TOKEN_CONTEXT: TokenChoiceContext = { values: {} }
export const EMPTY_TOKEN_METADATA: TokenMetadata = { values: {} }
export const EMPTY_EXTRA_ARGS: TokenExtraArgs = {
  context: EMPTY_TOKEN_CONTEXT,
  meta: EMPTY_TOKEN_METADATA,
}

export type TokenStandardLedgerClient = Pick<
  LedgerClient,
  'actAs' | 'readAs' | 'queryContracts' | 'exerciseChoice'
>

export type TokenStandardQueryOptions = Pick<QueryOptions, 'activeAtOffset' | 'signal'>

export type TokenStandardPrepareOptions = CommandOptions & {
  readonly submissionId?: string
  readonly synchronizerId?: string
}

export type TokenStandardExecuteOptions = {
  readonly submissionId?: string
  readonly signal?: AbortSignal
}

export type TokenStandardInteractiveSubmissionContext = {
  readonly transport: Transport
  readonly actAs: Party
  readonly readAs?: readonly Party[]
}

export type TokenInterfaceContract<TDescriptor extends StableInterfaceDescriptor> = ActiveContract & {
  readonly interfaceId: TDescriptor['interfaceId']
  readonly view: InferView<TDescriptor>
}

export const TOKEN_STANDARD_V1_DESCRIPTORS = [
  HoldingV1,
  AnyContractV1,
  TransferInstructionV1,
  TransferFactoryV1,
  AllocationV1,
  AllocationRequestV1,
  AllocationInstructionV1,
  AllocationFactoryV1,
] as const

export type TokenStandardV1Descriptor = (typeof TOKEN_STANDARD_V1_DESCRIPTORS)[number]
export type TokenStandardV1InterfaceId = TokenStandardV1Descriptor['interfaceId']

export const TOKEN_STANDARD_V1_INTERFACE_IDS = TOKEN_STANDARD_V1_DESCRIPTORS.map(
  (descriptor) => descriptor.interfaceId,
)

export type TokenStandardCreatedHistoryItem = {
  readonly kind: 'created'
  readonly interfaceId: TokenStandardV1InterfaceId
  readonly contractId: string
  readonly templateId: string
  readonly updateId: string
  readonly offset: number
  readonly eventIndex: number
  readonly effectiveAt: string
  readonly recordTime: string
  readonly synchronizerId: string
  readonly view: unknown
}

export type TokenStandardArchivedHistoryItem = {
  readonly kind: 'archived'
  readonly interfaceId: TokenStandardV1InterfaceId
  readonly contractId: string
  readonly templateId: string
  readonly updateId: string
  readonly offset: number
  readonly eventIndex: number
  readonly effectiveAt: string
  readonly recordTime: string
  readonly synchronizerId: string
}

export type TokenStandardExercisedHistoryItem = {
  readonly kind: 'exercised'
  readonly interfaceId: TokenStandardV1InterfaceId
  readonly contractId: string
  readonly templateId: string
  readonly updateId: string
  readonly offset: number
  readonly eventIndex: number
  readonly effectiveAt: string
  readonly recordTime: string
  readonly synchronizerId: string
  readonly choice: string
  readonly consuming: boolean
  readonly choiceArgument: Record<string, unknown>
  readonly exerciseResult?: unknown
}

export type TokenStandardHistoryItem =
  | TokenStandardCreatedHistoryItem
  | TokenStandardArchivedHistoryItem
  | TokenStandardExercisedHistoryItem

export type TokenDescriptorChoiceName<TDescriptor extends StableDescriptor> = Extract<
  keyof TDescriptor['choices'],
  string
>

export type TokenDescriptorChoiceArgs<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
> = InferChoiceArgs<TDescriptor, TChoice>

export type TokenChoiceSubmissionParams<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
> = {
  readonly contractId: string
  readonly choice: TChoice
  readonly choiceArgument: TokenDescriptorChoiceArgs<TDescriptor, TChoice>
  readonly options?: CommandOptions
}

export type TokenChoicePreparationParams<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
> = {
  readonly contractId: string
  readonly choice: TChoice
  readonly choiceArgument: TokenDescriptorChoiceArgs<TDescriptor, TChoice>
  readonly options?: TokenStandardPrepareOptions
}

export type TokenChoiceSubmitter = (
  preparedTransaction: string,
  partySignatures: readonly PartySignatures[],
  options?: TokenStandardExecuteOptions,
) => Promise<JsTransaction>

export type PreparedTokenSubmission = PrepareSubmissionResponse
