import { createServer } from 'node:http'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createLedgerClient, jsonApi, type Party } from 'cantonjs'
import {
  AllocationV1,
  AnyContractV1,
  HoldingV1,
  TransferInstructionV1,
} from 'cantonjs-splice-interfaces'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseTokenStandardHistoryFromTransactionV1,
  queryAllocationsV1,
  queryHoldingsV1,
  queryMetadataContractsV1,
  transferViaFactoryV1,
} from './index.js'
import { tokenStandardLedgerFixtures } from '../test/tokenStandardLedgerFixtures.js'

type RecordedRequest = {
  readonly method: string
  readonly url: string
  readonly headers: IncomingHttpHeaders
  readonly body: string
}

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.()
  }
})

describe('token-standard ledger fixtures', () => {
  it('queries fixture-backed ledger state and uses stable descriptor ids for commands', async () => {
    const server = await startLedgerFixtureServer()
    const transport = jsonApi({
      url: server.url,
      token: 'participant-jwt',
    })
    const client = createLedgerClient({
      transport,
      actAs: 'Alice::1234' as Party,
    })

    const holdings = await queryHoldingsV1(client)
    const allocations = await queryAllocationsV1(client)
    const metadataContracts = await queryMetadataContractsV1(client)
    await transferViaFactoryV1(client, {
      factoryContractId: 'factory-1',
      choiceArgument: tokenStandardLedgerFixtures.transferFactoryArgument,
    })
    const history = parseTokenStandardHistoryFromTransactionV1(
      tokenStandardLedgerFixtures.transferTransaction,
    )

    expect(holdings[0]?.interfaceId).toBe(HoldingV1.interfaceId)
    expect(holdings[0]?.view.instrumentId.id).toBe('USD')
    expect(allocations[0]?.interfaceId).toBe(AllocationV1.interfaceId)
    expect(allocations[0]?.view.allocation.transferLeg.receiver).toBe('Bob::5678')
    expect(metadataContracts[0]?.interfaceId).toBe(AnyContractV1.interfaceId)
    expect(history).toEqual([
      expect.objectContaining({
        kind: 'created',
        interfaceId: TransferInstructionV1.interfaceId,
        contractId: 'transfer-1',
      }),
      expect.objectContaining({
        kind: 'created',
        interfaceId: AnyContractV1.interfaceId,
        contractId: 'transfer-1',
      }),
    ])

    expect(server.requests.every((request) => request.headers.authorization === 'Bearer participant-jwt'))
      .toBe(true)
    expect(server.requests.map((request) => [request.method, request.url])).toEqual([
      ['POST', '/v2/state/active-contracts'],
      ['POST', '/v2/state/active-contracts'],
      ['POST', '/v2/state/active-contracts'],
      ['POST', '/v2/commands/submit-and-wait-for-transaction'],
    ])

    const commandRequest = parseRequestBody(server.requests[3]?.body)
    expect(commandRequest).toMatchObject({
      commands: {
        commands: [
          {
            ExerciseCommand: {
              templateId: tokenStandardLedgerFixtures.expectedFactoryInterfaceId,
              contractId: 'factory-1',
              choice: 'TransferFactory_Transfer',
            },
          },
        ],
      },
    })
  })
})

async function startLedgerFixtureServer(): Promise<{
  readonly url: string
  readonly requests: RecordedRequest[]
}> {
  const requests: RecordedRequest[] = []
  const server = createServer(async (request, response) => {
    const body = await readBody(request)
    requests.push({
      method: request.method ?? 'GET',
      url: request.url ?? '/',
      headers: request.headers,
      body,
    })

    await routeLedgerFixtureRequest(request, response, body)
  })

  await new Promise<void>((resolve) => {
    server.listen(0, resolve)
  })

  cleanups.push(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  })

  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Unable to resolve ledger fixture server address')
  }

  return {
    url: `http://localhost:${(address as AddressInfo).port}`,
    requests,
  }
}

async function routeLedgerFixtureRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  body: string,
): Promise<void> {
  if (request.method === 'POST' && request.url === '/v2/state/active-contracts') {
    const interfaceId = extractInterfaceId(parseRequestBody(body))

    if (interfaceId === HoldingV1.interfaceId) {
      respondJson(response, tokenStandardLedgerFixtures.holdingContracts)
      return
    }

    if (interfaceId === AllocationV1.interfaceId) {
      respondJson(response, tokenStandardLedgerFixtures.allocationContracts)
      return
    }

    if (interfaceId === AnyContractV1.interfaceId) {
      respondJson(response, tokenStandardLedgerFixtures.metadataContracts)
      return
    }

    respondJson(response, [])
    return
  }

  if (request.method === 'POST' && request.url === '/v2/commands/submit-and-wait-for-transaction') {
    respondJson(response, {
      transaction: tokenStandardLedgerFixtures.transferTransaction,
    })
    return
  }

  respondJson(response, { error: 'not found' }, 404)
}

function extractInterfaceId(body: unknown): string | undefined {
  const candidate = body as {
    eventFormat?: {
      filtersByParty?: Record<string, {
        cumulative?: Array<{
          identifierFilter?: {
            InterfaceFilter?: {
              value?: {
                interfaceId?: string
              }
            }
          }
        }>
      }>
    }
  }

  return candidate.eventFormat?.filtersByParty?.['Alice::1234']?.cumulative?.[0]?.identifierFilter
    ?.InterfaceFilter?.value?.interfaceId
}

function respondJson(
  response: ServerResponse<IncomingMessage>,
  body: unknown,
  statusCode = 200,
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function parseRequestBody(body: string): unknown {
  return JSON.parse(body)
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}
