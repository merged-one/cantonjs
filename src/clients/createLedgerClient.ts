/**
 * Factory for creating a party-scoped Ledger API client.
 *
 * The LedgerClient provides contract operations: create, exercise, query.
 * Each client is scoped to a party via its JWT token.
 *
 * Request/response shapes match the Canton JSON Ledger API V2 OpenAPI spec (3.4+).
 */

import type { Transport, TransportRequest } from '../transport/types.js'
import type { Party } from '../types/party.js'
import type {
  CreatedEvent,
  TaggedEvent,
  ActiveContract,
  ContractEntry,
} from '../types/contract.js'
import type { JsTransaction } from '../types/transaction.js'
import type { Reassignment, ReassignmentCommand } from '../types/reassignment.js'
import type {
  PrepareSubmissionResponse,
  PartySignatures,
} from '../types/interactive.js'
import type { LedgerOffset, EventFormat, TransactionFormat } from '../types/command.js'

export type LedgerClientConfig = {
  /** Transport to communicate with the Canton node. */
  readonly transport: Transport
  /** The party this client acts as. */
  readonly actAs: Party
  /** Additional parties this client can read as. */
  readonly readAs?: readonly Party[]
}

export type LedgerClient = {
  /** The party this client acts as. */
  readonly actAs: Party
  /** Additional parties this client can read as. */
  readonly readAs: readonly Party[]

  /** Create a new contract on the ledger. */
  createContract: (
    templateId: string,
    createArguments: Record<string, unknown>,
    options?: CommandOptions,
  ) => Promise<CreatedEvent>

  /** Exercise a choice on an existing contract. */
  exerciseChoice: (
    templateId: string,
    contractId: string,
    choice: string,
    choiceArgument: Record<string, unknown>,
    options?: CommandOptions,
  ) => Promise<JsTransaction>

  /** Query active contracts matching a template. */
  queryContracts: (
    templateId: string,
    options?: QueryOptions,
  ) => Promise<readonly ActiveContract[]>

  /** Get a transaction by its update ID. */
  getTransactionById: (updateId: string) => Promise<JsTransaction>

  /** Get the current ledger end offset. */
  getLedgerEnd: () => Promise<LedgerOffset>

  /** Get events for a specific contract. */
  getEventsByContractId: (contractId: string) => Promise<unknown>

  /** Get connected synchronizer IDs. */
  getConnectedSynchronizers: () => Promise<readonly ConnectedSynchronizer[]>

  /** Get the latest pruned offsets. */
  getLatestPrunedOffsets: () => Promise<PrunedOffsets>

  /** Submit a reassignment command and wait for completion. */
  submitReassignment: (
    command: ReassignmentCommand,
    options?: CommandOptions,
  ) => Promise<Reassignment>

  /**
   * Prepare a transaction for external signing.
   * Returns the prepared transaction and hash to sign.
   */
  prepareSubmission: (
    templateId: string,
    createArguments: Record<string, unknown>,
    options?: CommandOptions,
  ) => Promise<PrepareSubmissionResponse>

  /**
   * Execute a previously prepared and externally signed transaction.
   */
  executeSubmission: (
    preparedTransaction: string,
    partySignatures: readonly PartySignatures[],
    options?: { readonly submissionId?: string; readonly signal?: AbortSignal },
  ) => Promise<JsTransaction>
}

/** A connected synchronizer (domain). */
export type ConnectedSynchronizer = {
  readonly synchronizerId: string
  readonly permission: 'SUBMISSION' | 'OBSERVATION' | 'UNSPECIFIED'
}

/** Pruned offset information. */
export type PrunedOffsets = {
  readonly participantPrunedUpToInclusive?: number
  readonly allDivulgedContractsPrunedUpToInclusive?: number
}

export type CommandOptions = {
  readonly commandId?: string
  readonly workflowId?: string
  readonly signal?: AbortSignal
}

export type QueryOptions = {
  readonly signal?: AbortSignal
  /** Event format for filtering. Defaults to verbose wildcard filter for actAs party. */
  readonly eventFormat?: EventFormat
  /** Offset to snapshot at. 0 = empty ledger. Defaults to 0. */
  readonly activeAtOffset?: LedgerOffset
}

