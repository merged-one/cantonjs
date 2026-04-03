import { describe, expect, it, vi } from 'vitest'
import { createAnsClient } from './createAnsClient.js'

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

describe('createAnsClient', () => {
  it('creates ANS entries through the vendored external endpoint', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        entryContextCid: '#entry',
        subscriptionRequestCid: '#subscription',
        name: 'app.unverified.ans',
        url: 'https://app.example.com',
        description: 'Validator app',
      }),
    )
    const client = createAnsClient({
      url: 'https://validator.example.com/api/validator',
      token: 'validator-jwt',
      fetchFn,
    })
    const controller = new AbortController()

    const response = await client.createAnsEntry({
      name: 'app.unverified.ans',
      url: 'https://app.example.com',
      description: 'Validator app',
    }, { signal: controller.signal })

    expect(response.subscriptionRequestCid).toBe('#subscription')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://validator.example.com/api/validator/v0/entry/create')
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(fetchFn.mock.calls[0]?.[1]?.headers['Authorization']).toBe('Bearer validator-jwt')
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(String(fetchFn.mock.calls[0]?.[1]?.body))).toEqual({
      name: 'app.unverified.ans',
      url: 'https://app.example.com',
      description: 'Validator app',
    })
    controller.abort()
    expect((fetchFn.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true)
  })

  it('lists ANS entries owned by the authenticated user', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        entries: [
          {
            contractId: '#entry',
            name: 'app.unverified.ans',
            amount: '10.0',
            unit: 'AMULET',
            expiresAt: '2026-05-01T00:00:00.000Z',
            paymentInterval: 'P30D',
            paymentDuration: 'P30D',
          },
        ],
      }),
    )
    const client = createAnsClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })
    const controller = new AbortController()

    const response = await client.listAnsEntries({ signal: controller.signal })

    expect(response.entries).toHaveLength(1)
    expect(fetchFn.mock.calls[0]?.[0]).toBe('https://validator.example.com/api/validator/v0/entry/all')
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    controller.abort()
    expect((fetchFn.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true)
  })
})
