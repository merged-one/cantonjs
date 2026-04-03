import { AllocationFactoryV1, AllocationInstructionV1, AllocationRequestV1, AllocationV1, AnyContractV1, HoldingV1, TransferFactoryV1, TransferInstructionV1 } from 'cantonjs-splice-interfaces'
import { describe, expect, it, vi } from 'vitest'
import {
  queryAllocationFactoriesV1,
  queryAllocationInstructionsV1,
  queryAllocationRequestsV1,
  queryAllocationsV1,
  queryHoldingsV1,
  queryMetadataContractsV1,
  queryTransferFactoriesV1,
  queryTransferInstructionsV1,
} from './index.js'
import { buildInterfaceEventFormat } from './internal.js'

describe('token-standard query surface', () => {
  it('routes every exported query helper through the expected stable interface id', async () => {
    const signal = new AbortController().signal
    const queryContracts = vi.fn().mockResolvedValue([])
    const client = {
      actAs: 'Alice::1234',
      readAs: ['Observer::9999'],
      queryContracts,
      exerciseChoice: vi.fn(),
    }

    const cases = [
      [HoldingV1.interfaceId, queryHoldingsV1],
      [AnyContractV1.interfaceId, queryMetadataContractsV1],
      [AllocationV1.interfaceId, queryAllocationsV1],
      [AllocationRequestV1.interfaceId, queryAllocationRequestsV1],
      [AllocationInstructionV1.interfaceId, queryAllocationInstructionsV1],
      [AllocationFactoryV1.interfaceId, queryAllocationFactoriesV1],
      [TransferInstructionV1.interfaceId, queryTransferInstructionsV1],
      [TransferFactoryV1.interfaceId, queryTransferFactoriesV1],
    ] as const

    for (const [, helper] of cases) {
      await helper(client as never, {
        activeAtOffset: 5,
        signal,
      })
    }

    expect(queryContracts).toHaveBeenCalledTimes(cases.length)

    for (const [index, [interfaceId]] of cases.entries()) {
      expect(queryContracts.mock.calls[index]?.[0]).toBe(interfaceId)
      expect(queryContracts.mock.calls[index]?.[1]).toEqual({
        activeAtOffset: 5,
        signal,
        eventFormat: buildInterfaceEventFormat(
          ['Alice::1234', 'Observer::9999'],
          interfaceId,
        ),
      })
    }
  })
})
