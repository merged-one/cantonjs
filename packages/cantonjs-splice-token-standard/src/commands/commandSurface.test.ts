import { createLedgerClient, type Party } from 'cantonjs'
import { createMockTransport } from 'cantonjs/testing'
import {
  AllocationFactoryV1,
  AllocationInstructionV1,
  AllocationRequestV1,
  AllocationV1,
  TransferFactoryV1,
  TransferInstructionV1,
} from 'cantonjs-splice-interfaces'
import { describe, expect, it } from 'vitest'
import {
  allocateViaFactoryV1,
  cancelAllocationV1,
  executeAllocationV1,
  prepareAllocationViaFactoryV1,
  publicFetchAllocationFactoryV1,
  publicFetchTransferFactoryV1,
  rejectAllocationRequestV1,
  rejectTransferInstructionV1,
  transferViaFactoryV1,
  updateAllocationInstructionV1,
  updateTransferInstructionV1,
  withdrawAllocationInstructionV1,
  withdrawAllocationRequestV1,
  withdrawAllocationV1,
  withdrawTransferInstructionV1,
} from './index.js'

const alice = 'Alice::1234' as Party

function createSubmissionClient() {
  const transport = createMockTransport({
    matchers: [
      {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-transaction',
        response: {
          transaction: {
            updateId: 'update-1',
            events: [],
            offset: 1,
            synchronizerId: 'sync-1',
            effectiveAt: '2026-04-02T00:00:00Z',
            recordTime: '2026-04-02T00:00:00Z',
          },
        },
      },
    ],
  })

  return {
    transport,
    client: createLedgerClient({ transport, actAs: alice }),
  }
}

