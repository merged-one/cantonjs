import { HttpError, jsonApi, type TransportConfig } from 'cantonjs'
import type { components, operations } from './generated/walletExternal.types.js'

type Primitive = string | number | boolean
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

type PathParameters<TName extends OperationName> =
  operations[TName] extends { parameters: { path?: infer T } } ? T : never

export type LegacyWalletClientConfig = TransportConfig

export type LegacyWalletRequestOptions = {
  readonly signal?: AbortSignal
}

export type LegacyWalletTransferOffer = components['schemas']['Contract']
export type LegacyWalletCreateTransferOfferRequest = JsonRequestBody<'createTransferOffer'>
export type LegacyWalletCreateTransferOfferResponse = JsonResponse<'createTransferOffer'>
export type LegacyWalletListTransferOffersResponse = JsonResponse<'listTransferOffers'>
export type LegacyWalletGetTransferOfferStatusRequest = PathParameters<'getTransferOfferStatus'>
export type LegacyWalletTransferOfferStatusResponse = JsonResponse<'getTransferOfferStatus'>
export type LegacyWalletTransferOfferStatus = LegacyWalletTransferOfferStatusResponse['status']
export type LegacyWalletCreateBuyTrafficRequest = JsonRequestBody<'createBuyTrafficRequest'>
export type LegacyWalletCreateBuyTrafficRequestResponse = JsonResponse<'createBuyTrafficRequest'>
export type LegacyWalletGetBuyTrafficRequestStatusRequest =
  PathParameters<'getBuyTrafficRequestStatus'>
export type LegacyWalletBuyTrafficRequestStatusResponse = JsonResponse<'getBuyTrafficRequestStatus'>
export type LegacyWalletBuyTrafficRequestStatus =
  LegacyWalletBuyTrafficRequestStatusResponse['status']

export type LegacyWalletClient = {
  createTransferOffer: (
    request: LegacyWalletCreateTransferOfferRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletCreateTransferOfferResponse>
  listTransferOffers: (
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletListTransferOffersResponse>
  getTransferOfferStatus: (
    request: LegacyWalletGetTransferOfferStatusRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletTransferOfferStatusResponse>
  lookupTransferOfferStatus: (
    request: LegacyWalletGetTransferOfferStatusRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletTransferOfferStatusResponse | undefined>
  createBuyTrafficRequest: (
    request: LegacyWalletCreateBuyTrafficRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletCreateBuyTrafficRequestResponse>
  getBuyTrafficRequestStatus: (
    request: LegacyWalletGetBuyTrafficRequestStatusRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletBuyTrafficRequestStatusResponse>
  lookupBuyTrafficRequestStatus: (
    request: LegacyWalletGetBuyTrafficRequestStatusRequest,
    options?: LegacyWalletRequestOptions,
  ) => Promise<LegacyWalletBuyTrafficRequestStatusResponse | undefined>
}

export function createLegacyWalletClient(
  config: LegacyWalletClientConfig,
): LegacyWalletClient {
  const transport = jsonApi(config)

  return {
    async createTransferOffer(request, options) {
      return await transport.request<LegacyWalletCreateTransferOfferResponse>({
        method: 'POST',
        path: '/v0/wallet/transfer-offers',
        body: request,
        signal: options?.signal,
      })
    },

    async listTransferOffers(options) {
      return await transport.request<LegacyWalletListTransferOffersResponse>({
        method: 'GET',
        path: '/v0/wallet/transfer-offers',
        signal: options?.signal,
      })
    },

    async getTransferOfferStatus(request, options) {
      return await transport.request<LegacyWalletTransferOfferStatusResponse>({
        method: 'POST',
        path: buildPath('/v0/wallet/transfer-offers/{tracking_id}/status', request),
        signal: options?.signal,
      })
    },

    async lookupTransferOfferStatus(request, options) {
      try {
        return await this.getTransferOfferStatus(request, options)
      } catch (error) {
        if (isNotFoundHttpError(error)) {
          return undefined
        }
        throw error
      }
    },

    async createBuyTrafficRequest(request, options) {
      return await transport.request<LegacyWalletCreateBuyTrafficRequestResponse>({
        method: 'POST',
        path: '/v0/wallet/buy-traffic-requests',
        body: request,
        signal: options?.signal,
      })
    },

    async getBuyTrafficRequestStatus(request, options) {
      return await transport.request<LegacyWalletBuyTrafficRequestStatusResponse>({
        method: 'POST',
        path: buildPath('/v0/wallet/buy-traffic-requests/{tracking_id}/status', request),
        signal: options?.signal,
      })
    },

    async lookupBuyTrafficRequestStatus(request, options) {
      try {
        return await this.getBuyTrafficRequestStatus(request, options)
      } catch (error) {
        if (isNotFoundHttpError(error)) {
          return undefined
        }
        throw error
      }
    },
  }
}

function buildPath(pathTemplate: string, pathParams: PathParametersRecord): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = pathParams[key]
    if (value === undefined) {
      throw new Error(`Missing required legacy wallet path parameter: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

function isNotFoundHttpError(error: unknown): error is HttpError {
  return (
    error instanceof HttpError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      'status' in error &&
      error.name === 'HttpError' &&
      error.status === 404)
  )
}
