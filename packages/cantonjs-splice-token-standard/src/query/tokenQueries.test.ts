import { createLedgerClient, type ActiveContract, type Party } from 'cantonjs'
import { createMockTransport } from 'cantonjs/testing'
import {
  AllocationInstructionV1,
  AllocationV1,
  AnyContractV1,
  HoldingV1,
} from 'cantonjs-splice-interfaces'
import { describe, expect, it } from 'vitest'
import {
  queryAllocationInstructionsV1,
  queryAllocationsV1,
  queryHoldingsV1,
  queryMetadataContractsV1,
} from './index.js'

function activeContract(
  contractId: string,
  interfaceId: string,
  viewValue: Record<string, unknown>,
): ActiveContract {
  return {
    createdEvent: {
      offset: 1,
      nodeId: 0,
      contractId,
      templateId: '#internal:Splice.Token:ConcreteTemplate',
      packageName: 'internal-splice-template',
      representativePackageId: 'pkg-1',
      createArgument: {},
      signatories: ['Alice::1234'],
      witnessParties: ['Alice::1234'],
      acsDelta: true,
      createdAt: '2026-04-02T00:00:00Z',
      interfaceViews: [
        { interfaceId, viewValue },
        { interfaceId: AnyContractV1.interfaceId, viewValue: {} },
      ],
    },
    synchronizerId: 'sync-1',
    reassignmentCounter: 0,
  }
}

describe('token-standard query helpers', () => {
  it('queries holdings by stable interface id and returns typed views', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/state/active-contracts',
          response: [
            {
              contractEntry: {
                JsActiveContract: activeContract('holding-1', HoldingV1.interfaceId, {
                  owner: 'Alice::1234',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  amount: '10.0000000000',
                  lock: null,
                  meta: { values: { symbol: 'USD' } },
                }),
              },
            },
          ],
        },
      ],
    })

    const client = createLedgerClient({ transport, actAs: 'Alice::1234' as Party })
    const holdings = await queryHoldingsV1(client)

    expect(holdings).toHaveLength(1)
    expect(holdings[0]?.interfaceId).toBe(HoldingV1.interfaceId)
    expect(holdings[0]?.view.owner).toBe('Alice::1234')
    expect(holdings[0]?.view.instrumentId.id).toBe('USD')

    const request = transport.calls[0]?.request
    expect(request?.path).toBe('/v2/state/active-contracts')
    expect(request?.body).toMatchObject({
      eventFormat: {
        filtersByParty: {
          'Alice::1234': {
            cumulative: [
              {
                identifierFilter: {
                  InterfaceFilter: {
                    value: {
                      interfaceId: HoldingV1.interfaceId,
                      includeInterfaceView: true,
                    },
                  },
                },
              },
            ],
          },
        },
      },
    })
  })

  it('queries metadata contracts through AnyContractV1', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/state/active-contracts',
          response: [
            {
              contractEntry: {
                JsActiveContract: activeContract('metadata-1', HoldingV1.interfaceId, {
                  owner: 'Alice::1234',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  amount: '10.0000000000',
                  lock: null,
                  meta: { values: { symbol: 'USD' } },
                }),
              },
            },
          ],
        },
      ],
    })

    const client = createLedgerClient({ transport, actAs: 'Alice::1234' as Party })
    const metadataContracts = await queryMetadataContractsV1(client)

    expect(metadataContracts).toHaveLength(1)
    expect(metadataContracts[0]?.interfaceId).toBe(AnyContractV1.interfaceId)
    expect(metadataContracts[0]?.view).toEqual({})
  })

  it('queries allocation interfaces without relying on internal template ids', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/state/active-contracts',
          response: [
            {
              contractEntry: {
                JsActiveContract: activeContract('allocation-1', AllocationV1.interfaceId, {
                  allocation: {
                    settlement: {
                      executor: 'Alice::1234',
                      settlementRef: { id: 'settlement-1', cid: null },
                      requestedAt: '2026-04-02T00:00:00Z',
                      allocateBefore: '2026-04-02T00:05:00Z',
                      settleBefore: '2026-04-02T00:10:00Z',
                      meta: { values: {} },
                    },
                    transferLegId: 'leg-1',
                    transferLeg: {
                      sender: 'Alice::1234',
                      receiver: 'Bob::5678',
                      amount: '5.0000000000',
                      instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                      meta: { values: {} },
                    },
                  },
                  holdingCids: ['holding-1'],
                  meta: { values: {} },
                }),
              },
            },
            {
              contractEntry: {
                JsActiveContract: activeContract(
                  'allocation-instruction-1',
                  AllocationInstructionV1.interfaceId,
                  {
                    originalInstructionCid: null,
                    allocation: {
                      settlement: {
                        executor: 'Alice::1234',
                        settlementRef: { id: 'settlement-1', cid: null },
                        requestedAt: '2026-04-02T00:00:00Z',
                        allocateBefore: '2026-04-02T00:05:00Z',
                        settleBefore: '2026-04-02T00:10:00Z',
                        meta: { values: {} },
                      },
                      transferLegId: 'leg-1',
                      transferLeg: {
                        sender: 'Alice::1234',
                        receiver: 'Bob::5678',
                        amount: '5.0000000000',
                        instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                        meta: { values: {} },
                      },
                    },
                    pendingActions: [['Alice::1234', 'approve']],
                    requestedAt: '2026-04-02T00:00:00Z',
                    inputHoldingCids: ['holding-1'],
                    meta: { values: {} },
                  },
                ),
              },
            },
          ],
        },
      ],
    })

    const client = createLedgerClient({ transport, actAs: 'Alice::1234' as Party })
    const allocations = await queryAllocationsV1(client)
    const instructions = await queryAllocationInstructionsV1(client)

    expect(allocations).toHaveLength(1)
    expect(allocations[0]?.interfaceId).toBe(AllocationV1.interfaceId)
    expect(allocations[0]?.view.allocation.transferLeg.receiver).toBe('Bob::5678')

    expect(instructions).toHaveLength(1)
    expect(instructions[0]?.interfaceId).toBe(AllocationInstructionV1.interfaceId)
    expect(instructions[0]?.view.pendingActions).toEqual([['Alice::1234', 'approve']])
  })
})
