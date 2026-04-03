import type { ActiveContract } from 'cantonjs'
import { AnyContractV1, HoldingV1 } from 'cantonjs-splice-interfaces'
import { describe, expect, it, vi } from 'vitest'
import {
  buildInterfaceEventFormat,
  extractInterfaceView,
  queryInterfaceContracts,
  toTokenInterfaceContract,
} from './internal.js'

function activeContract(
  contractId: string,
  interfaceViews: ActiveContract['createdEvent']['interfaceViews'],
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
      interfaceViews,
    },
    synchronizerId: 'sync-1',
    reassignmentCounter: 0,
  }
}

describe('token-standard query internals', () => {
  it('builds a verbose event format for every requesting party', () => {
    expect(buildInterfaceEventFormat(
      ['Alice::1234', 'Observer::9999'],
      HoldingV1.interfaceId,
    )).toEqual({
      filtersByParty: {
        'Alice::1234': {
          cumulative: [
            {
              identifierFilter: {
                InterfaceFilter: {
                  value: {
                    interfaceId: HoldingV1.interfaceId,
                    includeInterfaceView: true,
                    includeCreatedEventBlob: false,
                  },
                },
              },
            },
          ],
        },
        'Observer::9999': {
          cumulative: [
            {
              identifierFilter: {
                InterfaceFilter: {
                  value: {
                    interfaceId: HoldingV1.interfaceId,
                    includeInterfaceView: true,
                    includeCreatedEventBlob: false,
                  },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    })
  })

  it('extracts matching interface views and rejects missing ones', () => {
    const contract = activeContract('holding-1', [
      { interfaceId: AnyContractV1.interfaceId, viewValue: {} },
      {
        interfaceId: HoldingV1.interfaceId,
        viewValue: {
          owner: 'Alice::1234',
          instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
          amount: '10.0',
          lock: null,
          meta: { values: {} },
        },
      },
    ])

    expect(extractInterfaceView(contract, HoldingV1)?.owner).toBe('Alice::1234')
    expect(extractInterfaceView(contract, AnyContractV1)).toEqual({})
    expect(toTokenInterfaceContract(contract, HoldingV1)?.interfaceId).toBe(HoldingV1.interfaceId)
    expect(toTokenInterfaceContract(activeContract('holding-2', []), HoldingV1)).toBeUndefined()
  })

  it('queries contracts with merged actAs/readAs parties and filters contracts without the interface view', async () => {
    const queryContracts = vi.fn().mockResolvedValue([
      activeContract('holding-1', [
        {
          interfaceId: HoldingV1.interfaceId,
          viewValue: {
            owner: 'Alice::1234',
            instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
            amount: '10.0',
            lock: null,
            meta: { values: {} },
          },
        },
      ]),
      activeContract('holding-2', [
        { interfaceId: AnyContractV1.interfaceId, viewValue: {} },
      ]),
    ])
    const signal = new AbortController().signal

    const contracts = await queryInterfaceContracts(
      {
        actAs: 'Alice::1234',
        readAs: ['Observer::9999'],
        queryContracts,
        exerciseChoice: vi.fn(),
      },
      HoldingV1,
      {
        activeAtOffset: 10,
        signal,
      },
    )

    expect(queryContracts).toHaveBeenCalledWith(HoldingV1.interfaceId, {
      activeAtOffset: 10,
      signal,
      eventFormat: buildInterfaceEventFormat(
        ['Alice::1234', 'Observer::9999'],
        HoldingV1.interfaceId,
      ),
    })
    expect(contracts).toHaveLength(1)
    expect(contracts[0]?.createdEvent.contractId).toBe('holding-1')
  })

  it('uses only actAs when the ledger client has no readAs parties', async () => {
    const queryContracts = vi.fn().mockResolvedValue([])

    await queryInterfaceContracts(
      {
        actAs: 'Alice::1234',
        queryContracts,
        exerciseChoice: vi.fn(),
      },
      HoldingV1,
    )

    expect(queryContracts).toHaveBeenCalledWith(HoldingV1.interfaceId, {
      activeAtOffset: undefined,
      signal: undefined,
      eventFormat: buildInterfaceEventFormat(['Alice::1234'], HoldingV1.interfaceId),
    })
  })
})
