import { describe, it, expect, vi } from 'vitest'
import { jsonApi } from './json-api.js'
import { ConnectionError, HttpError, TimeoutError } from '../errors/transport.js'

function mockFetch(response: {
  ok: boolean
  status: number
  statusText: string
  json?: () => Promise<unknown>
  text?: () => Promise<string>
  headers?: Headers
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    json: response.json ?? (() => Promise.resolve({})),
    text: response.text ?? (() => Promise.resolve('')),
    headers: response.headers ?? new Headers({ 'content-type': 'application/json' }),
  })
}

describe('jsonApi transport', () => {
  it('creates a transport with type and url', () => {
    const transport = jsonApi({ url: 'http://localhost:7575' })
    expect(transport.type).toBe('json-api')
    expect(transport.url).toBe('http://localhost:7575')
  })

  it('strips trailing slashes from url', () => {
    const transport = jsonApi({ url: 'http://localhost:7575///' })
    expect(transport.url).toBe('http://localhost:7575')
  })

  it('makes GET requests', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ offset: '42' }),
    })

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })
    const result = await transport.request<{ offset: string }>({
      method: 'GET',
      path: '/v2/state/ledger-end',
    })

    expect(result.offset).toBe('42')
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:7575/v2/state/ledger-end',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('makes POST requests with JSON body', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ transaction: {} }),
    })

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })
    await transport.request({
      method: 'POST',
      path: '/v2/commands/submit-and-wait',
      body: { commands: [] },
    })

    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:7575/v2/commands/submit-and-wait',
      expect.objectContaining({
        method: 'POST',
        body: '{"commands":[]}',
      }),
    )
  })

  it('includes Authorization header when token is provided', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    const transport = jsonApi({
      url: 'http://localhost:7575',
      token: 'my-jwt-token',
      fetchFn,
    })

    await transport.request({ method: 'GET', path: '/v2/version' })

    const callArgs = fetchFn.mock.calls[0]!
    expect(callArgs[1].headers['Authorization']).toBe('Bearer my-jwt-token')
  })

  it('does not include Authorization header when no token', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
    })

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })
    await transport.request({ method: 'GET', path: '/v2/version' })

    const callArgs = fetchFn.mock.calls[0]!
    expect(callArgs[1].headers['Authorization']).toBeUndefined()
  })

  it('throws HttpError on non-ok response', async () => {
    const fetchFn = mockFetch({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('{"error":"invalid token"}'),
    })

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })

    await expect(
      transport.request({ method: 'GET', path: '/v2/version' }),
    ).rejects.toThrow(HttpError)
  })

  it('throws TimeoutError when request times out', async () => {
    const fetchFn = vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })

    const transport = jsonApi({
      url: 'http://localhost:7575',
      timeout: 10,
      fetchFn,
    })

    await expect(
      transport.request({ method: 'GET', path: '/v2/version' }),
    ).rejects.toThrow(TimeoutError)
  })

  it('throws ConnectionError on network failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })

    await expect(
      transport.request({ method: 'GET', path: '/v2/version' }),
    ).rejects.toThrow(ConnectionError)
  })

  it('returns text response when content-type is not JSON', async () => {
    const fetchFn = mockFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve('plain text'),
      headers: new Headers({ 'content-type': 'text/plain' }),
    })

    const transport = jsonApi({ url: 'http://localhost:7575', fetchFn })
    const result = await transport.request<string>({
      method: 'GET',
      path: '/livez',
    })

    expect(result).toBe('plain text')
  })
})
