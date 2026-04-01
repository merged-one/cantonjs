import { describe, it, expect, vi } from 'vitest'
import { createTestClient } from './createTestClient.js'
import type { Transport } from '../transport/types.js'
import type { Party } from '../types/party.js'

function mockTransport(responses?: Record<string, unknown>): Transport {
  const defaultResponses: Record<string, unknown> = {
    '/v2/time': { currentTime: '2026-04-01T12:00:00Z' },
    '/v2/parties': { partyDetails: { party: 'Test::1220', isLocal: true } },
    ...responses,
  }

  return {
    type: 'mock',
    url: 'http://localhost:7575',
    request: vi.fn().mockImplementation((args: { path: string }) => {
      const key = Object.keys(defaultResponses).find((k) => args.path.startsWith(k))
      return Promise.resolve(key ? defaultResponses[key] : {})
    }),
  }
}

describe('createTestClient', () => {
  it('creates a client with default test party', () => {
    const transport = mockTransport()
    const client = createTestClient({ transport })

    expect(client.actAs).toBe('test-party')
  })

  it('creates a client with custom party', () => {
    const transport = mockTransport()
    const client = createTestClient({ transport, party: 'Alice::1234' as Party })

    expect(client.actAs).toBe('Alice::1234')
  })

  it('has LedgerClient methods', () => {
    const transport = mockTransport()
    const client = createTestClient({ transport })

    expect(typeof client.createContract).toBe('function')
    expect(typeof client.exerciseChoice).toBe('function')
    expect(typeof client.queryContracts).toBe('function')
    expect(typeof client.getLedgerEnd).toBe('function')
  })

  it('has AdminClient methods', () => {
    const transport = mockTransport()
    const client = createTestClient({ transport })

    expect(typeof client.allocateParty).toBe('function')
    expect(typeof client.listParties).toBe('function')
    expect(typeof client.createUser).toBe('function')
    expect(typeof client.uploadDar).toBe('function')
    expect(typeof client.listPackages).toBe('function')
  })

  describe('getTime', () => {
    it('returns current ledger time as Date', async () => {
      const transport = mockTransport({
        '/v2/time': { currentTime: '2026-04-01T12:00:00Z' },
      })

      const client = createTestClient({ transport })
      const time = await client.getTime()

      expect(time).toBeInstanceOf(Date)
      expect(time.toISOString()).toBe('2026-04-01T12:00:00.000Z')
    })
  })

  describe('setTime', () => {
    it('sends current and new time to the time endpoint', async () => {
      const transport = mockTransport()
      const client = createTestClient({ transport })

      const current = new Date('2026-04-01T12:00:00Z')
      const newTime = new Date('2026-04-01T13:00:00Z')
      await client.setTime(current, newTime)

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/time')
      expect(req.body.currentTime).toBe('2026-04-01T12:00:00.000Z')
      expect(req.body.newTime).toBe('2026-04-01T13:00:00.000Z')
    })
  })

  describe('advanceTime', () => {
    it('gets current time then sets time with delta', async () => {
      const requestFn = vi.fn()
        .mockResolvedValueOnce({ currentTime: '2026-04-01T12:00:00Z' })
        .mockResolvedValueOnce({})

      const transport: Transport = {
        type: 'mock',
        url: 'http://localhost:7575',
        request: requestFn,
      }

      const client = createTestClient({ transport })
      await client.advanceTime(3600)

      expect(requestFn).toHaveBeenCalledTimes(2)

      const setTimeReq = requestFn.mock.calls[1]![0]
      expect(setTimeReq.body.currentTime).toBe('2026-04-01T12:00:00.000Z')
      expect(setTimeReq.body.newTime).toBe('2026-04-01T13:00:00.000Z')
    })
  })

  describe('allocateParties', () => {
    it('allocates multiple parties in parallel', async () => {
      let callCount = 0
      const transport: Transport = {
        type: 'mock',
        url: 'http://localhost:7575',
        request: vi.fn().mockImplementation(() => {
          callCount++
          return Promise.resolve({
            partyDetails: {
              party: `Party${callCount}::1220`,
              isLocal: true,
            },
          })
        }),
      }

      const client = createTestClient({ transport })
      const parties = await client.allocateParties(['Alice', 'Bob', 'Charlie'])

      expect(parties).toHaveLength(3)
      expect(transport.request).toHaveBeenCalledTimes(3)

      // Verify each request uses partyIdHint
      for (const call of (transport.request as ReturnType<typeof vi.fn>).mock.calls) {
        expect(call[0].body.partyIdHint).toBeDefined()
      }
    })
  })
})
