/**
 * Factory for creating a party-scoped Ledger API client.
 *
 * The LedgerClient provides contract operations: create, exercise, query, stream.
 * Each client is scoped to a party via its JWT token.
 */

import type { Transport, TransportRequest } from '../transport/types.js'
import type { Party } from '../types/party.js'
import type { TemplateId, ContractId, CreatedEvent, Contract } from '../types/contract.js'
import type { Transaction, TransactionTree } from '../types/transaction.js'
import type { LedgerOffset } from '../types/command.js'

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
  createContract: <TPayload extends Record<string, unknown>>(
    templateId: TemplateId,
    payload: TPayload,
    options?: CommandOptions,
  ) => Promise<CreatedEvent<TPayload>>

  /** Exercise a choice on an existing contract. */
  exerciseChoice: (
    templateId: TemplateId,
    contractId: ContractId,
    choice: string,
    argument: Record<string, unknown>,
    options?: CommandOptions,
  ) => Promise<Transaction>

  /** Query active contracts matching a template and optional filter. */
  queryContracts: <TPayload extends Record<string, unknown>>(
    templateId: TemplateId,
    filter?: Record<string, unknown>,
    options?: QueryOptions,
  ) => Promise<readonly Contract<TPayload>[]>

  /** Get a transaction by its update ID. */
  getTransactionById: (updateId: string) => Promise<Transaction>

  /** Get a transaction tree by its update ID. */
  getTransactionTreeById: (updateId: string) => Promise<TransactionTree>

  /** Get the current ledger end offset. */
  getLedgerEnd: () => Promise<LedgerOffset>

  /** Get events for a specific contract. */
  getEventsByContractId: (
    contractId: ContractId,
  ) => Promise<{ created?: CreatedEvent; archived?: boolean }>
}

export type CommandOptions = {
  readonly commandId?: string
  readonly workflowId?: string
  readonly signal?: AbortSignal
}

export type QueryOptions = {
  readonly signal?: AbortSignal
}

export function createLedgerClient(config: LedgerClientConfig): LedgerClient {
  const { transport, actAs, readAs = [] } = config

  return {
    actAs,
    readAs,

    async createContract(templateId, payload, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-transaction',
        body: {
          commands: {
            actAs: [actAs],
            readAs,
            commandId: options?.commandId ?? globalThis.crypto.randomUUID(),
            commands: [
              {
                CreateCommand: {
                  templateId: parseTemplateId(templateId),
                  createArguments: payload,
                },
              },
            ],
          },
        },
      }
      if (options?.signal) request.signal = options.signal
      const response = await transport.request<{ transaction: Transaction }>(request)

      const created = response.transaction.events.find(
        (e): e is CreatedEvent => 'payload' in e && 'signatories' in e,
      )
      if (created === undefined) {
        throw new Error('No created event in transaction response')
      }
      return created as CreatedEvent<typeof payload>
    },

    async exerciseChoice(templateId, contractId, choice, argument, options) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/commands/submit-and-wait-for-transaction',
        body: {
          commands: {
            actAs: [actAs],
            readAs,
            commandId: options?.commandId ?? globalThis.crypto.randomUUID(),
            commands: [
              {
                ExerciseCommand: {
                  templateId: parseTemplateId(templateId),
                  contractId,
                  choice,
                  choiceArgument: argument,
                },
              },
            ],
          },
        },
      }
      if (options?.signal) request.signal = options.signal
      const response = await transport.request<{ transaction: Transaction }>(request)

      return response.transaction
    },

    async queryContracts<TPayload extends Record<string, unknown>>(templateId: TemplateId, _filter?: Record<string, unknown>, options?: QueryOptions) {
      const request: TransportRequest = {
        method: 'POST',
        path: '/v2/state/active-contracts',
        body: {
          filter: {
            filtersByParty: {
              [actAs]: {
                filters: [
                  {
                    templateFilter: {
                      templateId: parseTemplateId(templateId),
                    },
                  },
                ],
              },
            },
          },
          activeAtOffset: '',
        },
      }
      if (options?.signal) request.signal = options.signal
      const response = await transport.request<{
        activeContracts: readonly CreatedEvent[]
      }>(request)

      const contracts = (response.activeContracts ?? []).map((event) => ({
        templateId: event.templateId,
        contractId: event.contractId,
        payload: event.payload,
        signatories: event.signatories,
        observers: event.observers,
        createdAt: event.createdAt,
      }))
      return contracts as unknown as readonly Contract<TPayload>[]
    },

    async getTransactionById(updateId) {
      return transport.request<Transaction>({
        method: 'POST',
        path: '/v2/updates/transaction-by-id',
        body: { updateId, requestingParties: [actAs, ...readAs] },
      })
    },

    async getTransactionTreeById(updateId) {
      const response = await transport.request<{ transaction: TransactionTree }>({
        method: 'POST',
        path: `/v2/updates/transaction-tree-by-id/${updateId}`,
        body: { requestingParties: [actAs, ...readAs] },
      })
      return response.transaction
    },

    async getLedgerEnd() {
      const response = await transport.request<{ offset: string }>({
        method: 'GET',
        path: '/v2/state/ledger-end',
      })
      return response.offset as LedgerOffset
    },

    async getEventsByContractId(contractId) {
      return transport.request({
        method: 'POST',
        path: '/v2/events/events-by-contract-id',
        body: { contractId, requestingParties: [actAs, ...readAs] },
      })
    },
  }
}

function parseTemplateId(templateId: TemplateId): {
  packageId: string
  moduleName: string
  entityName: string
} {
  const parts = templateId.split(':')
  if (parts.length !== 3 || parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) {
    throw new Error(`Invalid template ID: ${templateId}. Expected format: packageId:moduleName:entityName`)
  }
  return {
    packageId: parts[0],
    moduleName: parts[1],
    entityName: parts[2],
  }
}
