import type { JsTransaction, TaggedUpdate } from 'cantonjs'
import {
  AllocationV1,
  AnyContractV1,
  HoldingV1,
  TransferInstructionV1,
} from 'cantonjs-splice-interfaces'
import { describe, expect, it } from 'vitest'
import {
  parseTokenStandardHistoryFromTransactionV1,
  parseTokenStandardHistoryFromUpdatesV1,
} from './index.js'

function transactionFixture(): JsTransaction {
  return {
    updateId: 'update-1',
    offset: 42,
    synchronizerId: 'sync-1',
    effectiveAt: '2026-04-02T00:00:00Z',
    recordTime: '2026-04-02T00:00:01Z',
    events: [
      {
        CreatedEvent: {
          offset: 42,
          nodeId: 0,
          contractId: 'transfer-1',
          templateId: '#internal:Splice.Token:TransferInstructionTemplate',
          packageName: 'internal-splice-template',
          representativePackageId: 'pkg-1',
          createArgument: {},
          signatories: ['Alice::1234'],
          witnessParties: ['Alice::1234'],
          acsDelta: true,
          createdAt: '2026-04-02T00:00:00Z',
          interfaceViews: [
            {
              interfaceId: TransferInstructionV1.interfaceId,
              viewValue: {
                originalInstructionCid: null,
                transfer: {
                  sender: 'Alice::1234',
                  receiver: 'Bob::5678',
                  amount: '10.0000000000',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  requestedAt: '2026-04-02T00:00:00Z',
                  executeBefore: '2026-04-02T00:05:00Z',
                  inputHoldingCids: ['holding-1'],
                  meta: { values: {} },
                },
                status: { tag: 'TransferPendingReceiverAcceptance' },
                meta: { values: {} },
              },
            },
            {
              interfaceId: AnyContractV1.interfaceId,
              viewValue: {},
            },
          ],
        },
      },
      {
        ExercisedEvent: {
          offset: 42,
          nodeId: 1,
          contractId: 'allocation-1',
          templateId: '#internal:Splice.Token:AllocationTemplate',
          choice: 'Allocation_ExecuteTransfer',
          choiceArgument: {
            extraArgs: {
              context: { values: {} },
              meta: { values: { reason: 'settlement' } },
            },
          },
          consuming: true,
          lastDescendantNodeId: 1,
          packageName: 'internal-splice-template',
          acsDelta: true,
          actingParties: ['Alice::1234'],
          witnessParties: ['Alice::1234'],
          interfaceId: AllocationV1.interfaceId,
          exerciseResult: {
            senderHoldingCids: ['holding-change-1'],
            receiverHoldingCids: ['holding-2'],
            meta: { values: {} },
          },
        },
      },
      {
        ArchivedEvent: {
          offset: 42,
          nodeId: 2,
          contractId: 'holding-1',
          templateId: '#internal:Splice.Token:HoldingTemplate',
          packageName: 'internal-splice-template',
          witnessParties: ['Alice::1234'],
          implementedInterfaces: [HoldingV1.interfaceId, AnyContractV1.interfaceId],
        },
      },
      {
        ExercisedEvent: {
          offset: 42,
          nodeId: 3,
          contractId: 'ignored-1',
          templateId: '#internal:Splice.Token:ConcreteChoiceTemplate',
          choice: 'IgnoredChoice',
          choiceArgument: {},
          consuming: false,
          lastDescendantNodeId: 3,
          packageName: 'internal-splice-template',
          acsDelta: false,
          actingParties: ['Alice::1234'],
          witnessParties: ['Alice::1234'],
          implementedInterfaces: ['#not-token-standard:Pkg:Interface'],
        },
      },
    ],
  }
}

