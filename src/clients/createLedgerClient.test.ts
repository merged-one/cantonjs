import { describe, it, expect, vi } from 'vitest'
import { createLedgerClient } from './createLedgerClient.js'
import type { Transport } from '../transport/types.js'
import type { Party } from '../types/party.js'
import type { TemplateId, ContractId } from '../types/contract.js'

function mockTransport(response: unknown = {}): Transport {
  return {
    type: 'mock',
    url: 'http://localhost:7575',
    request: vi.fn().mockResolvedValue(response),
  }
}

const alice = 'Alice::1234' as Party
const templateId = 'pkg:Module:Template' as TemplateId

describe('createLedgerClient', () => {
  it('creates a client with actAs and readAs', () => {
    const transport = mockTransport()
    const client = createLedgerClient({ transport, actAs: alice })

    expect(client.actAs).toBe(alice)
    expect(client.readAs).toEqual([])
  })

  it('stores readAs parties', () => {
    const bob = 'Bob::5678' as Party
    const transport = mockTransport()
    const client = createLedgerClient({ transport, actAs: alice, readAs: [bob] })

    expect(client.readAs).toEqual([bob])
  })

  describe('createContract', () => {
    it('sends a create command and returns the created event', async () => {
      const createdEvent = {
        templateId,
        contractId: 'contract-1',
        payload: { owner: 'Alice', value: 100 },
        signatories: ['Alice::1234'],
        observers: [],
        createdAt: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({
        transaction: {
          events: [createdEvent],
        },
      })

      const client = createLedgerClient({ transport, actAs: alice })
      const result = await client.createContract(templateId, { owner: 'Alice', value: 100 })

      expect(result.payload).toEqual({ owner: 'Alice', value: 100 })
      expect(result.contractId).toBe('contract-1')

      expect(transport.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v2/commands/submit-and-wait-for-transaction',
        }),
      )
    })

    it('throws when no created event in response', async () => {
      const transport = mockTransport({ transaction: { events: [] } })
      const client = createLedgerClient({ transport, actAs: alice })

      await expect(
        client.createContract(templateId, { owner: 'Alice' }),
      ).rejects.toThrow('No created event')
    })
  })

  describe('exerciseChoice', () => {
    it('sends an exercise command', async () => {
      const transaction = {
        updateId: 'update-1',
        events: [],
      }

      const transport = mockTransport({ transaction })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.exerciseChoice(
        templateId,
        'contract-1' as ContractId,
        'Transfer',
        { newOwner: 'Bob' },
      )

      expect(result.updateId).toBe('update-1')

      const requestBody = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(requestBody.commands.commands[0].ExerciseCommand.choice).toBe('Transfer')
    })
  })

  describe('queryContracts', () => {
    it('queries active contracts for a template', async () => {
      const transport = mockTransport({
        activeContracts: [
          {
            templateId,
            contractId: 'c-1',
            payload: { value: 1 },
            signatories: ['Alice::1234'],
            observers: [],
            createdAt: '2026-04-01T00:00:00Z',
          },
        ],
      })

      const client = createLedgerClient({ transport, actAs: alice })
      const contracts = await client.queryContracts(templateId)

      expect(contracts).toHaveLength(1)
      expect(contracts[0]!.payload).toEqual({ value: 1 })
    })

    it('returns empty array when no contracts match', async () => {
      const transport = mockTransport({ activeContracts: [] })
      const client = createLedgerClient({ transport, actAs: alice })

      const contracts = await client.queryContracts(templateId)
      expect(contracts).toEqual([])
    })
  })

  describe('getLedgerEnd', () => {
    it('returns the current ledger end offset', async () => {
      const transport = mockTransport({ offset: '42' })
      const client = createLedgerClient({ transport, actAs: alice })

      const offset = await client.getLedgerEnd()
      expect(offset).toBe('42')
    })
  })

  describe('getTransactionById', () => {
    it('fetches a transaction by update ID', async () => {
      const transaction = { updateId: 'u-1', events: [] }
      const transport = mockTransport(transaction)
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.getTransactionById('u-1')
      expect(result.updateId).toBe('u-1')
    })
  })
})
