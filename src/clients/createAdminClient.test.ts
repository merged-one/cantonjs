import { describe, it, expect, vi } from 'vitest'
import { createAdminClient } from './createAdminClient.js'
import type { Transport } from '../transport/types.js'
import type { Right } from '../types/user.js'

function mockTransport(response: unknown = {}): Transport {
  return {
    type: 'mock',
    url: 'http://localhost:7575',
    request: vi.fn().mockResolvedValue(response),
  }
}

describe('createAdminClient', () => {
  describe('allocateParty', () => {
    it('sends partyIdHint and returns party details', async () => {
      const transport = mockTransport({
        partyDetails: {
          party: 'Alice::1220abcd',
          isLocal: true,
          identityProviderId: '',
        },
      })

      const client = createAdminClient({ transport })
      const result = await client.allocateParty({ partyIdHint: 'Alice' })

      expect(result.party).toBe('Alice::1220abcd')
      expect(result.isLocal).toBe(true)

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.partyIdHint).toBe('Alice')
    })

    it('sends empty body when no request provided', async () => {
      const transport = mockTransport({
        partyDetails: { party: 'auto::1220', isLocal: true },
      })

      const client = createAdminClient({ transport })
      await client.allocateParty()

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.partyIdHint).toBeUndefined()
    })
  })

  describe('listParties', () => {
    it('lists all parties without filter', async () => {
      const transport = mockTransport({
        partyDetails: [
          { party: 'Alice::1220', isLocal: true },
          { party: 'Bob::5678', isLocal: true },
        ],
      })

      const client = createAdminClient({ transport })
      const parties = await client.listParties()

      expect(parties).toHaveLength(2)
      expect(parties[0]!.party).toBe('Alice::1220')

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/parties')
    })

    it('passes filter as query parameter', async () => {
      const transport = mockTransport({ partyDetails: [] })

      const client = createAdminClient({ transport })
      await client.listParties('Alice')

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/parties?filter-party=Alice')
    })

    it('returns empty array when no parties', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const parties = await client.listParties()
      expect(parties).toEqual([])
    })
  })

  describe('getParty', () => {
    it('fetches a specific party with URL encoding', async () => {
      const transport = mockTransport({
        partyDetails: { party: 'Alice::1220abcd', isLocal: true },
      })

      const client = createAdminClient({ transport })
      const result = await client.getParty('Alice::1220abcd')

      expect(result.party).toBe('Alice::1220abcd')

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/parties/Alice%3A%3A1220abcd')
    })
  })

  describe('getParticipantId', () => {
    it('returns the participant identifier', async () => {
      const transport = mockTransport({ participantId: 'participant-1' })

      const client = createAdminClient({ transport })
      const id = await client.getParticipantId()

      expect(id).toBe('participant-1')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('GET')
      expect(req.path).toBe('/v2/parties/participant-id')
    })
  })

  describe('createUser', () => {
    it('creates a user with rights using nested tagged union format', async () => {
      const transport = mockTransport({
        user: { id: 'alice-user', primaryParty: 'Alice::1220' },
      })

      const rights: readonly Right[] = [
        { kind: { CanActAs: { value: { party: 'Alice::1220' } } } },
        { kind: { CanReadAs: { value: { party: 'Bob::5678' } } } },
      ]

      const client = createAdminClient({ transport })
      const user = await client.createUser({
        user: { id: 'alice-user', primaryParty: 'Alice::1220' },
        rights,
      })

      expect(user.id).toBe('alice-user')

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.user.id).toBe('alice-user')
      expect(body.rights).toHaveLength(2)
      expect(body.rights[0].kind.CanActAs.value.party).toBe('Alice::1220')
    })
  })

  describe('getUser', () => {
    it('fetches a user by ID', async () => {
      const transport = mockTransport({
        user: { id: 'alice-user', isDeactivated: false },
      })

      const client = createAdminClient({ transport })
      const user = await client.getUser('alice-user')

      expect(user.id).toBe('alice-user')

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/users/alice-user')
    })
  })

  describe('listUsers', () => {
    it('lists all users', async () => {
      const transport = mockTransport({
        users: [
          { id: 'alice', isDeactivated: false },
          { id: 'bob', isDeactivated: false },
        ],
      })

      const client = createAdminClient({ transport })
      const users = await client.listUsers()

      expect(users).toHaveLength(2)
    })

    it('returns empty array when no users', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const users = await client.listUsers()
      expect(users).toEqual([])
    })
  })

  describe('deleteUser', () => {
    it('sends DELETE request with URL-encoded user ID', async () => {
      const transport = mockTransport({})

      const client = createAdminClient({ transport })
      await client.deleteUser('alice-user')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('DELETE')
      expect(req.path).toBe('/v2/users/alice-user')
    })
  })

  describe('grantRights', () => {
    it('grants rights and returns newly granted rights', async () => {
      const rights: readonly Right[] = [
        { kind: { ParticipantAdmin: { value: {} as Record<string, never> } } },
      ]

      const transport = mockTransport({
        newlyGrantedRights: rights,
      })

      const client = createAdminClient({ transport })
      const granted = await client.grantRights('alice-user', rights)

      expect(granted).toHaveLength(1)

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.rights).toEqual(rights)
    })
  })

  describe('revokeRights', () => {
    it('revokes rights with revoke flag', async () => {
      const rights: readonly Right[] = [
        { kind: { CanActAs: { value: { party: 'Alice::1220' } } } },
      ]

      const transport = mockTransport({ newlyRevokedRights: rights })

      const client = createAdminClient({ transport })
      const revoked = await client.revokeRights('alice-user', rights)

      expect(revoked).toHaveLength(1)

      const body = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].body
      expect(body.revoke).toBe(true)
    })
  })

  describe('uploadDar', () => {
    it('sends binary DAR with application/octet-stream content type', async () => {
      const transport = mockTransport({})
      const darBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])

      const client = createAdminClient({ transport })
      await client.uploadDar(darBytes)

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/dars')
      expect(req.headers['Content-Type']).toBe('application/octet-stream')
      expect(req.body).toBe(darBytes)
    })

    it('passes vetAllPackages query parameter', async () => {
      const transport = mockTransport({})
      const darBytes = new Uint8Array([0x50, 0x4b])

      const client = createAdminClient({ transport })
      await client.uploadDar(darBytes, { vetAllPackages: true })

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/dars?vetAllPackages=true')
    })
  })

  describe('validateDar', () => {
    it('sends binary DAR to validate endpoint', async () => {
      const transport = mockTransport({})
      const darBytes = new Uint8Array([0x50, 0x4b])

      const client = createAdminClient({ transport })
      await client.validateDar(darBytes)

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/dars/validate')
      expect(req.headers['Content-Type']).toBe('application/octet-stream')
    })
  })

  describe('listPackages', () => {
    it('returns array of package IDs', async () => {
      const transport = mockTransport({
        packageIds: ['pkg-1', 'pkg-2', 'pkg-3'],
      })

      const client = createAdminClient({ transport })
      const packages = await client.listPackages()

      expect(packages).toEqual(['pkg-1', 'pkg-2', 'pkg-3'])
    })

    it('returns empty array when no packages', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const packages = await client.listPackages()
      expect(packages).toEqual([])
    })
  })

  describe('getLedgerApiVersion', () => {
    it('returns the API version string', async () => {
      const transport = mockTransport({ version: '3.4.12' })

      const client = createAdminClient({ transport })
      const version = await client.getLedgerApiVersion()

      expect(version).toBe('3.4.12')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('GET')
      expect(req.path).toBe('/v2/version')
    })
  })
})