describe('token-standard history parsing', () => {
  it('parses fixture updates into stable token-standard history items', () => {
    const updates: readonly TaggedUpdate[] = [
      { OffsetCheckpoint: { value: { offset: 41 } } },
      { Transaction: { value: transactionFixture() } },
    ]

    const history = parseTokenStandardHistoryFromUpdatesV1(updates)

    expect(history).toEqual([
      expect.objectContaining({
        kind: 'created',
        interfaceId: TransferInstructionV1.interfaceId,
        contractId: 'transfer-1',
      }),
      expect.objectContaining({
        kind: 'created',
        interfaceId: AnyContractV1.interfaceId,
        contractId: 'transfer-1',
      }),
      expect.objectContaining({
        kind: 'exercised',
        interfaceId: AllocationV1.interfaceId,
        choice: 'Allocation_ExecuteTransfer',
      }),
      expect.objectContaining({
        kind: 'archived',
        interfaceId: HoldingV1.interfaceId,
        contractId: 'holding-1',
      }),
      expect.objectContaining({
        kind: 'archived',
        interfaceId: AnyContractV1.interfaceId,
        contractId: 'holding-1',
      }),
    ])
  })

  it('can infer an exercised interface id from implemented interfaces when there is one stable match', () => {
    const transaction: JsTransaction = {
      ...transactionFixture(),
      events: [
        {
          ExercisedEvent: {
            offset: 42,
            nodeId: 4,
            contractId: 'holding-1',
            templateId: '#internal:Splice.Token:HoldingTemplate',
            choice: 'HoldingMaintenance',
            choiceArgument: {},
            consuming: false,
            lastDescendantNodeId: 4,
            packageName: 'internal-splice-template',
            acsDelta: false,
            actingParties: ['Alice::1234'],
            witnessParties: ['Alice::1234'],
            implementedInterfaces: [HoldingV1.interfaceId],
          },
        },
      ],
    }

    expect(parseTokenStandardHistoryFromTransactionV1(transaction)).toEqual([
      expect.objectContaining({
        kind: 'exercised',
        interfaceId: HoldingV1.interfaceId,
        choice: 'HoldingMaintenance',
      }),
    ])
  })

  it('ignores unsupported and ambiguous token-standard history events', () => {
    const fixture = transactionFixture()
    const createdEvent = fixture.events[0]
    const archivedEvent = fixture.events[2]
    const exercisedEvent = fixture.events[1]

    if (
      !createdEvent ||
      !('CreatedEvent' in createdEvent) ||
      !archivedEvent ||
      !('ArchivedEvent' in archivedEvent) ||
      !exercisedEvent ||
      !('ExercisedEvent' in exercisedEvent)
    ) {
      throw new Error('Unexpected token-standard fixture shape')
    }

    const transaction: JsTransaction = {
      ...fixture,
      events: [
        {
          CreatedEvent: {
            ...createdEvent.CreatedEvent,
            interfaceViews: [
              { interfaceId: '#unsupported:Pkg:Interface', viewValue: {} },
            ],
          },
        },
        {
          ArchivedEvent: {
            ...archivedEvent.ArchivedEvent,
            implementedInterfaces: ['#unsupported:Pkg:Interface'],
          },
        },
        {
          ExercisedEvent: {
            ...exercisedEvent.ExercisedEvent,
            interfaceId: undefined,
            implementedInterfaces: [HoldingV1.interfaceId, AllocationV1.interfaceId],
          },
        },
      ],
    }

    expect(parseTokenStandardHistoryFromTransactionV1(transaction)).toEqual([])
  })

  it('handles missing interface view and implemented interface collections', () => {
    const transaction: JsTransaction = {
      ...transactionFixture(),
      events: [
        {
          CreatedEvent: {
            ...transactionFixture().events[0]!.CreatedEvent,
            interfaceViews: undefined,
          },
        },
        {
          ArchivedEvent: {
            ...transactionFixture().events[2]!.ArchivedEvent,
            implementedInterfaces: undefined,
          },
        },
        {
          ExercisedEvent: {
            ...transactionFixture().events[1]!.ExercisedEvent,
            interfaceId: AllocationV1.interfaceId,
            implementedInterfaces: undefined,
          },
        },
      ],
    }

    expect(parseTokenStandardHistoryFromTransactionV1(transaction)).toEqual([
      expect.objectContaining({
        kind: 'exercised',
        interfaceId: AllocationV1.interfaceId,
      }),
    ])
  })

  it('ignores exercised events when implemented interfaces are absent and no direct interface id is present', () => {
    const transaction: JsTransaction = {
      ...transactionFixture(),
      events: [
        {
          ExercisedEvent: {
            ...transactionFixture().events[1]!.ExercisedEvent,
            interfaceId: undefined,
            implementedInterfaces: undefined,
          },
        },
      ],
    }

    expect(parseTokenStandardHistoryFromTransactionV1(transaction)).toEqual([])
  })
})
