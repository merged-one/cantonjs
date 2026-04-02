import type { CommandOptions } from 'cantonjs'
import {
  AllocationFactoryV1,
  AllocationInstructionV1,
  AllocationRequestV1,
  AllocationV1,
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

export function allocateViaFactoryV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationFactoryV1, 'AllocationFactory_Allocate'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'AllocationFactory_Allocate',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function prepareAllocationViaFactoryV1(
  context: TokenStandardInteractiveSubmissionContext,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationFactoryV1, 'AllocationFactory_Allocate'>
    readonly options?: TokenStandardPrepareOptions
  },
) {
  return prepareTokenStandardChoice(context, AllocationFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'AllocationFactory_Allocate',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function publicFetchAllocationFactoryV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly factoryContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationFactoryV1, 'AllocationFactory_PublicFetch'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationFactoryV1, {
    contractId: parameters.factoryContractId,
    choice: 'AllocationFactory_PublicFetch',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function updateAllocationInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<
      typeof AllocationInstructionV1,
      'AllocationInstruction_Update'
    >
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'AllocationInstruction_Update',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function withdrawAllocationInstructionV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly instructionContractId: string
    readonly choiceArgument: InferChoiceArgs<
      typeof AllocationInstructionV1,
      'AllocationInstruction_Withdraw'
    >
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationInstructionV1, {
    contractId: parameters.instructionContractId,
    choice: 'AllocationInstruction_Withdraw',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function rejectAllocationRequestV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly requestContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationRequestV1, 'AllocationRequest_Reject'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationRequestV1, {
    contractId: parameters.requestContractId,
    choice: 'AllocationRequest_Reject',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function withdrawAllocationRequestV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly requestContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationRequestV1, 'AllocationRequest_Withdraw'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationRequestV1, {
    contractId: parameters.requestContractId,
    choice: 'AllocationRequest_Withdraw',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function executeAllocationV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly allocationContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationV1, 'Allocation_ExecuteTransfer'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationV1, {
    contractId: parameters.allocationContractId,
    choice: 'Allocation_ExecuteTransfer',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function cancelAllocationV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly allocationContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationV1, 'Allocation_Cancel'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationV1, {
    contractId: parameters.allocationContractId,
    choice: 'Allocation_Cancel',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}

export function withdrawAllocationV1(
  client: TokenStandardLedgerClient,
  parameters: {
    readonly allocationContractId: string
    readonly choiceArgument: InferChoiceArgs<typeof AllocationV1, 'Allocation_Withdraw'>
    readonly options?: CommandOptions
  },
) {
  return submitTokenStandardChoice(client, AllocationV1, {
    contractId: parameters.allocationContractId,
    choice: 'Allocation_Withdraw',
    choiceArgument: parameters.choiceArgument,
    options: parameters.options,
  })
}
