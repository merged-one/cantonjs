import { describe, it, expect, vi } from 'vitest'
import { createLedgerClient } from './createLedgerClient.js'
import type { Transport } from '../transport/types.js'
import type { Party } from '../types/party.js'

function mockTransport(response: unknown = {}): Transport {
  return {
    type: 'mock',
    url: 'http://localhost:7575',
    request: vi.fn().mockResolvedValue(response),
  }
}

const alice = 'Alice::1234' as Party
const templateId = '#my-pkg:Module:Template'

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
        offset: 1,
        nodeId: 0,
        contractId: 'contract-1',
        templateId,
        packageName: 'my-pkg',
        representativePackageId: 'abc123',
        createArgument: { owner: 'Alice', value: 100 },
        signatories: ['Alice::1234'],
        witnessParties: ['Alice::1234'],
        acsDelta: true,
        createdAt: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({
        transaction: {
          updateId: 'u-1',
          events: [{ CreatedEvent: createdEvent }],
          offset: 1,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      })

      const client = createLedgerClient({ transport, actAs: alice })
      const result = await client.createContract(templateId, { owner: 'Alice', value: 100 })

      expect(result.createArgument).toEqual({ owner: 'Alice', value: 100 })
      expect(result.contractId).toBe('contract-1')

      const requestBody = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(requestBody.commands.commands[0].CreateCommand.templateId).toBe(templateId)
    })

    it('throws when no created event in response', async () => {
      const transport = mockTransport({
        transaction: {
          updateId: 'u-1',
          events: [],
          offset: 1,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      })
      const client = createLedgerClient({ transport, actAs: alice })

      await expect(
        client.createContract(templateId, { owner: 'Alice' }),
      ).rejects.toThrow('No created event')
    })
  })

  describe('exerciseChoice', () => {
    it('sends an exercise command and returns the transaction', async () => {
      const transport = mockTransport({
        transaction: {
          updateId: 'u-2',
          events: [
            {
              ArchivedEvent: {
                offset: 2,
                nodeId: 0,
                contractId: 'contract-1',
                templateId,
                packageName: 'my-pkg',
                witnessParties: ['Alice::1234'],
              },
            },
          ],
          offset: 2,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:01Z',
          recordTime: '2026-04-01T00:00:01Z',
        },
      })

      const client = createLedgerClient({ transport, actAs: alice })
      const result = await client.exerciseChoice(
        templateId,
        'contract-1',
        'Transfer',
        { newOwner: 'Bob' },
      )

      expect(result.updateId).toBe('u-2')

      const requestBody = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(requestBody.commands.commands[0].ExerciseCommand.choice).toBe('Transfer')
      expect(requestBody.commands.commands[0].ExerciseCommand.contractId).toBe('contract-1')
    })
  })

  describe('queryContracts', () => {
    it('queries active contracts and extracts JsActiveContract entries', async () => {
      const transport = mockTransport([
        {
          contractEntry: {
            JsActiveContract: {
              createdEvent: {
                offset: 1,
                nodeId: 0,
                contractId: 'c-1',
                templateId,
                packageName: 'my-pkg',
                representativePackageId: 'abc123',
                createArgument: { value: 1 },
                signatories: ['Alice::1234'],
                witnessParties: ['Alice::1234'],
                acsDelta: true,
                createdAt: '2026-04-01T00:00:00Z',
              },
              synchronizerId: 'sync-1',
              reassignmentCounter: 0,
            },
          },
        },
      ])

      const client = createLedgerClient({ transport, actAs: alice })
      const contracts = await client.queryContracts(templateId)

      expect(contracts).toHaveLength(1)
      expect(contracts[0]!.createdEvent.createArgument).toEqual({ value: 1 })
      expect(contracts[0]!.synchronizerId).toBe('sync-1')
    })

    it('filters out non-JsActiveContract entries', async () => {
      const transport = mockTransport([
        { contractEntry: { JsEmpty: {} } },
        {
          contractEntry: {
            JsActiveContract: {
              createdEvent: {
                offset: 1,
                nodeId: 0,
                contractId: 'c-1',
                templateId,
                packageName: 'my-pkg',
                representativePackageId: 'abc123',
                createArgument: {},
                signatories: ['Alice::1234'],
                witnessParties: ['Alice::1234'],
                acsDelta: true,
                createdAt: '2026-04-01T00:00:00Z',
              },
              synchronizerId: 'sync-1',
              reassignmentCounter: 0,
            },
          },
        },
      ])

      const client = createLedgerClient({ transport, actAs: alice })
      const contracts = await client.queryContracts(templateId)

      expect(contracts).toHaveLength(1)
    })

    it('returns empty array when no contracts match', async () => {
      const transport = mockTransport([])
      const client = createLedgerClient({ transport, actAs: alice })

      const contracts = await client.queryContracts(templateId)
      expect(contracts).toEqual([])
    })

    it('uses TemplateFilter for the specified template', async () => {
      const transport = mockTransport([])
      const client = createLedgerClient({ transport, actAs: alice })

      await client.queryContracts(templateId)

      const requestBody = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      const filter =
        requestBody.eventFormat.filtersByParty['Alice::1234'].cumulative[0].identifierFilter
      expect(filter.TemplateFilter.value.templateId).toBe(templateId)
    })
  })

  describe('getLedgerEnd', () => {
    it('returns the current ledger end offset as a number', async () => {
      const transport = mockTransport({ offset: 42 })
      const client = createLedgerClient({ transport, actAs: alice })

      const offset = await client.getLedgerEnd()
      expect(offset).toBe(42)
    })
  })

  describe('getTransactionById', () => {
    it('fetches a transaction by update ID', async () => {
      const transport = mockTransport({
        transaction: {
          updateId: 'u-1',
          events: [],
          offset: 1,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.getTransactionById('u-1')
      expect(result.updateId).toBe('u-1')
    })
  })

  describe('getEventsByContractId', () => {
    it('sends contract ID and requesting parties', async () => {
      const bob = 'Bob::5678' as Party
      const transport = mockTransport({ created: {}, archived: false })
      const client = createLedgerClient({ transport, actAs: alice, readAs: [bob] })

      await client.getEventsByContractId('contract-123')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/events/events-by-contract-id')
      expect(req.body.contractId).toBe('contract-123')
      expect(req.body.requestingParties).toEqual(['Alice::1234', 'Bob::5678'])
    })
  })

  describe('createContract with options', () => {
    it('uses custom commandId and workflowId', async () => {
      const createdEvent = {
        offset: 1, nodeId: 0, contractId: 'c-1', templateId,
        packageName: 'my-pkg', representativePackageId: 'abc',
        createArgument: {}, signatories: ['Alice::1234'],
        witnessParties: ['Alice::1234'], acsDelta: true,
        createdAt: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({
        transaction: {
          updateId: 'u-1', events: [{ CreatedEvent: createdEvent }],
          offset: 1, synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z', recordTime: '2026-04-01T00:00:00Z',
        },
      })

      const client = createLedgerClient({ transport, actAs: alice })
      await client.createContract(templateId, { value: 1 }, {
        commandId: 'my-cmd-id',
        workflowId: 'my-workflow',
      })

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.commands.commandId).toBe('my-cmd-id')
      expect(body.commands.workflowId).toBe('my-workflow')
    })
  })

  describe('readAs parties', () => {
    it('includes readAs in command submissions', async () => {
      const bob = 'Bob::5678' as Party
      const createdEvent = {
        offset: 1, nodeId: 0, contractId: 'c-1', templateId,
        packageName: 'my-pkg', representativePackageId: 'abc',
        createArgument: {}, signatories: ['Alice::1234'],
        witnessParties: ['Alice::1234'], acsDelta: true,
        createdAt: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({
        transaction: {
          updateId: 'u-1', events: [{ CreatedEvent: createdEvent }],
          offset: 1, synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z', recordTime: '2026-04-01T00:00:00Z',
        },
      })

      const client = createLedgerClient({ transport, actAs: alice, readAs: [bob] })
      await client.createContract(templateId, {})

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.commands.readAs).toEqual(['Bob::5678'])
    })
  })
})
