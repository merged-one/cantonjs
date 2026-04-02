import type {
  JsTransaction,
  PartySignatures,
  PrepareSubmissionResponse,
  TransportRequest,
} from 'cantonjs'
import type { StableDescriptor } from 'cantonjs-splice-interfaces'
import type {
  TokenChoicePreparationParams,
  TokenChoiceSubmissionParams,
  TokenDescriptorChoiceName,
  TokenStandardExecuteOptions,
  TokenStandardInteractiveSubmissionContext,
  TokenStandardLedgerClient,
} from '../types.js'

function createCommandId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `token-standard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function descriptorId(descriptor: StableDescriptor): string {
  return descriptor.kind === 'template' ? descriptor.templateId : descriptor.interfaceId
}

function descriptorChoiceName<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
>(descriptor: TDescriptor, choice: TChoice): string {
  return descriptor.choices[choice]!.name
}

export async function submitTokenStandardChoice<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
>(
  client: TokenStandardLedgerClient,
  descriptor: TDescriptor,
  parameters: TokenChoiceSubmissionParams<TDescriptor, TChoice>,
): Promise<JsTransaction> {
  return client.exerciseChoice(
    descriptorId(descriptor),
    parameters.contractId,
    descriptorChoiceName(descriptor, parameters.choice),
    parameters.choiceArgument as Record<string, unknown>,
    parameters.options,
  )
}

export async function prepareTokenStandardChoice<
  TDescriptor extends StableDescriptor,
  TChoice extends TokenDescriptorChoiceName<TDescriptor>,
>(
  context: TokenStandardInteractiveSubmissionContext,
  descriptor: TDescriptor,
  parameters: TokenChoicePreparationParams<TDescriptor, TChoice>,
): Promise<PrepareSubmissionResponse> {
  const request: TransportRequest = {
    method: 'POST',
    path: '/v2/interactive-submission/prepare',
    body: {
      commands: [
        {
          ExerciseCommand: {
            templateId: descriptorId(descriptor),
            contractId: parameters.contractId,
            choice: descriptorChoiceName(descriptor, parameters.choice),
            choiceArgument: parameters.choiceArgument as Record<string, unknown>,
          },
        },
      ],
      commandId: parameters.options?.commandId ?? createCommandId(),
      actAs: [context.actAs],
      readAs: context.readAs && context.readAs.length > 0 ? context.readAs : undefined,
      workflowId: parameters.options?.workflowId,
      synchronizerId: parameters.options?.synchronizerId,
      submissionId: parameters.options?.submissionId,
    },
  }

  if (parameters.options?.signal) {
    request.signal = parameters.options.signal
  }

  return context.transport.request<PrepareSubmissionResponse>(request)
}

export async function executePreparedTokenSubmissionWithTransport(
  context: Pick<TokenStandardInteractiveSubmissionContext, 'transport'>,
  preparedTransaction: string,
  partySignatures: readonly PartySignatures[],
  options?: TokenStandardExecuteOptions,
): Promise<JsTransaction> {
  const request: TransportRequest = {
    method: 'POST',
    path: '/v2/interactive-submission/execute',
    body: {
      preparedTransaction,
      partySignatures,
      submissionId: options?.submissionId,
    },
  }

  if (options?.signal) {
    request.signal = options.signal
  }

  const response = await context.transport.request<{ transaction: JsTransaction }>(request)
  return response.transaction
}
