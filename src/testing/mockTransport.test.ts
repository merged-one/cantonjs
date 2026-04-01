import { describe, it, expect, vi } from 'vitest'
import { createMockTransport, createRecordingTransport } from './mockTransport.js'
import type { Transport } from '../transport/types.js'

describe('createMockTransport', () => {
  it('returns responses matching path prefix', async () => {
    const transport = createMockTransport({
      matchers: [
        { path: '/v2/parties', response: { partyDetails: [{ party: 'Alice::1220' }] } },
        { path: '/v2/users', response: { users: [] } },
      ],
    })

    const result = await transport.request<{ partyDetails: unknown[] }>({
      method: 'GET',
      path: '/v2/parties',
    })
    expect(result.partyDetails).toHaveLength(1)
  })

  it('matches by method and path', async () => {
    const transport = createMockTransport({
      matchers: [
        { method: 'GET', path: '/v2/parties', response: { partyDetails: [] } },
        { method: 'POST', path: '/v2/parties', response: { partyDetails: { party: 'New::1220' } } },
      ],
    })

    const getResult = await transport.request<{ partyDetails: unknown }>({
      method: 'GET',
      path: '/v2/parties',
    })
    expect(getResult.partyDetails).toEqual([])

    const postResult = await transport.request<{ partyDetails: { party: string } }>({
      method: 'POST',
      path: '/v2/parties',
      body: { partyIdHint: 'New' },
    })
    expect(postResult.partyDetails.party).toBe('New::1220')
  })

  it('matches path prefix (not exact)', async () => {
    const transport = createMockTransport({
      matchers: [
        { path: '/v2/parties', response: { partyDetails: { party: 'Alice::1220' } } },
      ],
    })

    const result = await transport.request<{ partyDetails: { party: string } }>({
      method: 'GET',
      path: '/v2/parties/Alice%3A%3A1220',
    })
    expect(result.partyDetails.party).toBe('Alice::1220')
  })

  it('falls back to defaultResponse when no matcher', async () => {
    const transport = createMockTransport({
      defaultResponse: { fallback: true },
    })

    const result = await transport.request<{ fallback: boolean }>({
      method: 'GET',
      path: '/v2/unknown',
    })
    expect(result.fallback).toBe(true)
  })

  it('throws when no matcher and no defaultResponse', async () => {
    const transport = createMockTransport()

    await expect(
      transport.request({ method: 'GET', path: '/v2/unknown' }),
    ).rejects.toThrow('No mock response for GET /v2/unknown')
  })

  it('records all calls', async () => {
    const transport = createMockTransport({
      matchers: [
        { path: '/v2/parties', response: { partyDetails: [] } },
      ],
    })

    await transport.request({ method: 'GET', path: '/v2/parties' })
    await transport.request({ method: 'POST', path: '/v2/parties', body: { partyIdHint: 'Alice' } })

    expect(transport.calls).toHaveLength(2)
    expect(transport.calls[0]!.request.method).toBe('GET')
    expect(transport.calls[1]!.request.body).toEqual({ partyIdHint: 'Alice' })
  })

  it('has type "mock" and configurable url', () => {
    const transport = createMockTransport({ url: 'http://custom:9999' })
    expect(transport.type).toBe('mock')
    expect(transport.url).toBe('http://custom:9999')
  })

  it('uses default url when not specified', () => {
    const transport = createMockTransport()
    expect(transport.url).toBe('http://mock:7575')
  })
})

describe('createRecordingTransport', () => {
  it('passes requests through to inner transport', async () => {
    const inner: Transport = {
      type: 'test',
      url: 'http://localhost:7575',
      request: vi.fn().mockResolvedValue({ data: 'from-inner' }),
    }

    const recording = createRecordingTransport(inner)
    const result = await recording.request<{ data: string }>({
      method: 'GET',
      path: '/v2/test',
    })

    expect(result.data).toBe('from-inner')
    expect(inner.request).toHaveBeenCalledOnce()
  })

  it('records all request/response pairs', async () => {
    const inner: Transport = {
      type: 'test',
      url: 'http://localhost:7575',
      request: vi.fn()
        .mockResolvedValueOnce({ parties: ['Alice'] })
        .mockResolvedValueOnce({ users: ['bob'] }),
    }

    const recording = createRecordingTransport(inner)
    await recording.request({ method: 'GET', path: '/v2/parties' })
    await recording.request({ method: 'GET', path: '/v2/users' })

    expect(recording.recordings).toHaveLength(2)
    expect(recording.recordings[0]!.request.path).toBe('/v2/parties')
    expect(recording.recordings[0]!.response).toEqual({ parties: ['Alice'] })
    expect(recording.recordings[1]!.request.path).toBe('/v2/users')
  })

  it('preserves inner transport type in recording type', () => {
    const inner: Transport = {
      type: 'json-api',
      url: 'http://localhost:7575',
      request: vi.fn(),
    }

    const recording = createRecordingTransport(inner)
    expect(recording.type).toBe('recording(json-api)')
    expect(recording.url).toBe('http://localhost:7575')
  })

  it('recordings can be replayed via createMockTransport', async () => {
    const inner: Transport = {
      type: 'test',
      url: 'http://localhost:7575',
      request: vi.fn()
        .mockResolvedValueOnce({ partyDetails: [{ party: 'Alice::1220' }] }),
    }

    // Record
    const recording = createRecordingTransport(inner)
    await recording.request({ method: 'GET', path: '/v2/parties' })

    // Replay
    const replay = createMockTransport({
      matchers: recording.recordings.map((r) => ({
        method: r.request.method,
        path: r.request.path,
        response: r.response,
      })),
    })

    const result = await replay.request<{ partyDetails: { party: string }[] }>({
      method: 'GET',
      path: '/v2/parties',
    })
    expect(result.partyDetails[0]!.party).toBe('Alice::1220')
  })

  it('propagates errors from inner transport', async () => {
    const inner: Transport = {
      type: 'test',
      url: 'http://localhost:7575',
      request: vi.fn().mockRejectedValue(new Error('connection refused')),
    }

    const recording = createRecordingTransport(inner)
    await expect(
      recording.request({ method: 'GET', path: '/v2/test' }),
    ).rejects.toThrow('connection refused')

    // Error requests are NOT recorded
    expect(recording.recordings).toHaveLength(0)
  })
})