/** Generate a random UUID, compatible with Node.js 18+ and browsers. */
function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  // Fallback for Node.js 18 where globalThis.crypto.randomUUID may not exist
  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createLedgerClient(config: LedgerClientConfig): LedgerClient {
  const { transport, actAs, readAs = [] } = config

  function defaultEventFormat(): EventFormat {
    return {
      filtersByParty: {
        [actAs]: {
          cumulative: [
            {
              identifierFilter: {
                WildcardFilter: { value: { includeCreatedEventBlob: false } },
              },
            },
          ],
        },
      },
      verbose: true,
    }
  }

  function templateEventFormat(templateId: string): EventFormat {
    return {
      filtersByParty: {
        [actAs]: {
          cumulative: [
            {
              identifierFilter: {
                TemplateFilter: {
                  value: { templateId, includeCreatedEventBlob: false },
                },
              },
            },
          ],
        },
      },
      verbose: true,
    }
  }

  function defaultTransactionFormat(): TransactionFormat {
    return {
      transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
      eventFormat: defaultEventFormat(),
    }
  }

  return {
    actAs,
    readAs,

    async createContract(templateId, createArguments, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-transaction',
        body: {
          commands: {
            commands: [{ CreateCommand: { templateId, createArguments } }],
            commandId: options?.commandId ?? generateUUID(),
            actAs: [actAs],
            readAs: readAs.length > 0 ? readAs : undefined,
            workflowId: options?.workflowId,
          },
          transactionFormat: defaultTransactionFormat(),
        },
      }
      if (options?.signal) request.signal = options.signal

      const response = await transport.request<{
        transaction: JsTransaction
      }>(request)

      const created = extractCreatedEvent(response.transaction.events)
      if (created === undefined) {
        throw new Error('No created event in transaction response')
      }
      return created
    },

    async exerciseChoice(templateId, contractId, choice, choiceArgument, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-transaction',
        body: {
          commands: {
            commands: [
              { ExerciseCommand: { templateId, contractId, choice, choiceArgument } },
            ],
            commandId: options?.commandId ?? generateUUID(),
            actAs: [actAs],
            readAs: readAs.length > 0 ? readAs : undefined,
            workflowId: options?.workflowId,
          },
          transactionFormat: defaultTransactionFormat(),
        },
      }
      if (options?.signal) request.signal = options.signal

      const response = await transport.request<{
        transaction: JsTransaction
      }>(request)

      return response.transaction
    },

    async queryContracts(templateId, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/state/active-contracts',
        body: {
          activeAtOffset: options?.activeAtOffset ?? 0,
          eventFormat: options?.eventFormat ?? templateEventFormat(templateId),
        },
      }
      if (options?.signal) request.signal = options.signal

      const response = await transport.request<
        readonly { contractEntry: ContractEntry }[]
      >(request)

      return response
        .map((entry) => {
          if ('JsActiveContract' in entry.contractEntry) {
            return entry.contractEntry.JsActiveContract
          }
          return undefined
        })
        .filter((c): c is ActiveContract => c !== undefined)
    },

    async getTransactionById(updateId) {
      const response = await transport.request<{ transaction: JsTransaction }>({
        method: 'POST',
        path: '/v2/updates/transaction-by-id',
        body: {
          updateId,
          requestingParties: [actAs, ...readAs],
        },
      })
      return response.transaction
    },

    async getLedgerEnd() {
      const response = await transport.request<{ offset: number }>({
        method: 'GET',
        path: '/v2/state/ledger-end',
      })
      return response.offset
    },

    async getEventsByContractId(contractId) {
      return transport.request({
        method: 'POST',
        path: '/v2/events/events-by-contract-id',
        body: { contractId, requestingParties: [actAs, ...readAs] },
      })
    },

    async getConnectedSynchronizers() {
      const response = await transport.request<{
        connectedSynchronizers: readonly ConnectedSynchronizer[]
      }>({
        method: 'GET',
        path: '/v2/state/connected-synchronizers',
      })
      return response.connectedSynchronizers ?? []
    },

    async getLatestPrunedOffsets() {
      const response = await transport.request<PrunedOffsets>({
        method: 'GET',
        path: '/v2/state/latest-pruned-offsets',
      })
      return response
    },

    async submitReassignment(command, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-reassignment',
        body: {
          reassignmentCommand: command,
          commandId: options?.commandId ?? generateUUID(),
          submitter: actAs,
          workflowId: options?.workflowId,
        },
      }
      if (options?.signal) request.signal = options.signal

      const response = await transport.request<{ reassignment: Reassignment }>(request)
      return response.reassignment
    },

    async prepareSubmission(templateId, createArguments, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/interactive-submission/prepare',
        body: {
          commands: [{ CreateCommand: { templateId, createArguments } }],
          commandId: options?.commandId ?? generateUUID(),
          actAs: [actAs],
          readAs: readAs.length > 0 ? readAs : undefined,
          workflowId: options?.workflowId,
        },
      }
      if (options?.signal) request.signal = options.signal

      return transport.request<PrepareSubmissionResponse>(request)
    },

    async executeSubmission(preparedTransaction, partySignatures, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/interactive-submission/execute',
        body: {
          preparedTransaction,
          partySignatures,
          submissionId: options?.submissionId,
        },
      }
      if (options?.signal) request.signal = options.signal

      const response = await transport.request<{ transaction: JsTransaction }>(request)
      return response.transaction
    },
  }
}

/** Extract the first CreatedEvent from a list of tagged events. */
function extractCreatedEvent(events: readonly TaggedEvent[]): CreatedEvent | undefined {
  for (const event of events) {
    if ('CreatedEvent' in event) {
      return event.CreatedEvent
    }
  }
  return undefined
}
