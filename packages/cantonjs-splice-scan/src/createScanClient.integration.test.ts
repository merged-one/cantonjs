import { createServer } from 'node:http'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createScanClient } from './createScanClient.js'
import { scanContractFixtures } from '../test/scanContractFixtures.js'

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

describe('createScanClient fixture contracts', () => {
  it('talks to fixture-backed Scan routes over a real HTTP server', async () => {
    const server = await startFixtureServer()
    const sessionCalls: string[] = []
    const client = createScanClient({
      url: `${server.url}/api/scan`,
      session: async ({ request }) => {
        sessionCalls.push(request.path)
        return {
          token: 'scan-session-token',
          headers: { 'x-splice-release-line': '0.5' },
        }
      },
    })

    const dsoInfo = await client.getDsoInfo()
    const ansEntry = await client.lookupAnsEntryByName({ name: 'alice.ans' })
    const updates = []

    for await (const update of client.iterateUpdates({ page_size: 2 })) {
      updates.push(update.update_id)
    }

    expect(dsoInfo.network_name).toBe('splice-test')
    expect(ansEntry.entry.name).toBe('alice.ans')
    expect(updates).toEqual(['update-1', 'update-2', 'update-3'])
    expect(sessionCalls).toEqual([
      '/v0/dso',
      '/v0/ans-entries/by-name/alice.ans',
      '/v2/updates',
      '/v2/updates',
    ])
    expect(server.requests.map((request) => [request.method, request.url])).toEqual([
      ['GET', '/api/scan/v0/dso'],
      ['GET', '/api/scan/v0/ans-entries/by-name/alice.ans'],
      ['POST', '/api/scan/v2/updates'],
      ['POST', '/api/scan/v2/updates'],
    ])
    expect(server.requests.every((request) => request.headers.authorization === 'Bearer scan-session-token'))
      .toBe(true)
    expect(server.requests.every((request) => request.headers['x-splice-release-line'] === '0.5'))
      .toBe(true)
    expect(server.requests.map((request) => parseBody(request.body))).toEqual([
      undefined,
      undefined,
      { page_size: 2 },
      {
        page_size: 2,
        after: {
          after_migration_id: 8,
          after_record_time: '2026-04-02T01:00:01.000Z',
        },
      },
    ])
  })
})

async function startFixtureServer(): Promise<{
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

    await routeFixtureRequest(request, response, body)
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
    throw new Error('Unable to resolve Scan fixture server address')
  }

  return {
    url: `http://localhost:${(address as AddressInfo).port}`,
    requests,
  }
}

async function routeFixtureRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  body: string,
): Promise<void> {
  if (request.method === 'GET' && request.url === '/api/scan/v0/dso') {
    respondJson(response, scanContractFixtures.dsoInfo)
    return
  }

  if (request.method === 'GET' && request.url === '/api/scan/v0/ans-entries/by-name/alice.ans') {
    respondJson(response, scanContractFixtures.ansEntryByName)
    return
  }

  if (request.method === 'POST' && request.url === '/api/scan/v2/updates') {
    const parsedBody = parseBody(body)
    const pageIndex = parsedBody?.after === undefined ? 0 : 1
    respondJson(response, scanContractFixtures.updatePages[pageIndex] ?? { transactions: [] })
    return
  }

  respondJson(response, { error: 'not found' }, 404)
}

function respondJson(
  response: ServerResponse<IncomingMessage>,
  body: unknown,
  statusCode = 200,
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body))
}

function parseBody(body: string): unknown {
  return body.length === 0 ? undefined : JSON.parse(body)
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}
