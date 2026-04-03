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

    it('forwards AbortSignal when exercising a choice', async () => {
      const transport = mockTransport({
        transaction: {
          updateId: 'u-2',
          events: [],
          offset: 2,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:01Z',
          recordTime: '2026-04-01T00:00:01Z',
        },
      })
      const signal = new AbortController().signal

      const client = createLedgerClient({ transport, actAs: alice })
      await client.exerciseChoice(
        templateId,
        'contract-1',
        'Transfer',
        { newOwner: 'Bob' },
        { signal },
      )

      const request = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(request.signal).toBe(signal)
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

    it('allows callers to override the event format, offset, and signal', async () => {
      const transport = mockTransport([])
      const signal = new AbortController().signal
      const eventFormat = {
        filtersByParty: {
          'Alice::1234': {
            cumulative: [
              {
                identifierFilter: {
                  WildcardFilter: { value: { includeCreatedEventBlob: true } },
                },
              },
            ],
          },
        },
        verbose: false,
      } as const

      const client = createLedgerClient({ transport, actAs: alice })
      await client.queryContracts(templateId, {
        activeAtOffset: 42,
        eventFormat,
        signal,
      })

      const request = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(request.signal).toBe(signal)
      expect(request.body.activeAtOffset).toBe(42)
      expect(request.body.eventFormat).toEqual(eventFormat)
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

    it('falls back to crypto.getRandomValues when randomUUID is unavailable', async () => {
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
      const getRandomValues = vi.fn((bytes: Uint8Array) => {
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = i + 1
        }
        return bytes
      })

      vi.stubGlobal('crypto', { getRandomValues })

      try {
        const client = createLedgerClient({ transport, actAs: alice })
        await client.createContract(templateId, { value: 1 })

        const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
        expect(getRandomValues).toHaveBeenCalledOnce()
        expect(body.commands.commandId).toBe('01020304-0506-4708-890a-0b0c0d0e0f10')
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('falls back to Math.random when crypto randomness is unavailable', async () => {
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
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

      vi.stubGlobal('crypto', undefined)

      try {
        const client = createLedgerClient({ transport, actAs: alice })
        await client.createContract(templateId, { value: 1 })

        const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
        expect(body.commands.commandId).toBe('1f1f1f1f-1f1f-4f1f-9f1f-1f1f1f1f1f1f')
        expect(random).toHaveBeenCalledTimes(16)
      } finally {
        random.mockRestore()
        vi.unstubAllGlobals()
      }
    })
  })

  describe('getConnectedSynchronizers', () => {
    it('returns connected synchronizer list', async () => {
      const transport = mockTransport({
        connectedSynchronizers: [
          { synchronizerId: 'sync-1', permission: 'SUBMISSION' },
          { synchronizerId: 'sync-2', permission: 'OBSERVATION' },
        ],
      })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.getConnectedSynchronizers()
      expect(result).toHaveLength(2)
      expect(result[0]!.synchronizerId).toBe('sync-1')
      expect(result[0]!.permission).toBe('SUBMISSION')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('GET')
      expect(req.path).toBe('/v2/state/connected-synchronizers')
    })

    it('returns empty array when no synchronizers', async () => {
      const transport = mockTransport({})
      const client = createLedgerClient({ transport, actAs: alice })
      const result = await client.getConnectedSynchronizers()
      expect(result).toEqual([])
    })
  })

  describe('getLatestPrunedOffsets', () => {
    it('returns pruned offset information', async () => {
      const transport = mockTransport({
        participantPrunedUpToInclusive: 100,
        allDivulgedContractsPrunedUpToInclusive: 50,
      })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.getLatestPrunedOffsets()
      expect(result.participantPrunedUpToInclusive).toBe(100)
      expect(result.allDivulgedContractsPrunedUpToInclusive).toBe(50)

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('GET')
      expect(req.path).toBe('/v2/state/latest-pruned-offsets')
    })
  })

  describe('submitReassignment', () => {
    it('sends an unassign command and returns the reassignment', async () => {
      const reassignment = {
        updateId: 'r-1',
        offset: 5,
        events: [{
          UnassignedEvent: {
            unassignId: 'unassign-1',
            contractId: 'contract-1',
            templateId,
            packageName: 'my-pkg',
            source: 'sync-1',
            target: 'sync-2',
            submitter: 'Alice::1234',
            reassignmentCounter: 0,
            witnessParties: ['Alice::1234'],
          },
        }],
        recordTime: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({ reassignment })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.submitReassignment(
        { UnassignCommand: { contractId: 'contract-1', source: 'sync-1', target: 'sync-2' } },
      )

      expect(result.updateId).toBe('r-1')
      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/commands/submit-and-wait-for-reassignment')
      expect(req.body.reassignmentCommand.UnassignCommand.contractId).toBe('contract-1')
      expect(req.body.submitter).toBe('Alice::1234')
    })

    it('sends an assign command', async () => {
      const transport = mockTransport({
        reassignment: { updateId: 'r-2', offset: 6, events: [], recordTime: '2026-04-01T00:00:00Z' },
      })
      const client = createLedgerClient({ transport, actAs: alice })

      await client.submitReassignment(
        { AssignCommand: { unassignId: 'unassign-1', source: 'sync-1', target: 'sync-2' } },
      )

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.body.reassignmentCommand.AssignCommand.unassignId).toBe('unassign-1')
    })

    it('forwards command options when submitting reassignments', async () => {
      const transport = mockTransport({
        reassignment: { updateId: 'r-3', offset: 7, events: [], recordTime: '2026-04-01T00:00:00Z' },
      })
      const signal = new AbortController().signal
      const client = createLedgerClient({ transport, actAs: alice })

      await client.submitReassignment(
        { AssignCommand: { unassignId: 'unassign-2', source: 'sync-1', target: 'sync-2' } },
        {
          commandId: 'reassign-cmd',
          workflowId: 'workflow-1',
          signal,
        },
      )

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.signal).toBe(signal)
      expect(req.body.commandId).toBe('reassign-cmd')
      expect(req.body.workflowId).toBe('workflow-1')
    })
  })

  describe('prepareSubmission', () => {
    it('prepares a transaction for external signing', async () => {
      const transport = mockTransport({
        preparedTransaction: 'base64-prepared-tx',
        preparedTransactionHash: 'sha256-hash',
        hashingSchemeVersion: 'V2',
      })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.prepareSubmission(templateId, { owner: 'Alice', value: 100 })

      expect(result.preparedTransaction).toBe('base64-prepared-tx')
      expect(result.preparedTransactionHash).toBe('sha256-hash')
      expect(result.hashingSchemeVersion).toBe('V2')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/interactive-submission/prepare')
      expect(req.body.commands).toEqual([
        { CreateCommand: { templateId, createArguments: { owner: 'Alice', value: 100 } } },
      ])
      expect(req.body.actAs).toEqual(['Alice::1234'])
    })

    it('includes readAs parties and forwards signals for prepared submissions', async () => {
      const bob = 'Bob::5678' as Party
      const transport = mockTransport({
        preparedTransaction: 'prepared',
        preparedTransactionHash: 'hash',
        hashingSchemeVersion: 'V2',
      })
      const signal = new AbortController().signal
      const client = createLedgerClient({ transport, actAs: alice, readAs: [bob] })

      await client.prepareSubmission(templateId, { owner: 'Alice' }, { signal })

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.signal).toBe(signal)
      expect(req.body.readAs).toEqual(['Bob::5678'])
    })
  })

  describe('executeSubmission', () => {
    it('executes a signed transaction', async () => {
      const transaction = {
        updateId: 'u-1',
        events: [],
        offset: 10,
        synchronizerId: 'sync-1',
        effectiveAt: '2026-04-01T00:00:00Z',
        recordTime: '2026-04-01T00:00:00Z',
      }

      const transport = mockTransport({ transaction })
      const client = createLedgerClient({ transport, actAs: alice })

      const result = await client.executeSubmission('base64-prepared-tx', [
        {
          party: 'Alice::1234',
          signatures: [{ format: 'RAW' as const, signature: 'sig-data', signedBy: 'key-1' }],
        },
      ])

      expect(result.updateId).toBe('u-1')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/interactive-submission/execute')
      expect(req.body.preparedTransaction).toBe('base64-prepared-tx')
      expect(req.body.partySignatures).toHaveLength(1)
      expect(req.body.partySignatures[0].party).toBe('Alice::1234')
    })

    it('forwards submission options when executing prepared transactions', async () => {
      const transport = mockTransport({
        transaction: {
          updateId: 'u-2',
          events: [],
          offset: 11,
          synchronizerId: 'sync-1',
          effectiveAt: '2026-04-01T00:00:00Z',
          recordTime: '2026-04-01T00:00:00Z',
        },
      })
      const signal = new AbortController().signal
      const client = createLedgerClient({ transport, actAs: alice })

      await client.executeSubmission(
        'prepared',
        [
          {
            party: 'Alice::1234',
            signatures: [{ format: 'RAW' as const, signature: 'sig-data', signedBy: 'key-1' }],
          },
        ],
        {
          submissionId: 'submission-1',
          signal,
        },
      )

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.signal).toBe(signal)
      expect(req.body.submissionId).toBe('submission-1')
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
