import { jsonApi, type TransportConfig } from 'cantonjs'
import type { operations } from '../generated/validatorInternal.types.js'

type Primitive = string | number | boolean
type QueryValue = Primitive | readonly Primitive[] | undefined | null
type QueryParametersRecord = Readonly<Record<string, QueryValue>>
type PathParametersRecord = Readonly<Record<string, Primitive>>

type OperationName = keyof operations

type JsonResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'application/json': infer T } } } }
    ? T
    : never

type TextResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'text/plain': infer T } } } }
    ? T
    : never

type SuccessResponse<TName extends OperationName> =
  [JsonResponse<TName>] extends [never]
    ? [TextResponse<TName>] extends [never]
      ? Record<string, never>
      : TextResponse<TName>
    : JsonResponse<TName>

type JsonRequestBody<TName extends OperationName> =
  operations[TName] extends { requestBody: { content: { 'application/json': infer T } } }
    ? T
    : never

type QueryParameters<TName extends OperationName> =
  operations[TName] extends { parameters: { query?: infer T } } ? T : never

type PathParameters<TName extends OperationName> =
  operations[TName] extends { parameters: { path?: infer T } } ? T : never

export type ExperimentalValidatorInternalClientConfig = TransportConfig

export type ExperimentalValidatorInternalRequestOptions = {
  readonly signal?: AbortSignal
}

export const VALIDATOR_INTERNAL_OPERATIONS = [
  { clientMethod: 'ready', operationId: 'isReady', method: 'GET', path: '/readyz' },
  { clientMethod: 'live', operationId: 'isLive', method: 'GET', path: '/livez' },
  {
    clientMethod: 'getValidatorUserInfo',
    operationId: 'getValidatorUserInfo',
    method: 'GET',
    path: '/v0/validator-user',
  },
  { clientMethod: 'register', operationId: 'register', method: 'POST', path: '/v0/register' },
  {
    clientMethod: 'onboardUser',
    operationId: 'onboardUser',
    method: 'POST',
    path: '/v0/admin/users',
  },
  { clientMethod: 'listUsers', operationId: 'listUsers', method: 'GET', path: '/v0/admin/users' },
  {
    clientMethod: 'offboardUser',
    operationId: 'offboardUser',
    method: 'POST',
    path: '/v0/admin/users/offboard',
  },
  {
    clientMethod: 'dumpParticipantIdentities',
    operationId: 'dumpParticipantIdentities',
    method: 'GET',
    path: '/v0/admin/participant/identities',
  },
  {
    clientMethod: 'getDecentralizedSynchronizerConnectionConfig',
    operationId: 'getDecentralizedSynchronizerConnectionConfig',
    method: 'GET',
    path: '/v0/admin/participant/global-domain-connection-config',
  },
  {
    clientMethod: 'getValidatorDomainDataSnapshot',
    operationId: 'getValidatorDomainDataSnapshot',
    method: 'GET',
    path: '/v0/admin/domain/data-snapshot',
  },
  {
    clientMethod: 'lookupTransferPreapprovalByParty',
    operationId: 'lookupTransferPreapprovalByParty',
    method: 'GET',
    path: '/v0/admin/transfer-preapprovals/by-party/{receiver-party}',
  },
  {
    clientMethod: 'cancelTransferPreapprovalByParty',
    operationId: 'cancelTransferPreapprovalByParty',
    method: 'DELETE',
    path: '/v0/admin/transfer-preapprovals/by-party/{receiver-party}',
  },
  {
    clientMethod: 'listTransferPreapprovals',
    operationId: 'listTransferPreapprovals',
    method: 'GET',
    path: '/v0/admin/transfer-preapprovals',
  },
  {
    clientMethod: 'prepareTransferPreapprovalSend',
    operationId: 'prepareTransferPreapprovalSend',
    method: 'POST',
    path: '/v0/admin/external-party/transfer-preapproval/prepare-send',
  },
  {
    clientMethod: 'submitTransferPreapprovalSend',
    operationId: 'submitTransferPreapprovalSend',
    method: 'POST',
    path: '/v0/admin/external-party/transfer-preapproval/submit-send',
  },
  {
    clientMethod: 'generateExternalPartyTopology',
    operationId: 'generateExternalPartyTopology',
    method: 'POST',
    path: '/v0/admin/external-party/topology/generate',
  },
  {
    clientMethod: 'submitExternalPartyTopology',
    operationId: 'submitExternalPartyTopology',
    method: 'POST',
    path: '/v0/admin/external-party/topology/submit',
  },
  {
    clientMethod: 'createExternalPartySetupProposal',
    operationId: 'createExternalPartySetupProposal',
    method: 'POST',
    path: '/v0/admin/external-party/setup-proposal',
  },
  {
    clientMethod: 'listExternalPartySetupProposals',
    operationId: 'listExternalPartySetupProposals',
    method: 'GET',
    path: '/v0/admin/external-party/setup-proposal',
  },
  {
    clientMethod: 'prepareAcceptExternalPartySetupProposal',
    operationId: 'prepareAcceptExternalPartySetupProposal',
    method: 'POST',
    path: '/v0/admin/external-party/setup-proposal/prepare-accept',
  },
  {
    clientMethod: 'submitAcceptExternalPartySetupProposal',
    operationId: 'submitAcceptExternalPartySetupProposal',
    method: 'POST',
    path: '/v0/admin/external-party/setup-proposal/submit-accept',
  },
  {
    clientMethod: 'getExternalPartyBalance',
    operationId: 'getExternalPartyBalance',
    method: 'GET',
    path: '/v0/admin/external-party/balance',
  },
] as const

