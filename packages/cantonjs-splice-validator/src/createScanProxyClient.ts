import { jsonApi, type TransportConfig } from 'cantonjs'
import type { components, operations } from './generated/scanProxy.types.js'

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

export type ScanProxyClientConfig = TransportConfig

export type ScanProxyRequestOptions = {
  readonly signal?: AbortSignal
}

export type ScanProxyAnsEntry = components['schemas']['AnsEntry']
export type ScanProxyDsoPartyIdResponse = JsonResponse<'getDsoPartyId'>
export type ScanProxyDsoInfoResponse = JsonResponse<'getDsoInfo'>
export type ScanProxyOpenAndIssuingMiningRoundsResponse =
  JsonResponse<'getOpenAndIssuingMiningRounds'>
export type ScanProxyListAnsEntriesRequest = QueryParameters<'listAnsEntries'>
export type ScanProxyListAnsEntriesResponse = JsonResponse<'listAnsEntries'>
export type ScanProxyLookupAnsEntryByPartyRequest = PathParameters<'lookupAnsEntryByParty'>
export type ScanProxyLookupAnsEntryByPartyResponse = JsonResponse<'lookupAnsEntryByParty'>
export type ScanProxyLookupAnsEntryByNameRequest = PathParameters<'lookupAnsEntryByName'>
export type ScanProxyLookupAnsEntryByNameResponse = JsonResponse<'lookupAnsEntryByName'>
export type ScanProxyHoldingsSummaryRequest = JsonRequestBody<'getHoldingsSummaryAt'>
export type ScanProxyHoldingsSummaryResponse = JsonResponse<'getHoldingsSummaryAt'>
export type ScanProxyUnclaimedDevelopmentFundCouponsResponse =
  JsonResponse<'listUnclaimedDevelopmentFundCoupons'>

export const GA_SCAN_PROXY_OPERATIONS = [
  {
    clientMethod: 'getDsoPartyId',
    proxyOperationId: 'getDsoPartyId',
    scanOperationId: 'getDsoPartyId',
    method: 'GET',
    path: '/v0/scan-proxy/dso-party-id',
  },
  {
    clientMethod: 'getDsoInfo',
    proxyOperationId: 'getDsoInfo',
    scanOperationId: 'getDsoInfo',
    method: 'GET',
    path: '/v0/scan-proxy/dso',
  },
  {
    clientMethod: 'getOpenAndIssuingMiningRounds',
    proxyOperationId: 'getOpenAndIssuingMiningRounds',
    scanOperationId: 'getOpenAndIssuingMiningRounds',
    method: 'GET',
    path: '/v0/scan-proxy/open-and-issuing-mining-rounds',
  },
  {
    clientMethod: 'lookupAnsEntryByParty',
    proxyOperationId: 'lookupAnsEntryByParty',
    scanOperationId: 'lookupAnsEntryByParty',
    method: 'GET',
    path: '/v0/scan-proxy/ans-entries/by-party/{party}',
  },
  {
    clientMethod: 'listAnsEntries',
    proxyOperationId: 'listAnsEntries',
    scanOperationId: 'listAnsEntries',
    method: 'GET',
    path: '/v0/scan-proxy/ans-entries',
  },
  {
    clientMethod: 'lookupAnsEntryByName',
    proxyOperationId: 'lookupAnsEntryByName',
    scanOperationId: 'lookupAnsEntryByName',
    method: 'GET',
    path: '/v0/scan-proxy/ans-entries/by-name/{name}',
  },
  {
    clientMethod: 'getHoldingsSummaryAt',
    proxyOperationId: 'getHoldingsSummaryAt',
    scanOperationId: 'getHoldingsSummaryAt',
    method: 'POST',
    path: '/v0/scan-proxy/holdings/summary',
  },
  {
    clientMethod: 'listUnclaimedDevelopmentFundCoupons',
    proxyOperationId: 'listUnclaimedDevelopmentFundCoupons',
    scanOperationId: 'listUnclaimedDevelopmentFundCoupons',
    method: 'GET',
    path: '/v0/scan-proxy/unclaimed-development-fund-coupons',
  },
] as const

export type GaScanProxyOperation = (typeof GA_SCAN_PROXY_OPERATIONS)[number]

export type ScanProxyClient = {
  getDsoPartyId: (options?: ScanProxyRequestOptions) => Promise<ScanProxyDsoPartyIdResponse>
  getDsoInfo: (options?: ScanProxyRequestOptions) => Promise<ScanProxyDsoInfoResponse>
  getOpenAndIssuingMiningRounds: (
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyOpenAndIssuingMiningRoundsResponse>
  listAnsEntries: (
    request: ScanProxyListAnsEntriesRequest,
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyListAnsEntriesResponse>
  lookupAnsEntryByParty: (
    request: ScanProxyLookupAnsEntryByPartyRequest,
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyLookupAnsEntryByPartyResponse>
  lookupAnsEntryByName: (
    request: ScanProxyLookupAnsEntryByNameRequest,
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyLookupAnsEntryByNameResponse>
  getHoldingsSummaryAt: (
    request: ScanProxyHoldingsSummaryRequest,
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyHoldingsSummaryResponse>
  listUnclaimedDevelopmentFundCoupons: (
    options?: ScanProxyRequestOptions,
  ) => Promise<ScanProxyUnclaimedDevelopmentFundCouponsResponse>
}

export function createScanProxyClient(config: ScanProxyClientConfig): ScanProxyClient {
  const transport = jsonApi(config)

  return {
    async getDsoPartyId(options) {
      return await transport.request<ScanProxyDsoPartyIdResponse>({
        method: 'GET',
        path: '/v0/scan-proxy/dso-party-id',
        signal: options?.signal,
      })
    },

    async getDsoInfo(options) {
      return await transport.request<ScanProxyDsoInfoResponse>({
        method: 'GET',
        path: '/v0/scan-proxy/dso',
        signal: options?.signal,
      })
    },

    async getOpenAndIssuingMiningRounds(options) {
      return await transport.request<ScanProxyOpenAndIssuingMiningRoundsResponse>({
        method: 'GET',
        path: '/v0/scan-proxy/open-and-issuing-mining-rounds',
        signal: options?.signal,
      })
    },

    async listAnsEntries(request, options) {
      return await transport.request<ScanProxyListAnsEntriesResponse>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/ans-entries', {
          query: request as QueryParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async lookupAnsEntryByParty(request, options) {
      return await transport.request<ScanProxyLookupAnsEntryByPartyResponse>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/ans-entries/by-party/{party}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async lookupAnsEntryByName(request, options) {
      return await transport.request<ScanProxyLookupAnsEntryByNameResponse>({
        method: 'GET',
        path: buildRequestPath('/v0/scan-proxy/ans-entries/by-name/{name}', {
          pathParams: request as PathParametersRecord,
        }),
        signal: options?.signal,
      })
    },

    async getHoldingsSummaryAt(request, options) {
      return await transport.request<ScanProxyHoldingsSummaryResponse>({
        method: 'POST',
        path: '/v0/scan-proxy/holdings/summary',
        body: request,
        signal: options?.signal,
      })
    },

    async listUnclaimedDevelopmentFundCoupons(options) {
      return await transport.request<ScanProxyUnclaimedDevelopmentFundCouponsResponse>({
        method: 'GET',
        path: '/v0/scan-proxy/unclaimed-development-fund-coupons',
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
      throw new Error(`Missing required Scan Proxy path parameter: ${key}`)
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
