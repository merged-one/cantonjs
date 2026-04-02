import { jsonApi, type TransportConfig } from 'cantonjs'
import type { operations } from '../generated/scanProxy.types.js'

type Primitive = string | number | boolean
type QueryValue = Primitive | readonly Primitive[] | undefined | null
type QueryParametersRecord = Readonly<Record<string, QueryValue>>
type PathParametersRecord = Readonly<Record<string, Primitive>>

type OperationName = keyof operations

type JsonResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'application/json': infer T } } } }
    ? T
    : never

type JsonRequestBody<TName extends OperationName> =
  operations[TName] extends { requestBody: { content: { 'application/json': infer T } } }
    ? T
    : never

type QueryParameters<TName extends OperationName> =
  operations[TName] extends { parameters: { query?: infer T } } ? T : never

type PathParameters<TName extends OperationName> =
  operations[TName] extends { parameters: { path?: infer T } } ? T : never

export type ExperimentalScanProxyClientConfig = TransportConfig

export type ExperimentalScanProxyRequestOptions = {
  readonly signal?: AbortSignal
}

export const EXPERIMENTAL_SCAN_PROXY_OPERATIONS = [
  {
    clientMethod: 'lookupFeaturedAppRight',
    proxyOperationId: 'lookupFeaturedAppRight',
    scanOperationId: 'lookupFeaturedAppRight',
    method: 'GET',
    path: '/v0/scan-proxy/featured-apps/{provider_party_id}',
  },
  {
    clientMethod: 'getAmuletRules',
    proxyOperationId: 'getAmuletRules',
    scanOperationId: 'getAmuletRules',
    method: 'GET',
    path: '/v0/scan-proxy/amulet-rules',
  },
  {
    clientMethod: 'getAnsRules',
    proxyOperationId: 'getAnsRules',
    scanOperationId: 'getAnsRules',
    method: 'POST',
    path: '/v0/scan-proxy/ans-rules',
  },
  {
    clientMethod: 'lookupTransferPreapprovalByParty',
    proxyOperationId: 'lookupTransferPreapprovalByParty',
    scanOperationId: 'lookupTransferPreapprovalByParty',
    method: 'GET',
    path: '/v0/scan-proxy/transfer-preapprovals/by-party/{party}',
  },
  {
    clientMethod: 'lookupTransferCommandCounterByParty',
    proxyOperationId: 'lookupTransferCommandCounterByParty',
    scanOperationId: 'lookupTransferCommandCounterByParty',
    method: 'GET',
    path: '/v0/scan-proxy/transfer-command-counter/{party}',
  },
  {
    clientMethod: 'lookupTransferCommandStatus',
    proxyOperationId: 'lookupTransferCommandStatus',
    scanOperationId: 'lookupTransferCommandStatus',
    method: 'GET',
    path: '/v0/scan-proxy/transfer-command/status',
  },
] as const

export type ExperimentalScanProxyOperation = (typeof EXPERIMENTAL_SCAN_PROXY_OPERATIONS)[number]

export type ExperimentalScanProxyClient = {
  lookupFeaturedAppRight: (
    request: PathParameters<'lookupFeaturedAppRight'>,
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'lookupFeaturedAppRight'>>
  getAmuletRules: (
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'getAmuletRules'>>
  getAnsRules: (
    request: JsonRequestBody<'getAnsRules'>,
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'getAnsRules'>>
  lookupTransferPreapprovalByParty: (
    request: PathParameters<'lookupTransferPreapprovalByParty'>,
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'lookupTransferPreapprovalByParty'>>
  lookupTransferCommandCounterByParty: (
    request: PathParameters<'lookupTransferCommandCounterByParty'>,
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'lookupTransferCommandCounterByParty'>>
  lookupTransferCommandStatus: (
    request: QueryParameters<'lookupTransferCommandStatus'>,
    options?: ExperimentalScanProxyRequestOptions,
  ) => Promise<JsonResponse<'lookupTransferCommandStatus'>>
}

export function createExperimentalScanProxyClient(
  config: ExperimentalScanProxyClientConfig,
): ExperimentalScanProxyClient {
  const transport = jsonApi(config)

  return {
    async lookupFeaturedAppRight(request, options) {
      return await transport.request<JsonResponse<'lookupFeaturedAppRight'>>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/featured-apps/{provider_party_id}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async getAmuletRules(options) {
      return await transport.request<JsonResponse<'getAmuletRules'>>({
        method: 'GET',
        path: '/v0/scan-proxy/amulet-rules',
        signal: options?.signal,
      })
    },

    async getAnsRules(request, options) {
      return await transport.request<JsonResponse<'getAnsRules'>>({
        method: 'POST',
        path: '/v0/scan-proxy/ans-rules',
        body: request,
        signal: options?.signal,
      })
    },

    async lookupTransferPreapprovalByParty(request, options) {
      return await transport.request<JsonResponse<'lookupTransferPreapprovalByParty'>>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/transfer-preapprovals/by-party/{party}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async lookupTransferCommandCounterByParty(request, options) {
      return await transport.request<JsonResponse<'lookupTransferCommandCounterByParty'>>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/transfer-command-counter/{party}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async lookupTransferCommandStatus(request, options) {
      return await transport.request<JsonResponse<'lookupTransferCommandStatus'>>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/transfer-command/status', {
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
      throw new Error(`Missing required experimental Scan Proxy path parameter: ${key}`)
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
