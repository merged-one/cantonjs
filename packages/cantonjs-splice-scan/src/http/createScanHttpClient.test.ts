import { describe, expect, it, vi } from 'vitest'
import { createScanHttpClient } from './createScanHttpClient.js'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

describe('createScanHttpClient', () => {
  it('interpolates path params, serializes query params, and forwards headers and signals', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    const controller = new AbortController()
    const client = createScanHttpClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await client.getJson('/v0/ans-entries/by-party/{party}', {
      pathParams: { party: 'Alice::validator' },
      query: {
        page_size: 10,
        status: ['open', 'closed'],
        empty: undefined,
        skipped: null,
      },
      headers: { 'x-scan-network': 'test' },
      signal: controller.signal,
    })

    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe(
      'https://scan.example.com/api/scan/v0/ans-entries/by-party/Alice%3A%3Avalidator?page_size=10&status=open&status=closed',
    )
    expect(init?.method).toBe('GET')
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      'x-scan-network': 'test',
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(init?.signal).not.toBe(controller.signal)
    controller.abort()
    expect((init?.signal as AbortSignal).aborted).toBe(true)
  })

  it('posts JSON bodies without mutating caller headers', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    const headers = { 'x-request-id': 'req-1' }
    const client = createScanHttpClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await client.postJson('/v0/holdings/summary', { parties: ['Alice::validator'] }, { headers })

    expect(headers).toEqual({ 'x-request-id': 'req-1' })
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://scan.example.com/api/scan/v0/holdings/summary')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      'x-request-id': 'req-1',
    })
    expect(init?.body).toBe(JSON.stringify({ parties: ['Alice::validator'] }))
  })

  it('returns plain-text responses through getText', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response('ready', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    )
    const client = createScanHttpClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await expect(client.getText('/readyz')).resolves.toBe('ready')
  })

  it('throws when required path params are missing', async () => {
    const client = createScanHttpClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn: vi.fn(),
    })

    await expect(
      client.getJson('/v0/ans-entries/by-party/{party}'),
    ).rejects.toThrow('Missing required Scan path parameter: party')
  })
})
