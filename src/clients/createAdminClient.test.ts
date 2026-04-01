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
      const result = await client.listParties()

      expect(result.items).toHaveLength(2)
      expect(result.items[0]!.party).toBe('Alice::1220')

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

    it('returns empty items array when no parties', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const result = await client.listParties()
      expect(result.items).toEqual([])
    })

    it('passes pagination parameters', async () => {
      const transport = mockTransport({
        partyDetails: [{ party: 'Alice::1220', isLocal: true }],
        nextPageToken: 'token-2',
      })

      const client = createAdminClient({ transport })
      const result = await client.listParties(undefined, { pageSize: 10, pageToken: 'token-1' })

      expect(result.nextPageToken).toBe('token-2')
      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toContain('page_size=10')
      expect(path).toContain('page_token=token-1')
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
      const result = await client.listUsers()

      expect(result.items).toHaveLength(2)
    })

    it('returns empty items array when no users', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const result = await client.listUsers()
      expect(result.items).toEqual([])
    })

    it('passes pagination parameters', async () => {
      const transport = mockTransport({
        users: [{ id: 'alice' }],
        nextPageToken: 'page-2',
      })

      const client = createAdminClient({ transport })
      const result = await client.listUsers({ pageSize: 5, pageToken: 'page-1' })

      expect(result.nextPageToken).toBe('page-2')
      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toContain('page_size=5')
      expect(path).toContain('page_token=page-1')
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

  describe('createIdentityProvider', () => {
    it('creates an IDP configuration', async () => {
      const idpConfig = {
        identityProviderId: 'my-idp',
        issuer: 'https://auth.example.com',
        jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
        audience: 'my-app',
      }

      const transport = mockTransport({ identityProviderConfig: idpConfig })
      const client = createAdminClient({ transport })
      const result = await client.createIdentityProvider({ identityProviderConfig: idpConfig })

      expect(result.identityProviderId).toBe('my-idp')
      expect(result.issuer).toBe('https://auth.example.com')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/identity-provider-configs')
      expect(req.body.identityProviderConfig.issuer).toBe('https://auth.example.com')
    })
  })

  describe('getIdentityProvider', () => {
    it('fetches an IDP by ID', async () => {
      const transport = mockTransport({
        identityProviderConfig: {
          identityProviderId: 'my-idp',
          issuer: 'https://auth.example.com',
          jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
        },
      })

      const client = createAdminClient({ transport })
      const result = await client.getIdentityProvider('my-idp')

      expect(result.identityProviderId).toBe('my-idp')

      const path = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0].path
      expect(path).toBe('/v2/identity-provider-configs/my-idp')
    })
  })

  describe('updateIdentityProvider', () => {
    it('updates an IDP configuration via PATCH', async () => {
      const idpConfig = {
        identityProviderId: 'my-idp',
        issuer: 'https://new-auth.example.com',
        jwksUrl: 'https://new-auth.example.com/.well-known/jwks.json',
      }

      const transport = mockTransport({ identityProviderConfig: idpConfig })
      const client = createAdminClient({ transport })
      const result = await client.updateIdentityProvider({
        identityProviderConfig: idpConfig,
        updateMask: { paths: ['issuer', 'jwks_url'] },
      })

      expect(result.issuer).toBe('https://new-auth.example.com')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('PATCH')
      expect(req.path).toBe('/v2/identity-provider-configs/my-idp')
      expect(req.body.updateMask.paths).toEqual(['issuer', 'jwks_url'])
    })
  })

  describe('deleteIdentityProvider', () => {
    it('deletes an IDP by ID', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      await client.deleteIdentityProvider('my-idp')

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('DELETE')
      expect(req.path).toBe('/v2/identity-provider-configs/my-idp')
    })
  })

  describe('listIdentityProviders', () => {
    it('lists all IDP configurations', async () => {
      const transport = mockTransport({
        identityProviderConfigs: [
          { identityProviderId: 'idp-1', issuer: 'https://a.com', jwksUrl: 'https://a.com/jwks' },
          { identityProviderId: 'idp-2', issuer: 'https://b.com', jwksUrl: 'https://b.com/jwks' },
        ],
      })

      const client = createAdminClient({ transport })
      const result = await client.listIdentityProviders()

      expect(result).toHaveLength(2)
      expect(result[0]!.identityProviderId).toBe('idp-1')
    })

    it('returns empty array when no IDPs configured', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const result = await client.listIdentityProviders()
      expect(result).toEqual([])
    })
  })

  describe('getVettedPackages', () => {
    it('returns vetted package IDs', async () => {
      const transport = mockTransport({
        packageIds: ['pkg-1', 'pkg-2'],
      })

      const client = createAdminClient({ transport })
      const result = await client.getVettedPackages()

      expect(result).toEqual(['pkg-1', 'pkg-2'])

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('GET')
      expect(req.path).toBe('/v2/package-vetting')
    })

    it('returns empty array when no packages vetted', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      const result = await client.getVettedPackages()
      expect(result).toEqual([])
    })
  })

  describe('updateVettedPackages', () => {
    it('sends package IDs to vetting endpoint', async () => {
      const transport = mockTransport({})
      const client = createAdminClient({ transport })
      await client.updateVettedPackages(['pkg-1', 'pkg-2', 'pkg-3'])

      const req = (transport.request as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(req.method).toBe('POST')
      expect(req.path).toBe('/v2/package-vetting')
      expect(req.body.packageIds).toEqual(['pkg-1', 'pkg-2', 'pkg-3'])
    })
  })
})
