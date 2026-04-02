import { createLedgerClient, type Party } from 'cantonjs'
import { createMockTransport } from 'cantonjs/testing'
import { TransferFactoryV1, TransferInstructionV1 } from 'cantonjs-splice-interfaces'
import { describe, expect, it } from 'vitest'
import { EMPTY_EXTRA_ARGS } from '../types.js'
import {
  acceptTransferInstructionV1,
  executePreparedTokenSubmission,
  prepareTransferViaFactoryV1,
  transferViaFactoryV1,
} from './index.js'

const transferFactoryArgument = {
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
  extraArgs: EMPTY_EXTRA_ARGS,
} as const

describe('token-standard command helpers', () => {
  it('executes a factory choice through the ledger client using the stable interface id', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/commands/submit-and-wait-for-transaction',
          response: {
            transaction: {
              updateId: 'update-1',
              events: [],
              offset: 10,
              synchronizerId: 'sync-1',
              effectiveAt: '2026-04-02T00:00:00Z',
              recordTime: '2026-04-02T00:00:00Z',
            },
          },
        },
      ],
    })

    const client = createLedgerClient({ transport, actAs: 'Alice::1234' as Party })
    await transferViaFactoryV1(client, {
      factoryContractId: 'factory-1',
      choiceArgument: transferFactoryArgument,
    })

    expect(transport.calls[0]?.request.body).toMatchObject({
      commands: {
        commands: [
          {
            ExerciseCommand: {
              templateId: TransferFactoryV1.interfaceId,
              contractId: 'factory-1',
              choice: 'TransferFactory_Transfer',
            },
          },
        ],
      },
    })
  })

  it('executes a non-factory choice through the stable interface id', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/commands/submit-and-wait-for-transaction',
          response: {
            transaction: {
              updateId: 'update-2',
              events: [],
              offset: 11,
              synchronizerId: 'sync-1',
              effectiveAt: '2026-04-02T00:00:00Z',
              recordTime: '2026-04-02T00:00:00Z',
            },
          },
        },
      ],
    })

    const client = createLedgerClient({ transport, actAs: 'Alice::1234' as Party })
    await acceptTransferInstructionV1(client, {
      instructionContractId: 'instruction-1',
      choiceArgument: { extraArgs: EMPTY_EXTRA_ARGS },
    })

    expect(transport.calls[0]?.request.body).toMatchObject({
      commands: {
        commands: [
          {
            ExerciseCommand: {
              templateId: TransferInstructionV1.interfaceId,
              contractId: 'instruction-1',
              choice: 'TransferInstruction_Accept',
            },
          },
        ],
      },
    })
  })

  it('prepares and executes external-party submissions through participant interactive submission', async () => {
    const transport = createMockTransport({
      matchers: [
        {
          method: 'POST',
          path: '/v2/interactive-submission/prepare',
          response: {
            preparedTransaction: 'prepared-transfer',
            preparedTransactionHash: 'hash-1',
            hashingSchemeVersion: 'V2',
          },
        },
        {
          method: 'POST',
          path: '/v2/interactive-submission/execute',
          response: {
            transaction: {
              updateId: 'update-3',
              events: [],
              offset: 12,
              synchronizerId: 'sync-1',
              effectiveAt: '2026-04-02T00:00:00Z',
              recordTime: '2026-04-02T00:00:00Z',
            },
          },
        },
      ],
    })

    const prepared = await prepareTransferViaFactoryV1(
      {
        transport,
        actAs: 'Alice::1234' as Party,
        readAs: ['Observer::9999' as Party],
      },
      {
        factoryContractId: 'factory-1',
        choiceArgument: transferFactoryArgument,
        options: {
          commandId: 'cmd-1',
          workflowId: 'workflow-1',
          submissionId: 'submission-1',
        },
      },
    )

    const executed = await executePreparedTokenSubmission(
      { transport },
      prepared.preparedTransaction,
      [
        {
          party: 'Alice::1234',
          signatures: [{ format: 'RAW', signature: 'signature-1', signedBy: 'key-1' }],
        },
      ],
      { submissionId: 'submission-1' },
    )

    expect(prepared.preparedTransactionHash).toBe('hash-1')
    expect(executed.updateId).toBe('update-3')

    expect(transport.calls[0]?.request.body).toMatchObject({
      commands: [
        {
          ExerciseCommand: {
            templateId: TransferFactoryV1.interfaceId,
            contractId: 'factory-1',
            choice: 'TransferFactory_Transfer',
          },
        },
      ],
      actAs: ['Alice::1234'],
      readAs: ['Observer::9999'],
      commandId: 'cmd-1',
      workflowId: 'workflow-1',
      submissionId: 'submission-1',
    })

    expect(transport.calls[1]?.request).toMatchObject({
      path: '/v2/interactive-submission/execute',
      body: {
        preparedTransaction: 'prepared-transfer',
        submissionId: 'submission-1',
      },
    })
  })
})
