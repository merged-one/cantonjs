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
import type {
  IdentityProviderConfig,
  CreateIdentityProviderRequest,
  UpdateIdentityProviderRequest,
} from '../types/idp.js'

export type AdminClientConfig = {
  readonly transport: Transport
}

/** Pagination options for list endpoints. */
export type PaginationOptions = {
  readonly pageSize?: number
  readonly pageToken?: string
}

/** Paginated result with items and optional next page token. */
export type PaginatedResult<T> = {
  readonly items: readonly T[]
  readonly nextPageToken?: string
}

export type AdminClient = {
  /** Allocate a new party on the ledger. */
  allocateParty: (request?: AllocatePartyRequest) => Promise<PartyDetails>

  /** List known parties with optional filter and pagination. */
  listParties: (
    filter?: string,
    pagination?: PaginationOptions,
  ) => Promise<PaginatedResult<PartyDetails>>

  /** Get details for a specific party. */
  getParty: (party: string) => Promise<PartyDetails>

  /** Get the participant ID. */
  getParticipantId: () => Promise<string>

  /** Create a new user. */
  createUser: (request: CreateUserRequest) => Promise<User>

  /** Get a user by ID. */
  getUser: (userId: string) => Promise<User>

  /** List all users with optional pagination. */
  listUsers: (pagination?: PaginationOptions) => Promise<PaginatedResult<User>>

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

  /** Create an identity provider configuration. */
  createIdentityProvider: (
    request: CreateIdentityProviderRequest,
  ) => Promise<IdentityProviderConfig>

  /** Get an identity provider configuration by ID. */
  getIdentityProvider: (id: string) => Promise<IdentityProviderConfig>

  /** Update an identity provider configuration. */
  updateIdentityProvider: (
    request: UpdateIdentityProviderRequest,
  ) => Promise<IdentityProviderConfig>

  /** Delete an identity provider configuration. */
  deleteIdentityProvider: (id: string) => Promise<void>

  /** List all identity provider configurations. */
  listIdentityProviders: () => Promise<readonly IdentityProviderConfig[]>

  /** Get the current package vetting configuration. */
  getVettedPackages: () => Promise<readonly string[]>

  /** Update the package vetting configuration. */
  updateVettedPackages: (packageIds: readonly string[]) => Promise<void>
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

    async listParties(filter, pagination) {
      const params = new URLSearchParams()
      if (filter !== undefined) params.set('filter-party', filter)
      if (pagination?.pageSize !== undefined) params.set('page_size', String(pagination.pageSize))
      if (pagination?.pageToken !== undefined) params.set('page_token', pagination.pageToken)
      const qs = params.toString()
      const response = await transport.request<{
        partyDetails: readonly PartyDetails[]
        nextPageToken?: string
      }>({
        method: 'GET',
        path: `/v2/parties${qs ? `?${qs}` : ''}`,
      })
      return {
        items: response.partyDetails ?? [],
        nextPageToken: response.nextPageToken,
      }
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

    async listUsers(pagination) {
      const params = new URLSearchParams()
      if (pagination?.pageSize !== undefined) params.set('page_size', String(pagination.pageSize))
      if (pagination?.pageToken !== undefined) params.set('page_token', pagination.pageToken)
      const qs = params.toString()
      const response = await transport.request<{
        users: readonly User[]
        nextPageToken?: string
      }>({
        method: 'GET',
        path: `/v2/users${qs ? `?${qs}` : ''}`,
      })
      return {
        items: response.users ?? [],
        nextPageToken: response.nextPageToken,
      }
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

    async createIdentityProvider(request) {
      const response = await transport.request<{
        identityProviderConfig: IdentityProviderConfig
      }>({
        method: 'POST',
        path: '/v2/identity-provider-configs',
        body: request,
      })
      return response.identityProviderConfig
    },

    async getIdentityProvider(id) {
      const response = await transport.request<{
        identityProviderConfig: IdentityProviderConfig
      }>({
        method: 'GET',
        path: `/v2/identity-provider-configs/${encodeURIComponent(id)}`,
      })
      return response.identityProviderConfig
    },

    async updateIdentityProvider(request) {
      const id = request.identityProviderConfig.identityProviderId
      const response = await transport.request<{
        identityProviderConfig: IdentityProviderConfig
      }>({
        method: 'PATCH',
        path: `/v2/identity-provider-configs/${encodeURIComponent(id)}`,
        body: request,
      })
      return response.identityProviderConfig
    },

    async deleteIdentityProvider(id) {
      await transport.request<Record<string, never>>({
        method: 'DELETE',
        path: `/v2/identity-provider-configs/${encodeURIComponent(id)}`,
      })
    },

    async listIdentityProviders() {
      const response = await transport.request<{
        identityProviderConfigs: readonly IdentityProviderConfig[]
      }>({
        method: 'GET',
        path: '/v2/identity-provider-configs',
      })
      return response.identityProviderConfigs ?? []
    },

    async getVettedPackages() {
      const response = await transport.request<{
        packageIds: readonly string[]
      }>({
        method: 'GET',
        path: '/v2/package-vetting',
      })
      return response.packageIds ?? []
    },

    async updateVettedPackages(packageIds) {
      await transport.request<Record<string, never>>({
        method: 'POST',
        path: '/v2/package-vetting',
        body: { packageIds },
      })
    },
  }
}
