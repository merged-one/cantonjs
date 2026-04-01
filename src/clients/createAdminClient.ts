/**
 * Factory for creating an Admin API client.
 *
 * The AdminClient provides party/user/package management operations.
 * Requires a privileged JWT token with admin rights.
 *
 * Request/response shapes match the Canton JSON Ledger API V2 OpenAPI spec (3.4+).
 */

import type { Transport } from '../transport/types.js'
import type { PartyDetails, AllocatePartyRequest } from '../types/party.js'
import type { User, Right, CreateUserRequest } from '../types/user.js'

export type AdminClientConfig = {
  readonly transport: Transport
}

export type AdminClient = {
  /** Allocate a new party on the ledger. */
  allocateParty: (request?: AllocatePartyRequest) => Promise<PartyDetails>

  /** List all known parties. */
  listParties: (filter?: string) => Promise<readonly PartyDetails[]>

  /** Get details for a specific party. */
  getParty: (party: string) => Promise<PartyDetails>

  /** Get the participant ID. */
  getParticipantId: () => Promise<string>

  /** Create a new user. */
  createUser: (request: CreateUserRequest) => Promise<User>

  /** Get a user by ID. */
  getUser: (userId: string) => Promise<User>

  /** List all users. */
  listUsers: () => Promise<readonly User[]>

  /** Delete a user. */
  deleteUser: (userId: string) => Promise<void>

  /** Grant rights to a user. */
  grantRights: (userId: string, rights: readonly Right[]) => Promise<readonly Right[]>

  /** Revoke rights from a user. */
  revokeRights: (userId: string, rights: readonly Right[]) => Promise<readonly Right[]>

  /** Upload a DAR file to the ledger (raw binary). */
  uploadDar: (darBytes: Uint8Array, options?: { vetAllPackages?: boolean }) => Promise<void>

  /** List all known package IDs. */
  listPackages: () => Promise<readonly string[]>

  /** Validate a DAR file without uploading. */
  validateDar: (darBytes: Uint8Array) => Promise<void>

  /** Get the Ledger API version. */
  getLedgerApiVersion: () => Promise<string>
}

export function createAdminClient(config: AdminClientConfig): AdminClient {
  const { transport } = config

  return {
    async allocateParty(request) {
      const response = await transport.request<{ partyDetails: PartyDetails }>({
        method: 'POST',
        path: '/v2/parties',
        body: {
          partyIdHint: request?.partyIdHint,
          localMetadata: request?.localMetadata,
          identityProviderId: request?.identityProviderId,
          synchronizerId: request?.synchronizerId,
          userId: request?.userId,
        },
      })
      return response.partyDetails
    },

    async listParties(filter) {
      const params = new URLSearchParams()
      if (filter !== undefined) params.set('filter-party', filter)
      const qs = params.toString()
      const response = await transport.request<{
        partyDetails: readonly PartyDetails[]
        nextPageToken?: string
      }>({
        method: 'GET',
        path: `/v2/parties${qs ? `?${qs}` : ''}`,
      })
      return response.partyDetails ?? []
    },

    async getParty(party) {
      const response = await transport.request<{ partyDetails: PartyDetails }>({
        method: 'GET',
        path: `/v2/parties/${encodeURIComponent(party)}`,
      })
      return response.partyDetails
    },

    async getParticipantId() {
      const response = await transport.request<{ participantId: string }>({
        method: 'GET',
        path: '/v2/parties/participant-id',
      })
      return response.participantId
    },

    async createUser(request) {
      const response = await transport.request<{ user: User }>({
        method: 'POST',
        path: '/v2/users',
        body: {
          user: request.user,
          rights: request.rights,
        },
      })
      return response.user
    },

    async getUser(userId) {
      const response = await transport.request<{ user: User }>({
        method: 'GET',
        path: `/v2/users/${encodeURIComponent(userId)}`,
      })
      return response.user
    },

    async listUsers() {
      const response = await transport.request<{
        users: readonly User[]
        nextPageToken?: string
      }>({
        method: 'GET',
        path: '/v2/users',
      })
      return response.users ?? []
    },

    async deleteUser(userId) {
      await transport.request<Record<string, never>>({
        method: 'DELETE',
        path: `/v2/users/${encodeURIComponent(userId)}`,
      })
    },

    async grantRights(userId, rights) {
      const response = await transport.request<{
        newlyGrantedRights: readonly Right[]
      }>({
        method: 'POST',
        path: `/v2/users/${encodeURIComponent(userId)}/rights`,
        body: { rights },
      })
      return response.newlyGrantedRights ?? []
    },

    async revokeRights(userId, rights) {
      const response = await transport.request<{
        newlyRevokedRights: readonly Right[]
      }>({
        method: 'POST',
        path: `/v2/users/${encodeURIComponent(userId)}/rights`,
        body: { rights, revoke: true },
      })
      return response.newlyRevokedRights ?? []
    },

    async uploadDar(darBytes, options) {
      const params = new URLSearchParams()
      if (options?.vetAllPackages !== undefined) {
        params.set('vetAllPackages', String(options.vetAllPackages))
      }
      const qs = params.toString()

      await transport.request<Record<string, never>>({
        method: 'POST',
        path: `/v2/dars${qs ? `?${qs}` : ''}`,
        body: darBytes,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    },

    async listPackages() {
      const response = await transport.request<{ packageIds: readonly string[] }>({
        method: 'GET',
        path: '/v2/packages',
      })
      return response.packageIds ?? []
    },

    async validateDar(darBytes) {
      await transport.request<Record<string, never>>({
        method: 'POST',
        path: '/v2/dars/validate',
        body: darBytes,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    },

    async getLedgerApiVersion() {
      const response = await transport.request<{ version: string }>({
        method: 'GET',
        path: '/v2/version',
      })
      return response.version
    },
  }
}
