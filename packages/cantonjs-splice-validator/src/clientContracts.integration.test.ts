import { createServer } from 'node:http'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createAnsClient } from './createAnsClient.js'
import { createScanProxyClient } from './createScanProxyClient.js'
import { validatorContractFixtures } from '../test/validatorContractFixtures.js'

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

describe('validator fixture contracts', () => {
  it('hits ANS fixtures over HTTP with bearer auth', async () => {
    const server = await startFixtureServer()
    const ansClient = createAnsClient({
      url: `${server.url}/api/validator`,
      token: 'validator-jwt',
    })

    const createdEntry = await ansClient.createAnsEntry({
      name: 'app.unverified.ans',
      url: 'https://app.example.com',
      description: 'Validator app',
    })
    const entries = await ansClient.listAnsEntries()

    expect(createdEntry.subscriptionRequestCid).toBe('#subscription')
    expect(entries.entries).toHaveLength(1)
    expect(server.requests.map((request) => [request.method, request.url])).toEqual([
      ['POST', '/api/validator/v0/entry/create'],
      ['GET', '/api/validator/v0/entry/all'],
    ])
    expect(server.requests.every((request) => request.headers.authorization === 'Bearer validator-jwt'))
      .toBe(true)
  })

  it('hits Scan Proxy fixtures over HTTP with session headers', async () => {
    const server = await startFixtureServer()
    const sessionCalls: string[] = []
    const scanProxy = createScanProxyClient({
      url: `${server.url}/api/validator`,
      session: async ({ request }) => {
        sessionCalls.push(request.path)
        return {
          token: 'scan-proxy-session',
          headers: { 'x-network-release': '0.5' },
        }
      },
    })

    const dsoInfo = await scanProxy.getDsoInfo()
    const ansEntries = await scanProxy.listAnsEntries({
      page_size: 10,
      name_prefix: 'ali',
    })

    expect(dsoInfo.network_name).toBe('splice-test')
    expect(ansEntries.entries).toHaveLength(1)
    expect(sessionCalls).toEqual([
      '/v0/scan-proxy/dso',
      '/v0/scan-proxy/ans-entries?page_size=10&name_prefix=ali',
    ])
    expect(server.requests.slice(-2).map((request) => [request.method, request.url])).toEqual([
      ['GET', '/api/validator/v0/scan-proxy/dso'],
      ['GET', '/api/validator/v0/scan-proxy/ans-entries?page_size=10&name_prefix=ali'],
    ])
    expect(server.requests.slice(-2).every((request) => request.headers.authorization === 'Bearer scan-proxy-session'))
      .toBe(true)
    expect(server.requests.slice(-2).every((request) => request.headers['x-network-release'] === '0.5'))
      .toBe(true)
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

    await routeFixtureRequest(request, response)
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
    throw new Error('Unable to resolve validator fixture server address')
  }

  return {
    url: `http://localhost:${(address as AddressInfo).port}`,
    requests,
  }
}

async function routeFixtureRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  if (request.method === 'POST' && request.url === '/api/validator/v0/entry/create') {
    respondJson(response, validatorContractFixtures.ansCreateResponse)
    return
  }

  if (request.method === 'GET' && request.url === '/api/validator/v0/entry/all') {
    respondJson(response, validatorContractFixtures.ansListResponse)
    return
  }

  if (request.method === 'GET' && request.url === '/api/validator/v0/scan-proxy/dso') {
    respondJson(response, validatorContractFixtures.scanProxyDsoInfo)
    return
  }

  if (request.method === 'GET' && request.url === '/api/validator/v0/scan-proxy/ans-entries?page_size=10&name_prefix=ali') {
    respondJson(response, validatorContractFixtures.scanProxyAnsEntries)
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

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}
