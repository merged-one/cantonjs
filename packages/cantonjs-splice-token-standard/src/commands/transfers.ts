import type { CommandOptions } from 'cantonjs'
import {
  TransferFactoryV1,
  TransferInstructionV1,
  type InferChoiceArgs,
} from 'cantonjs-splice-interfaces'
import type {
  TokenStandardInteractiveSubmissionContext,
  TokenStandardLedgerClient,
  TokenStandardPrepareOptions,
} from '../types.js'
import {
  prepareTokenStandardChoice,
  submitTokenStandardChoice,
} from './common.js'

export function transferViaFactoryV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof TransferFactoryV1, 'TransferFactory_Transfer'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'TransferFactory_Transfer',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function prepareTransferViaFactoryV1(
  context: TokenStandardInteractiveSubmissionContext,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof TransferFactoryV1, 'TransferFactory_Transfer'>
    readonly options?: TokenStandardPrepareOptions
  },
) {
  return prepareTokenStandardChoice(context, TransferFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'TransferFactory_Transfer',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function publicFetchTransferFactoryV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof TransferFactoryV1, 'TransferFactory_PublicFetch'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'TransferFactory_PublicFetch',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function acceptTransferInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<
      typeof TransferInstructionV1,
      'TransferInstruction_Accept'
    >
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'TransferInstruction_Accept',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function rejectTransferInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<
      typeof TransferInstructionV1,
      'TransferInstruction_Reject'
    >
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'TransferInstruction_Reject',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function withdrawTransferInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<
      typeof TransferInstructionV1,
      'TransferInstruction_Withdraw'
    >
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'TransferInstruction_Withdraw',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function updateTransferInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof TransferInstructionV1, 'TransferInstruction_Update'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, TransferInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'TransferInstruction_Update',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}
