import { jsonApi, type TransportConfig } from 'cantonjs'
import type { components, operations } from './generated/ans.types.js'

type OperationName = keyof operations

type JsonResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'application/json': infer T } } } }
    ? T
    : never

type JsonRequestBody<TName extends OperationName> =
  operations[TName] extends { requestBody: { content: { 'application/json': infer T } } }
    ? T
    : never

export type AnsClientConfig = TransportConfig

export type AnsRequestOptions = {
  readonly signal?: AbortSignal
}

export type AnsEntry = components['schemas']['AnsEntryResponse']
export type AnsCreateEntryRequest = JsonRequestBody<'createAnsEntry'>
export type AnsCreateEntryResponse = JsonResponse<'createAnsEntry'>
export type AnsListEntriesResponse = JsonResponse<'listAnsEntries'>

export type AnsClient = {
  createAnsEntry: (
    request: AnsCreateEntryRequest,
    options?: AnsRequestOptions,
  ) => Promise<AnsCreateEntryResponse>
  listAnsEntries: (options?: AnsRequestOptions) => Promise<AnsListEntriesResponse>
}

export function createAnsClient(config: AnsClientConfig): AnsClient {
  const transport = jsonApi(config)

  return {
    async createAnsEntry(request, options) {
      return await transport.request<AnsCreateEntryResponse>({
        method: 'POST',
        path: '/v0/entry/create',
        body: request,
        signal: options?.signal,
      })
    },

    async listAnsEntries(options) {
      return await transport.request<AnsListEntriesResponse>({
        method: 'GET',
        path: '/v0/entry/all',
        signal: options?.signal,
      })
    },
  }
}