export type ValidatorInternalOperation = (typeof VALIDATOR_INTERNAL_OPERATIONS)[number]

export type ExperimentalValidatorInternalClient = {
  ready: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'isReady'>>
  live: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'isLive'>>
  getValidatorUserInfo: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'getValidatorUserInfo'>>
  register: (
    request: JsonRequestBody<'register'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'register'>>
  onboardUser: (
    request: JsonRequestBody<'onboardUser'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'onboardUser'>>
  listUsers: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'listUsers'>>
  offboardUser: (
    request: QueryParameters<'offboardUser'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'offboardUser'>>
  dumpParticipantIdentities: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'dumpParticipantIdentities'>>
  getDecentralizedSynchronizerConnectionConfig: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'getDecentralizedSynchronizerConnectionConfig'>>
  getValidatorDomainDataSnapshot: (
    request: QueryParameters<'getValidatorDomainDataSnapshot'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'getValidatorDomainDataSnapshot'>>
  lookupTransferPreapprovalByParty: (
    request: PathParameters<'lookupTransferPreapprovalByParty'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'lookupTransferPreapprovalByParty'>>
  cancelTransferPreapprovalByParty: (
    request: PathParameters<'cancelTransferPreapprovalByParty'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'cancelTransferPreapprovalByParty'>>
  listTransferPreapprovals: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'listTransferPreapprovals'>>
  prepareTransferPreapprovalSend: (
    request: JsonRequestBody<'prepareTransferPreapprovalSend'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'prepareTransferPreapprovalSend'>>
  submitTransferPreapprovalSend: (
    request: JsonRequestBody<'submitTransferPreapprovalSend'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'submitTransferPreapprovalSend'>>
  generateExternalPartyTopology: (
    request: JsonRequestBody<'generateExternalPartyTopology'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'generateExternalPartyTopology'>>
  submitExternalPartyTopology: (
    request: JsonRequestBody<'submitExternalPartyTopology'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'submitExternalPartyTopology'>>
  createExternalPartySetupProposal: (
    request: JsonRequestBody<'createExternalPartySetupProposal'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'createExternalPartySetupProposal'>>
  listExternalPartySetupProposals: (
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'listExternalPartySetupProposals'>>
  prepareAcceptExternalPartySetupProposal: (
    request: JsonRequestBody<'prepareAcceptExternalPartySetupProposal'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'prepareAcceptExternalPartySetupProposal'>>
  submitAcceptExternalPartySetupProposal: (
    request: JsonRequestBody<'submitAcceptExternalPartySetupProposal'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'submitAcceptExternalPartySetupProposal'>>
  getExternalPartyBalance: (
    request: QueryParameters<'getExternalPartyBalance'>,
    options?: ExperimentalValidatorInternalRequestOptions,
  ) => Promise<SuccessResponse<'getExternalPartyBalance'>>
}

export function createExperimentalValidatorInternalClient(
  config: ExperimentalValidatorInternalClientConfig,
): ExperimentalValidatorInternalClient {
  const transport = jsonApi(config)

  return {
    async ready(options) {
      return await transport.request<SuccessResponse<'isReady'>>({
        method: 'GET',
        path: '/readyz',
        signal: options?.signal,
      })
    },

    async live(options) {
      return await transport.request<SuccessResponse<'isLive'>>({
        method: 'GET',
        path: '/livez',
        signal: options?.signal,
      })
    },

    async getValidatorUserInfo(options) {
      return await transport.request<SuccessResponse<'getValidatorUserInfo'>>({
        method: 'GET',
        path: '/v0/validator-user',
        signal: options?.signal,
      })
    },

    async register(request, options) {
      return await transport.request<SuccessResponse<'register'>>({
        method: 'POST',
        path: '/v0/register',
        body: request,
        signal: options?.signal,
      })
    },

    async onboardUser(request, options) {
      return await transport.request<SuccessResponse<'onboardUser'>>({
        method: 'POST',
        path: '/v0/admin/users',
        body: request,
        signal: options?.signal,
      })
    },

    async listUsers(options) {
      return await transport.request<SuccessResponse<'listUsers'>>({
        method: 'GET',
        path: '/v0/admin/users',
        signal: options?.signal,
      })
    },

    async offboardUser(request, options) {
      return await transport.request<SuccessResponse<'offboardUser'>>({
        method: 'POST',
        path: buildRequestPath('/v0/admin/users/offboard', {
          query: request as QueryParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async dumpParticipantIdentities(options) {
      return await transport.request<SuccessResponse<'dumpParticipantIdentities'>>({
        method: 'GET',
        path: '/v0/admin/participant/identities',
        signal: options?.signal,
      })
    },

    async getDecentralizedSynchronizerConnectionConfig(options) {
      return await transport.request<SuccessResponse<'getDecentralizedSynchronizerConnectionConfig'>>(
        {
          method: 'GET',
          path: '/v0/admin/participant/global-domain-connection-config',
          signal: options?.signal,
        },
      )
    },

    async getValidatorDomainDataSnapshot(request, options) {
      return await transport.request<SuccessResponse<'getValidatorDomainDataSnapshot'>>({
        method: 'GET',
        path: buildRequestPath('/v0/admin/domain/data-snapshot', {
          query: request as QueryParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async lookupTransferPreapprovalByParty(request, options) {
      return await transport.request<SuccessResponse<'lookupTransferPreapprovalByParty'>>({
        method: 'GET',
        path: buildRequestPath('/v0/admin/transfer-preapprovals/by-party/{receiver-party}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async cancelTransferPreapprovalByParty(request, options) {
      return await transport.request<SuccessResponse<'cancelTransferPreapprovalByParty'>>({
        method: 'DELETE',
        path: buildRequestPath('/v0/admin/transfer-preapprovals/by-party/{receiver-party}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async listTransferPreapprovals(options) {
      return await transport.request<SuccessResponse<'listTransferPreapprovals'>>({
        method: 'GET',
        path: '/v0/admin/transfer-preapprovals',
        signal: options?.signal,
      })
    },

    async prepareTransferPreapprovalSend(request, options) {
      return await transport.request<SuccessResponse<'prepareTransferPreapprovalSend'>>({
        method: 'POST',
        path: '/v0/admin/external-party/transfer-preapproval/prepare-send',
        body: request,
        signal: options?.signal,
      })
    },

    async submitTransferPreapprovalSend(request, options) {
      return await transport.request<SuccessResponse<'submitTransferPreapprovalSend'>>({
        method: 'POST',
        path: '/v0/admin/external-party/transfer-preapproval/submit-send',
        body: request,
        signal: options?.signal,
      })
    },

    async generateExternalPartyTopology(request, options) {
      return await transport.request<SuccessResponse<'generateExternalPartyTopology'>>({
        method: 'POST',
        path: '/v0/admin/external-party/topology/generate',
        body: request,
        signal: options?.signal,
      })
    },

    async submitExternalPartyTopology(request, options) {
      return await transport.request<SuccessResponse<'submitExternalPartyTopology'>>({
        method: 'POST',
        path: '/v0/admin/external-party/topology/submit',
        body: request,
        signal: options?.signal,
      })
    },

    async createExternalPartySetupProposal(request, options) {
      return await transport.request<SuccessResponse<'createExternalPartySetupProposal'>>({
        method: 'POST',
        path: '/v0/admin/external-party/setup-proposal',
        body: request,
        signal: options?.signal,
      })
    },

    async listExternalPartySetupProposals(options) {
      return await transport.request<SuccessResponse<'listExternalPartySetupProposals'>>({
        method: 'GET',
        path: '/v0/admin/external-party/setup-proposal',
        signal: options?.signal,
      })
    },

    async prepareAcceptExternalPartySetupProposal(request, options) {
      return await transport.request<SuccessResponse<'prepareAcceptExternalPartySetupProposal'>>({
        method: 'POST',
        path: '/v0/admin/external-party/setup-proposal/prepare-accept',
        body: request,
        signal: options?.signal,
      })
    },

    async submitAcceptExternalPartySetupProposal(request, options) {
      return await transport.request<SuccessResponse<'submitAcceptExternalPartySetupProposal'>>({
        method: 'POST',
        path: '/v0/admin/external-party/setup-proposal/submit-accept',
        body: request,
        signal: options?.signal,
      })
    },

    async getExternalPartyBalance(request, options) {
      return await transport.request<SuccessResponse<'getExternalPartyBalance'>>({
        method: 'GET',
        path: buildRequestPath('/v0/admin/external-party/balance', {
          query: request as QueryParametersRecord,
        }),
        signal: options?.signal,
      })
    },
  }
}

function buildRequestPath(
  pathTemplate: string,
  options?: {
    pathParams?: PathParametersRecord
    query?: QueryParametersRecord
  },
): string {
  const path = interpolatePathParams(pathTemplate, options?.pathParams)
  const queryString = buildQueryString(options?.query)
  return queryString.length === 0 ? path : `${path}?${queryString}`
}

function interpolatePathParams(
  pathTemplate: string,
  pathParams?: PathParametersRecord,
): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = pathParams?.[key]
    if (value === undefined) {
      throw new Error(`Missing required experimental validator path parameter: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

function buildQueryString(query?: QueryParametersRecord): string {
  if (query === undefined) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
      continue
    }

    params.append(key, String(value))
  }

  return params.toString()
}