describe('token-standard command surface', () => {
  it('routes every submit helper through the expected stable descriptor and choice', async () => {
    const submitCases = [
      {
        descriptorId: TransferFactoryV1.interfaceId,
        contractId: 'transfer-factory-1',
        choice: 'TransferFactory_Transfer',
        invoke: (client: ReturnType<typeof createLedgerClient>) => transferViaFactoryV1(client, {
          factoryContractId: 'transfer-factory-1',
          choiceArgument: { transfer: 'payload' } as never,
        }),
      },
      {
        descriptorId: TransferFactoryV1.interfaceId,
        contractId: 'transfer-factory-2',
        choice: 'TransferFactory_PublicFetch',
        invoke: (client: ReturnType<typeof createLedgerClient>) => publicFetchTransferFactoryV1(client, {
          factoryContractId: 'transfer-factory-2',
          choiceArgument: { visibleTo: 'Bob::1234' } as never,
        }),
      },
      {
        descriptorId: TransferInstructionV1.interfaceId,
        contractId: 'transfer-instruction-1',
        choice: 'TransferInstruction_Reject',
        invoke: (client: ReturnType<typeof createLedgerClient>) => rejectTransferInstructionV1(client, {
          instructionContractId: 'transfer-instruction-1',
          choiceArgument: { reason: 'nope' } as never,
        }),
      },
      {
        descriptorId: TransferInstructionV1.interfaceId,
        contractId: 'transfer-instruction-2',
        choice: 'TransferInstruction_Withdraw',
        invoke: (client: ReturnType<typeof createLedgerClient>) => withdrawTransferInstructionV1(client, {
          instructionContractId: 'transfer-instruction-2',
          choiceArgument: { requestedBy: 'Alice::1234' } as never,
        }),
      },
      {
        descriptorId: TransferInstructionV1.interfaceId,
        contractId: 'transfer-instruction-3',
        choice: 'TransferInstruction_Update',
        invoke: (client: ReturnType<typeof createLedgerClient>) => updateTransferInstructionV1(client, {
          instructionContractId: 'transfer-instruction-3',
          choiceArgument: { executeBefore: '2026-04-02T00:05:00Z' } as never,
        }),
      },
      {
        descriptorId: AllocationFactoryV1.interfaceId,
        contractId: 'allocation-factory-1',
        choice: 'AllocationFactory_Allocate',
        invoke: (client: ReturnType<typeof createLedgerClient>) => allocateViaFactoryV1(client, {
          factoryContractId: 'allocation-factory-1',
          choiceArgument: { allocation: 'payload' } as never,
        }),
      },
      {
        descriptorId: AllocationFactoryV1.interfaceId,
        contractId: 'allocation-factory-2',
        choice: 'AllocationFactory_PublicFetch',
        invoke: (client: ReturnType<typeof createLedgerClient>) => publicFetchAllocationFactoryV1(client, {
          factoryContractId: 'allocation-factory-2',
          choiceArgument: { visibleTo: 'Bob::1234' } as never,
        }),
      },
      {
        descriptorId: AllocationInstructionV1.interfaceId,
        contractId: 'allocation-instruction-1',
        choice: 'AllocationInstruction_Update',
        invoke: (client: ReturnType<typeof createLedgerClient>) => updateAllocationInstructionV1(client, {
          instructionContractId: 'allocation-instruction-1',
          choiceArgument: { settleBefore: '2026-04-02T00:10:00Z' } as never,
        }),
      },
      {
        descriptorId: AllocationInstructionV1.interfaceId,
        contractId: 'allocation-instruction-2',
        choice: 'AllocationInstruction_Withdraw',
        invoke: (client: ReturnType<typeof createLedgerClient>) => withdrawAllocationInstructionV1(client, {
          instructionContractId: 'allocation-instruction-2',
          choiceArgument: { requestedBy: 'Alice::1234' } as never,
        }),
      },
      {
        descriptorId: AllocationRequestV1.interfaceId,
        contractId: 'allocation-request-1',
        choice: 'AllocationRequest_Reject',
        invoke: (client: ReturnType<typeof createLedgerClient>) => rejectAllocationRequestV1(client, {
          requestContractId: 'allocation-request-1',
          choiceArgument: { reason: 'rejected' } as never,
        }),
      },
      {
        descriptorId: AllocationRequestV1.interfaceId,
        contractId: 'allocation-request-2',
        choice: 'AllocationRequest_Withdraw',
        invoke: (client: ReturnType<typeof createLedgerClient>) => withdrawAllocationRequestV1(client, {
          requestContractId: 'allocation-request-2',
          choiceArgument: { requestedBy: 'Alice::1234' } as never,
        }),
      },
      {
        descriptorId: AllocationV1.interfaceId,
        contractId: 'allocation-1',
        choice: 'Allocation_ExecuteTransfer',
        invoke: (client: ReturnType<typeof createLedgerClient>) => executeAllocationV1(client, {
          allocationContractId: 'allocation-1',
          choiceArgument: { submissionRef: 'submission-1' } as never,
        }),
      },
      {
        descriptorId: AllocationV1.interfaceId,
        contractId: 'allocation-2',
        choice: 'Allocation_Cancel',
        invoke: (client: ReturnType<typeof createLedgerClient>) => cancelAllocationV1(client, {
          allocationContractId: 'allocation-2',
          choiceArgument: { requestedBy: 'Alice::1234' } as never,
        }),
      },
      {
        descriptorId: AllocationV1.interfaceId,
        contractId: 'allocation-3',
        choice: 'Allocation_Withdraw',
        invoke: (client: ReturnType<typeof createLedgerClient>) => withdrawAllocationV1(client, {
          allocationContractId: 'allocation-3',
          choiceArgument: { requestedBy: 'Alice::1234' } as never,
        }),
      },
    ] as const

    for (const testCase of submitCases) {
      const { client, transport } = createSubmissionClient()
      await testCase.invoke(client)

      const request = transport.calls[0]?.request
      expect(request?.path).toBe('/v2/commands/submit-and-wait-for-transaction')
      expect(request?.body).toMatchObject({
        commands: {
          commands: [
            {
              ExerciseCommand: {
                templateId: testCase.descriptorId,
                contractId: testCase.contractId,
                choice: testCase.choice,
              },
            },
          ],
        },
      })
    }
  })

  it('routes allocation preparation through interactive submission with stable metadata', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/interactive-submission/prepare',
          response: {
            preparedTransaction: 'prepared-allocation',
            preparedTransactionHash: 'hash-1',
            hashingSchemeVersion: 'V2',
          },
        },
      ],
    })

    const result = await prepareAllocationViaFactoryV1(
      {
        transport,
        actAs: alice,
        readAs: ['Observer::1234' as Party],
      },
      {
        factoryContractId: 'allocation-factory-1',
        choiceArgument: { allocation: 'payload' } as never,
        options: {
          commandId: 'alloc-cmd',
          workflowId: 'workflow-1',
          submissionId: 'submission-1',
        },
      },
    )

    expect(result.preparedTransactionHash).toBe('hash-1')
    expect(transport.calls[0]?.request.body).toMatchObject({
      commands: [
        {
          ExerciseCommand: {
            templateId: AllocationFactoryV1.interfaceId,
            contractId: 'allocation-factory-1',
            choice: 'AllocationFactory_Allocate',
          },
        },
      ],
      actAs: ['Alice::1234'],
      readAs: ['Observer::1234'],
      commandId: 'alloc-cmd',
      workflowId: 'workflow-1',
      submissionId: 'submission-1',
    })
  })
})
