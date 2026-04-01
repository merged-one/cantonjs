/**
 * Factory for creating an Admin API client.
 *
 * The AdminClient provides party/user/package management operations.
 * Requires a privileged JWT token with admin rights.
 */

import type { Transport } from '../transport/types.js'
import type { Party, PartyDetails, AllocatePartyRequest } from '../types/party.js'
import type { User, UserRight, CreateUserRequest } from '../types/user.js'
import type { PackageDetails } from '../types/package.js'

export type AdminClientConfig = {
  readonly transport: Transport
}

export type AdminClient = {
  /** Allocate a new party on the ledger. */
  allocateParty: (request?: AllocatePartyRequest) => Promise<PartyDetails>

  /** List all known parties. */
  listParties: (filter?: string) => Promise<readonly PartyDetails[]>

  /** Get details for a specific party. */
  getParty: (party: Party) => Promise<PartyDetails>

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
  grantRights: (userId: string, rights: readonly UserRight[]) => Promise<readonly UserRight[]>

  /** Revoke rights from a user. */
  revokeRights: (userId: string, rights: readonly UserRight[]) => Promise<readonly UserRight[]>

  /** Upload a DAR file to the ledger. */
  uploadDar: (darBytes: Uint8Array) => Promise<void>

  /** List all known packages. */
  listPackages: () => Promise<readonly string[]>

  /** Get package details. */
  getPackageDetails: () => Promise<readonly PackageDetails[]>

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
          identifierHint: request?.identifierHint,
          displayName: request?.displayName,
          identityProviderId: request?.identityProviderId,
        },
      })
      return response.partyDetails
    },

    async listParties(filter) {
      const params = filter !== undefined ? `?filter-party=${encodeURIComponent(filter)}` : ''
      const response = await transport.request<{ partyDetails: readonly PartyDetails[] }>({
        method: 'GET',
        path: `/v2/parties${params}`,
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
        body: { user: request, rights: request.rights },
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
      const response = await transport.request<{ users: readonly User[] }>({
        method: 'GET',
        path: '/v2/users',
      })
      return response.users ?? []
    },

    async deleteUser(userId) {
      await transport.request<void>({
        method: 'DELETE',
        path: `/v2/users/${encodeURIComponent(userId)}`,
      })
    },

    async grantRights(userId, rights) {
      const response = await transport.request<{ newlyGrantedRights: readonly UserRight[] }>({
        method: 'POST',
        path: `/v2/users/${encodeURIComponent(userId)}/rights`,
        body: { rights },
      })
      return response.newlyGrantedRights ?? []
    },

    async revokeRights(userId, rights) {
      const response = await transport.request<{ newlyRevokedRights: readonly UserRight[] }>({
        method: 'POST',
        path: `/v2/users/${encodeURIComponent(userId)}/rights`,
        body: { rights, revoke: true },
      })
      return response.newlyRevokedRights ?? []
    },

    async uploadDar(darBytes) {
      const base64 = globalThis.btoa(String.fromCharCode(...darBytes))
      await transport.request<void>({
        method: 'POST',
        path: '/v2/dars',
        body: { darFile: base64 },
      })
    },

    async listPackages() {
      const response = await transport.request<{ packageIds: readonly string[] }>({
        method: 'GET',
        path: '/v2/packages',
      })
      return response.packageIds ?? []
    },

    async getPackageDetails() {
      const response = await transport.request<{
        packageDetails: readonly PackageDetails[]
      }>({
        method: 'POST',
        path: '/v2/packages',
      })
      return response.packageDetails ?? []
    },

    async validateDar(darBytes) {
      const base64 = globalThis.btoa(String.fromCharCode(...darBytes))
      await transport.request<void>({
        method: 'POST',
        path: '/v2/dars/validate',
        body: { darFile: base64 },
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
