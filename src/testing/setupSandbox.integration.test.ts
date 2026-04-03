import { createServer } from 'node:http'
import type { IncomingMessage, IncomingHttpHeaders, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setupCantonSandbox } from './setupSandbox.js'

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

describe('setupCantonSandbox integration', () => {
  it('uses auth providers for participant requests without calling cantonctl auth token', async () => {
    const server = await startSandboxServer()
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
    const auth = vi.fn().mockResolvedValue('sandbox-auth-token')

    const sandbox = await setupCantonSandbox({
      port: server.port,
      auth,
      execFn,
    })

    await sandbox.client.getTime()
    await sandbox.teardown()

    expect(execFn).not.toHaveBeenCalledWith('cantonctl auth token')
    expect(auth).toHaveBeenCalledWith(expect.objectContaining({
      transport: 'json-api',
      request: expect.objectContaining({
        method: 'GET',
        path: '/v2/time',
      }),
    }))
    expect(server.requests.find((request) => request.url === '/v2/time')?.headers.authorization)
      .toBe('Bearer sandbox-auth-token')
  })

  it('uses session providers for participant requests and forwards custom headers', async () => {
    const server = await startSandboxServer()
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
    const session = vi.fn().mockResolvedValue({
      token: 'sandbox-session-token',
      headers: { 'x-sandbox-session': 'splice' },
    })

    const sandbox = await setupCantonSandbox({
      port: server.port,
      session,
      execFn,
    })

    await sandbox.client.getTime()
    await sandbox.teardown()

    expect(execFn).not.toHaveBeenCalledWith('cantonctl auth token')
    expect(session).toHaveBeenCalledWith(expect.objectContaining({
      transport: 'json-api',
      request: expect.objectContaining({
        method: 'GET',
        path: '/v2/time',
      }),
    }))

    const timeRequest = server.requests.find((request) => request.url === '/v2/time')
    expect(timeRequest?.headers.authorization).toBe('Bearer sandbox-session-token')
    expect(timeRequest?.headers['x-sandbox-session']).toBe('splice')
  })

  it('treats empty tokens as missing auth and falls back to cantonctl auth token', async () => {
    const server = await startSandboxServer()
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'fallback-sandbox-token', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })

    const sandbox = await setupCantonSandbox({
      port: server.port,
      token: '',
      execFn,
    })

    await sandbox.client.getTime()
    await sandbox.teardown()

    expect(execFn).toHaveBeenCalledWith('cantonctl auth token')
    expect(server.requests.find((request) => request.url === '/v2/time')?.headers.authorization)
      .toBe('Bearer fallback-sandbox-token')
  })
})

async function startSandboxServer(): Promise<{
  readonly port: number
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

    await routeSandboxRequest(request, response)
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
    throw new Error('Unable to resolve sandbox test server address')
  }

  return {
    port: (address as AddressInfo).port,
    requests,
  }
}

async function routeSandboxRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  if (request.url === '/livez') {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('live')
    return
  }

  if (request.method === 'GET' && request.url === '/v2/time') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ currentTime: '2026-04-02T00:00:00.000Z' }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'not found' }))
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}
