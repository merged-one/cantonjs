import {
  AllocationV1,
  AnyContractV1,
  HoldingV1,
  TransferFactoryV1,
  TransferInstructionV1,
} from 'cantonjs-splice-interfaces'

export const tokenStandardLedgerFixtures = {
  holdingContracts: [
    {
      contractEntry: {
        JsActiveContract: {
          createdEvent: {
            offset: 1,
            nodeId: 0,
            contractId: 'holding-1',
            templateId: '#internal:Splice.Token:HoldingTemplate',
            packageName: 'internal-splice-template',
            representativePackageId: 'pkg-1',
            createArgument: {},
            signatories: ['Alice::1234'],
            witnessParties: ['Alice::1234'],
            acsDelta: true,
            createdAt: '2026-04-02T00:00:00Z',
            interfaceViews: [
              {
                interfaceId: HoldingV1.interfaceId,
                viewValue: {
                  owner: 'Alice::1234',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  amount: '10.0000000000',
                  lock: null,
                  meta: { values: { symbol: 'USD' } },
                },
              },
              {
                interfaceId: AnyContractV1.interfaceId,
                viewValue: {},
              },
            ],
          },
          synchronizerId: 'sync-1',
          reassignmentCounter: 0,
        },
      },
    },
  ],
  allocationContracts: [
    {
      contractEntry: {
        JsActiveContract: {
          createdEvent: {
            offset: 2,
            nodeId: 1,
            contractId: 'allocation-1',
            templateId: '#internal:Splice.Token:AllocationTemplate',
            packageName: 'internal-splice-template',
            representativePackageId: 'pkg-1',
            createArgument: {},
            signatories: ['Alice::1234'],
            witnessParties: ['Alice::1234'],
            acsDelta: true,
            createdAt: '2026-04-02T00:00:01Z',
            interfaceViews: [
              {
                interfaceId: AllocationV1.interfaceId,
                viewValue: {
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
                },
              },
            ],
          },
          synchronizerId: 'sync-1',
          reassignmentCounter: 0,
        },
      },
    },
  ],
  metadataContracts: [
    {
      contractEntry: {
        JsActiveContract: {
          createdEvent: {
            offset: 3,
            nodeId: 2,
            contractId: 'metadata-1',
            templateId: '#internal:Splice.Token:HoldingTemplate',
            packageName: 'internal-splice-template',
            representativePackageId: 'pkg-1',
            createArgument: {},
            signatories: ['Alice::1234'],
            witnessParties: ['Alice::1234'],
            acsDelta: true,
            createdAt: '2026-04-02T00:00:02Z',
            interfaceViews: [
              {
                interfaceId: HoldingV1.interfaceId,
                viewValue: {
                  owner: 'Alice::1234',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  amount: '1.0000000000',
                  lock: null,
                  meta: { values: { symbol: 'USD' } },
                },
              },
              {
                interfaceId: AnyContractV1.interfaceId,
                viewValue: {},
              },
            ],
          },
          synchronizerId: 'sync-1',
          reassignmentCounter: 0,
        },
      },
    },
  ],
  transferFactoryArgument: {
    expectedAdmin: 'Validator::admin',
    transfer: {
      sender: 'Alice::1234',
      receiver: 'Bob::5678',
      amount: '10.0000000000',
      instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
      requestedAt: '2026-04-02T00:00:00Z',
      executeBefore: '2026-04-02T00:05:00Z',
      inputHoldingCids: ['holding-1'],
      meta: { values: { reference: 'invoice-1' } },
    },
    extraArgs: {
      context: { values: {} },
      meta: { values: {} },
    },
  },
  transferTransaction: {
    updateId: 'update-3',
    offset: 12,
    synchronizerId: 'sync-1',
    effectiveAt: '2026-04-02T00:00:00Z',
    recordTime: '2026-04-02T00:00:00Z',
    events: [
      {
        CreatedEvent: {
          offset: 12,
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
    ],
  },
  expectedFactoryInterfaceId: TransferFactoryV1.interfaceId,
} as const
