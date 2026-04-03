import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TransferFactoryV1,
  WalletUserProxy,
} from 'cantonjs-splice-interfaces'
import type { PartySignatures, PrepareSubmissionResponse, Transport } from 'cantonjs'
import {
  executePreparedTokenSubmissionWithTransport,
  prepareTokenStandardChoice,
  submitTokenStandardChoice,
} from './common.js'
import { EMPTY_EXTRA_ARGS } from '../types.js'

const randomUUID = vi.fn(() => 'generated-command-id')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('token-standard common command helpers', () => {
  it('submits template and interface choices through the expected descriptor identifiers', async () => {
    const exerciseChoice = vi.fn().mockResolvedValue({ updateId: 'update-1' })
    const client = {
      actAs: 'Alice::1234',
      queryContracts: vi.fn(),
      exerciseChoice,
    }

    await submitTokenStandardChoice(
      client,
      WalletUserProxy,
      {
        contractId: 'factory-1',
        choice: 'WalletUserProxy_PublicFetch',
        choiceArgument: {} as never,
      },
    )
    await submitTokenStandardChoice(
      client,
      TransferFactoryV1,
      {
        contractId: 'transfer-factory-1',
        choice: 'TransferFactory_Transfer',
        choiceArgument: {
          expectedAdmin: 'Validator::admin',
          transfer: {
            sender: 'Alice::1234',
            receiver: 'Bob::5678',
            amount: '1.0',
            instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
            requestedAt: '2026-04-02T00:00:00Z',
            executeBefore: '2026-04-02T00:05:00Z',
            inputHoldingCids: ['holding-1'],
            meta: { values: {} },
          },
          extraArgs: EMPTY_EXTRA_ARGS,
        },
      },
    )

    expect(exerciseChoice).toHaveBeenNthCalledWith(
      1,
      WalletUserProxy.templateId,
      'factory-1',
      'WalletUserProxy_PublicFetch',
      expect.any(Object),
      undefined,
    )
    expect(exerciseChoice).toHaveBeenNthCalledWith(
      2,
      TransferFactoryV1.interfaceId,
      'transfer-factory-1',
      'TransferFactory_Transfer',
      expect.any(Object),
      undefined,
    )
  })

  it('prepares interactive submissions with generated command ids and optional signals', async () => {
    const transport = {
      request: vi.fn<Transport['request']>().mockResolvedValue({
        preparedTransaction: 'prepared',
        preparedTransactionHash: 'hash-1',
        hashingSchemeVersion: 'V2',
      } satisfies PrepareSubmissionResponse),
    }
    const signal = new AbortController().signal
    vi.stubGlobal('crypto', { randomUUID })

    await prepareTokenStandardChoice(
      {
        transport,
        actAs: 'Alice::1234',
      },
      TransferFactoryV1,
      {
        contractId: 'factory-1',
        choice: 'TransferFactory_Transfer',
        choiceArgument: {
          expectedAdmin: 'Validator::admin',
          transfer: {
            sender: 'Alice::1234',
            receiver: 'Bob::5678',
            amount: '1.0',
            instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
            requestedAt: '2026-04-02T00:00:00Z',
            executeBefore: '2026-04-02T00:05:00Z',
            inputHoldingCids: ['holding-1'],
            meta: { values: {} },
          },
          extraArgs: EMPTY_EXTRA_ARGS,
        },
        options: {
          signal,
        },
      },
    )

    expect(randomUUID).toHaveBeenCalledTimes(1)
    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v2/interactive-submission/prepare',
      signal,
      body: {
        commands: [
          {
            ExerciseCommand: {
              templateId: TransferFactoryV1.interfaceId,
              contractId: 'factory-1',
              choice: 'TransferFactory_Transfer',
              choiceArgument: {
                expectedAdmin: 'Validator::admin',
                transfer: {
                  sender: 'Alice::1234',
                  receiver: 'Bob::5678',
                  amount: '1.0',
                  instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
                  requestedAt: '2026-04-02T00:00:00Z',
                  executeBefore: '2026-04-02T00:05:00Z',
                  inputHoldingCids: ['holding-1'],
                  meta: { values: {} },
                },
                extraArgs: EMPTY_EXTRA_ARGS,
              },
            },
          },
        ],
        commandId: 'generated-command-id',
        actAs: ['Alice::1234'],
        readAs: undefined,
        workflowId: undefined,
        synchronizerId: undefined,
        submissionId: undefined,
      },
    })
  })

  it('executes prepared submissions with optional submission ids and signals', async () => {
    const transaction = { updateId: 'update-2' }
    const transport = {
      request: vi.fn<Transport['request']>().mockResolvedValue({ transaction }),
    }
    const signal = new AbortController().signal
    const partySignatures: readonly PartySignatures[] = [
      {
        party: 'Alice::1234',
        signatures: [{ format: 'RAW', signature: 'sig-1', signedBy: 'key-1' }],
      },
    ]

    await expect(
      executePreparedTokenSubmissionWithTransport(
        { transport },
        'prepared-blob',
        partySignatures,
        {
          submissionId: 'submission-1',
          signal,
        },
      ),
    ).resolves.toBe(transaction)

    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v2/interactive-submission/execute',
      signal,
      body: {
        preparedTransaction: 'prepared-blob',
        partySignatures,
        submissionId: 'submission-1',
      },
    })
  })

  it('falls back to a deterministic command id format and forwards readAs/workflow fields', async () => {
    const transport = {
      request: vi.fn<Transport['request']>().mockResolvedValue({
        preparedTransaction: 'prepared',
        preparedTransactionHash: 'hash-2',
        hashingSchemeVersion: 'V2',
      } satisfies PrepareSubmissionResponse),
    }
    vi.stubGlobal('crypto', {})
    vi.spyOn(Date, 'now').mockReturnValue(1_712_016_000_000)
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    await prepareTokenStandardChoice(
      {
        transport,
        actAs: 'Alice::1234',
        readAs: ['Bob::5678'],
      },
      WalletUserProxy,
      {
        contractId: 'factory-1',
        choice: 'WalletUserProxy_PublicFetch',
        choiceArgument: {} as never,
        options: {
          workflowId: 'workflow-1',
          synchronizerId: 'sync-1',
          submissionId: 'submission-1',
        },
      },
    )

    expect(transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v2/interactive-submission/prepare',
      body: {
        commands: [
          {
            ExerciseCommand: {
              templateId: WalletUserProxy.templateId,
              contractId: 'factory-1',
              choice: 'WalletUserProxy_PublicFetch',
              choiceArgument: {},
            },
          },
        ],
        commandId: `token-standard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        actAs: ['Alice::1234'],
        readAs: ['Bob::5678'],
        workflowId: 'workflow-1',
        synchronizerId: 'sync-1',
        submissionId: 'submission-1',
      },
    })
  })
})
