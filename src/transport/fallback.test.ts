import { describe, it, expect, vi } from 'vitest'
import { fallback } from './fallback.js'
import { jsonApi } from './json-api.js'
import { AuthProviderError } from '../errors/auth.js'
import { ConnectionError, HttpError, TimeoutError } from '../errors/transport.js'
import type { Transport } from './types.js'

function mockTransport(url: string, impl: Transport['request']): Transport {
  return { type: 'json-api', url, request: impl }
}

describe('fallback', () => {
  it('uses the first transport when it succeeds', async () => {
    const primary = mockTransport('http://primary', vi.fn().mockResolvedValue({ ok: true }))
    const secondary = mockTransport('http://secondary', vi.fn().mockResolvedValue({ ok: false }))
    const transport = fallback({ transports: [primary, secondary] })

    const result = await transport.request({ method: 'GET', path: '/v2/version' })
    expect(result).toEqual({ ok: true })
    expect(secondary.request).not.toHaveBeenCalled()
  })

  it('falls back on ConnectionError', async () => {
    const primary = mockTransport(
      'http://primary',
      vi.fn().mockRejectedValue(new ConnectionError('http://primary')),
    )
    const secondary = mockTransport('http://secondary', vi.fn().mockResolvedValue({ ok: true }))
    const transport = fallback({ transports: [primary, secondary] })

    const result = await transport.request({ method: 'GET', path: '/v2/version' })
    expect(result).toEqual({ ok: true })
  })

  it('falls back on TimeoutError', async () => {
    const primary = mockTransport(
      'http://primary',
      vi.fn().mockRejectedValue(new TimeoutError(5000)),
    )
    const secondary = mockTransport('http://secondary', vi.fn().mockResolvedValue({ ok: true }))
    const transport = fallback({ transports: [primary, secondary] })

    const result = await transport.request({ method: 'GET', path: '/v2/version' })
    expect(result).toEqual({ ok: true })
  })

  it('does not retry on HttpError (application-level)', async () => {
    const primary = mockTransport(
      'http://primary',
      vi.fn().mockRejectedValue(new HttpError(403, 'Forbidden')),
    )
    const secondary = mockTransport('http://secondary', vi.fn().mockResolvedValue({ ok: true }))
    const transport = fallback({ transports: [primary, secondary] })

    await expect(transport.request({ method: 'GET', path: '/test' })).rejects.toBeInstanceOf(
      HttpError,
    )
    expect(secondary.request).not.toHaveBeenCalled()
  })

  it('does not retry on auth provider failures', async () => {
    const fetchFn = vi.fn()
    const primary = jsonApi({
      url: 'http://primary',
      auth: async () => {
        throw new Error('auth backend unavailable')
      },
      fetchFn,
    })
    const secondary = mockTransport('http://secondary', vi.fn().mockResolvedValue({ ok: true }))
    const transport = fallback({ transports: [primary, secondary] })

    await expect(transport.request({ method: 'GET', path: '/v2/version' })).rejects.toBeInstanceOf(
      AuthProviderError,
    )
    expect(fetchFn).not.toHaveBeenCalled()
    expect(secondary.request).not.toHaveBeenCalled()
  })

  it('throws the last error when all transports fail', async () => {
    const primary = mockTransport(
      'http://primary',
      vi.fn().mockRejectedValue(new ConnectionError('http://primary')),
    )
    const secondary = mockTransport(
      'http://secondary',
      vi.fn().mockRejectedValue(new ConnectionError('http://secondary')),
    )
    const transport = fallback({ transports: [primary, secondary] })

    await expect(transport.request({ method: 'GET', path: '/test' })).rejects.toBeInstanceOf(
      ConnectionError,
    )
  })

  it('tries all transports in order', async () => {
    const order: number[] = []
    const t1 = mockTransport(
      'http://t1',
      vi.fn().mockImplementation(async () => {
        order.push(1)
        throw new ConnectionError('http://t1')
      }),
    )
    const t2 = mockTransport(
      'http://t2',
      vi.fn().mockImplementation(async () => {
        order.push(2)
        throw new ConnectionError('http://t2')
      }),
    )
    const t3 = mockTransport(
      'http://t3',
      vi.fn().mockImplementation(async () => {
        order.push(3)
        return { success: true }
      }),
    )
    const transport = fallback({ transports: [t1, t2, t3] })

    await transport.request({ method: 'GET', path: '/test' })
    expect(order).toEqual([1, 2, 3])
  })

  it('throws if created with empty transports array', () => {
    expect(() => fallback({ transports: [] })).toThrow('at least one transport')
  })

  it('passes request args through to the transport', async () => {
    const requestFn = vi.fn().mockResolvedValue('ok')
    const transport = fallback({
      transports: [mockTransport('http://test', requestFn)],
    })

    await transport.request({
      method: 'POST',
      path: '/v2/commands/submit-and-wait',
      body: { data: 1 },
    })

    expect(requestFn).toHaveBeenCalledWith({
      method: 'POST',
      path: '/v2/commands/submit-and-wait',
      body: { data: 1 },
    })
  })

  it('has type "fallback" and url from first transport', () => {
    const transport = fallback({
      transports: [
        mockTransport('http://primary', vi.fn()),
        mockTransport('http://secondary', vi.fn()),
      ],
    })
    expect(transport.type).toBe('fallback')
    expect(transport.url).toBe('http://primary')
  })
})
