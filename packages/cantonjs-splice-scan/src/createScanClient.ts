import type { components, operations } from './generated/scan.types.js'
import {
  createScanHttpClient,
  type ScanHttpClientConfig,
  type ScanHttpQuery,
} from './http/createScanHttpClient.js'

type OperationName = keyof operations

type JsonResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'application/json': infer T } } } }
    ? T
    : never

type TextResponse<TName extends OperationName> =
  operations[TName] extends { responses: { 200: { content: { 'text/plain': infer T } } } }
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

type OptionalObject<T> = [T] extends [never] ? {} : T

type PathAndQueryParameters<TName extends OperationName> =
  OptionalObject<PathParameters<TName>> & OptionalObject<QueryParameters<TName>>

type DamlValueEncoding = components['schemas']['DamlValueEncoding']

export type ScanClientConfig = ScanHttpClientConfig

export type ScanRequestOptions = {
  readonly signal?: AbortSignal
}

export type ScanStatusResponse = JsonResponse<'status'>
export type ScanDsoInfoResponse = JsonResponse<'getDsoInfo'>
export type ScanValidatorFaucetsRequest = QueryParameters<'getValidatorFaucetsByValidator'>
export type ScanValidatorFaucetsResponse = JsonResponse<'getValidatorFaucetsByValidator'>
export type ScanDsoScansResponse = JsonResponse<'listDsoScans'>
export type ScanValidatorLicensesRequest = QueryParameters<'listValidatorLicenses'>
export type ScanValidatorLicensesResponse = JsonResponse<'listValidatorLicenses'>
export type ScanDsoSequencersResponse = JsonResponse<'listDsoSequencers'>
export type ScanPartyToParticipantRequest = PathParameters<'getPartyToParticipant'>
export type ScanPartyToParticipantResponse = JsonResponse<'getPartyToParticipant'>
export type ScanPartyToParticipantsRequest = PathParameters<'getPartyToParticipantV1'>
export type ScanPartyToParticipantsResponse = JsonResponse<'getPartyToParticipantV1'>
export type ScanMemberTrafficStatusRequest = PathParameters<'getMemberTrafficStatus'>
export type ScanMemberTrafficStatusResponse = JsonResponse<'getMemberTrafficStatus'>
export type ScanClosedRoundsResponse = JsonResponse<'getClosedRounds'>
export type ScanOpenAndIssuingMiningRoundsRequest =
  JsonRequestBody<'getOpenAndIssuingMiningRounds'>
export type ScanOpenAndIssuingMiningRoundsResponse =
  JsonResponse<'getOpenAndIssuingMiningRounds'>
export type ScanUpdateHistoryRequest = JsonRequestBody<'getUpdateHistoryV2'>
export type ScanUpdateHistoryResponse = JsonResponse<'getUpdateHistoryV2'>
export type ScanUpdateHistoryItem = components['schemas']['UpdateHistoryItemV2']
export type ScanUpdateCursor = components['schemas']['UpdateHistoryRequestAfter']
export type ScanGetUpdateByIdRequest = {
  readonly update_id: PathParameters<'getUpdateByIdV2'>['update_id']
  readonly daml_value_encoding?: DamlValueEncoding
}
export type ScanAcsSnapshotTimestampRequest =
  PathAndQueryParameters<'getDateOfMostRecentSnapshotBefore'>
export type ScanAcsSnapshotTimestampResponse =
  JsonResponse<'getDateOfMostRecentSnapshotBefore'>
export type ScanAcsSnapshotRequest = JsonRequestBody<'getAcsSnapshotAt'>
export type ScanAcsSnapshotResponse = JsonResponse<'getAcsSnapshotAt'>
export type ScanHoldingsStateRequest = JsonRequestBody<'getHoldingsStateAt'>
export type ScanHoldingsStateResponse = JsonResponse<'getHoldingsStateAt'>
export type ScanHoldingsSummaryRequest = JsonRequestBody<'getHoldingsSummaryAt'>
export type ScanHoldingsSummaryResponse = JsonResponse<'getHoldingsSummaryAt'>
export type ScanAnsEntriesRequest = QueryParameters<'listAnsEntries'>
export type ScanAnsEntriesResponse = JsonResponse<'listAnsEntries'>
export type ScanAnsEntryByPartyRequest = PathParameters<'lookupAnsEntryByParty'>
export type ScanAnsEntryByPartyResponse = JsonResponse<'lookupAnsEntryByParty'>
export type ScanAnsEntryByNameRequest = PathParameters<'lookupAnsEntryByName'>
export type ScanAnsEntryByNameResponse = JsonResponse<'lookupAnsEntryByName'>
export type ScanDsoPartyIdResponse = JsonResponse<'getDsoPartyId'>
export type ScanEventHistoryRequest = JsonRequestBody<'getEventHistory'>
export type ScanEventHistoryResponse = JsonResponse<'getEventHistory'>
export type ScanGetEventByIdRequest = {
  readonly update_id: PathParameters<'getEventById'>['update_id']
  readonly daml_value_encoding?: DamlValueEncoding
}
export type ScanEventHistoryItem = JsonResponse<'getEventById'>
export type ScanUnclaimedDevelopmentFundCouponsResponse =
  JsonResponse<'listUnclaimedDevelopmentFundCoupons'>

export type ScanClient = {
  ready: (options?: ScanRequestOptions) => Promise<TextResponse<'readyz'>>
  live: (options?: ScanRequestOptions) => Promise<TextResponse<'livez'>>
  status: (options?: ScanRequestOptions) => Promise<ScanStatusResponse>
  version: (options?: ScanRequestOptions) => Promise<TextResponse<'version'>>
  getDsoInfo: (options?: ScanRequestOptions) => Promise<ScanDsoInfoResponse>
  getValidatorFaucetsByValidator: (
    request: ScanValidatorFaucetsRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanValidatorFaucetsResponse>
  listDsoScans: (options?: ScanRequestOptions) => Promise<ScanDsoScansResponse>
  listValidatorLicenses: (
    request?: ScanValidatorLicensesRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanValidatorLicensesResponse>
  listDsoSequencers: (options?: ScanRequestOptions) => Promise<ScanDsoSequencersResponse>
  getPartyToParticipant: (
    request: ScanPartyToParticipantRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanPartyToParticipantResponse>
  getPartyToParticipants: (
    request: ScanPartyToParticipantsRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanPartyToParticipantsResponse>
  getMemberTrafficStatus: (
    request: ScanMemberTrafficStatusRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanMemberTrafficStatusResponse>
  getClosedRounds: (options?: ScanRequestOptions) => Promise<ScanClosedRoundsResponse>
  getOpenAndIssuingMiningRounds: (
    request: ScanOpenAndIssuingMiningRoundsRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanOpenAndIssuingMiningRoundsResponse>
  getUpdates: (
    request: ScanUpdateHistoryRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanUpdateHistoryResponse>
  iterateUpdates: (
    request: ScanUpdateHistoryRequest,
    options?: ScanRequestOptions,
  ) => AsyncIterableIterator<ScanUpdateHistoryItem>
  getUpdateById: (
    request: ScanGetUpdateByIdRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanUpdateHistoryItem>
  getDateOfMostRecentSnapshotBefore: (
    request: ScanAcsSnapshotTimestampRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanAcsSnapshotTimestampResponse>
  getDateOfFirstSnapshotAfter: (
    request: PathAndQueryParameters<'getDateOfFirstSnapshotAfter'>,
    options?: ScanRequestOptions,
  ) => Promise<ScanAcsSnapshotTimestampResponse>
  getAcsSnapshotAt: (
    request: ScanAcsSnapshotRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanAcsSnapshotResponse>
  forceAcsSnapshotNow: (options?: ScanRequestOptions) => Promise<JsonResponse<'forceAcsSnapshotNow'>>
  getHoldingsStateAt: (
    request: ScanHoldingsStateRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanHoldingsStateResponse>
  getHoldingsSummaryAt: (
    request: ScanHoldingsSummaryRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanHoldingsSummaryResponse>
  listAnsEntries: (
    request: ScanAnsEntriesRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanAnsEntriesResponse>
  lookupAnsEntryByParty: (
    request: ScanAnsEntryByPartyRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanAnsEntryByPartyResponse>
  lookupAnsEntryByName: (
    request: ScanAnsEntryByNameRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanAnsEntryByNameResponse>
  getDsoPartyId: (options?: ScanRequestOptions) => Promise<ScanDsoPartyIdResponse>
  getEvents: (
    request: ScanEventHistoryRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanEventHistoryResponse>
  getEventById: (
    request: ScanGetEventByIdRequest,
    options?: ScanRequestOptions,
  ) => Promise<ScanEventHistoryItem>
  listUnclaimedDevelopmentFundCoupons: (
    options?: ScanRequestOptions,
  ) => Promise<ScanUnclaimedDevelopmentFundCouponsResponse>
}

export const PUBLIC_SCAN_OPERATIONS = [
  { clientMethod: 'ready', operationId: 'readyz', method: 'GET', path: '/readyz' },
  { clientMethod: 'live', operationId: 'livez', method: 'GET', path: '/livez' },
  { clientMethod: 'status', operationId: 'status', method: 'GET', path: '/status' },
  { clientMethod: 'version', operationId: 'version', method: 'GET', path: '/version' },
  { clientMethod: 'getDsoInfo', operationId: 'getDsoInfo', method: 'GET', path: '/v0/dso' },
  {
    clientMethod: 'getValidatorFaucetsByValidator',
    operationId: 'getValidatorFaucetsByValidator',
    method: 'GET',
    path: '/v0/validators/validator-faucets',
  },
  { clientMethod: 'listDsoScans', operationId: 'listDsoScans', method: 'GET', path: '/v0/scans' },
  {
    clientMethod: 'listValidatorLicenses',
    operationId: 'listValidatorLicenses',
    method: 'GET',
    path: '/v0/admin/validator/licenses',
  },
  {
    clientMethod: 'listDsoSequencers',
    operationId: 'listDsoSequencers',
    method: 'GET',
    path: '/v0/dso-sequencers',
  },
  {
    clientMethod: 'getPartyToParticipant',
    operationId: 'getPartyToParticipant',
    method: 'GET',
    path: '/v0/domains/{domain_id}/parties/{party_id}/participant-id',
  },
  {
    clientMethod: 'getPartyToParticipants',
    operationId: 'getPartyToParticipantV1',
    method: 'GET',
    path: '/v1/domains/{domain_id}/parties/{party_id}/participant-id',
  },
  {
    clientMethod: 'getMemberTrafficStatus',
    operationId: 'getMemberTrafficStatus',
    method: 'GET',
    path: '/v0/domains/{domain_id}/members/{member_id}/traffic-status',
  },
  {
    clientMethod: 'getClosedRounds',
    operationId: 'getClosedRounds',
    method: 'GET',
    path: '/v0/closed-rounds',
  },
  {
    clientMethod: 'getOpenAndIssuingMiningRounds',
    operationId: 'getOpenAndIssuingMiningRounds',
    method: 'POST',
    path: '/v0/open-and-issuing-mining-rounds',
  },
  {
    clientMethod: 'getUpdates',
    operationId: 'getUpdateHistoryV2',
    method: 'POST',
    path: '/v2/updates',
  },
  {
    clientMethod: 'getUpdateById',
    operationId: 'getUpdateByIdV2',
    method: 'GET',
    path: '/v2/updates/{update_id}',
  },
  {
    clientMethod: 'getDateOfMostRecentSnapshotBefore',
    operationId: 'getDateOfMostRecentSnapshotBefore',
    method: 'GET',
    path: '/v0/state/acs/snapshot-timestamp',
  },
  {
    clientMethod: 'getDateOfFirstSnapshotAfter',
    operationId: 'getDateOfFirstSnapshotAfter',
    method: 'GET',
    path: '/v0/state/acs/snapshot-timestamp-after',
  },
  {
    clientMethod: 'getAcsSnapshotAt',
    operationId: 'getAcsSnapshotAt',
    method: 'POST',
    path: '/v0/state/acs',
  },
  {
    clientMethod: 'forceAcsSnapshotNow',
    operationId: 'forceAcsSnapshotNow',
    method: 'POST',
    path: '/v0/state/acs/force',
  },
  {
    clientMethod: 'getHoldingsStateAt',
    operationId: 'getHoldingsStateAt',
    method: 'POST',
    path: '/v0/holdings/state',
  },
  {
    clientMethod: 'getHoldingsSummaryAt',
    operationId: 'getHoldingsSummaryAt',
    method: 'POST',
    path: '/v0/holdings/summary',
  },
  {
    clientMethod: 'listAnsEntries',
    operationId: 'listAnsEntries',
    method: 'GET',
    path: '/v0/ans-entries',
  },
  {
    clientMethod: 'lookupAnsEntryByParty',
    operationId: 'lookupAnsEntryByParty',
    method: 'GET',
    path: '/v0/ans-entries/by-party/{party}',
  },
  {
    clientMethod: 'lookupAnsEntryByName',
    operationId: 'lookupAnsEntryByName',
    method: 'GET',
    path: '/v0/ans-entries/by-name/{name}',
  },
  {
    clientMethod: 'getDsoPartyId',
    operationId: 'getDsoPartyId',
    method: 'GET',
    path: '/v0/dso-party-id',
  },
  {
    clientMethod: 'getEvents',
    operationId: 'getEventHistory',
    method: 'POST',
    path: '/v0/events',
  },
  {
    clientMethod: 'getEventById',
    operationId: 'getEventById',
    method: 'GET',
    path: '/v0/events/{update_id}',
  },
  {
    clientMethod: 'listUnclaimedDevelopmentFundCoupons',
    operationId: 'listUnclaimedDevelopmentFundCoupons',
    method: 'GET',
    path: '/v0/unclaimed-development-fund-coupons',
  },
] as const

export type PublicScanOperation = (typeof PUBLIC_SCAN_OPERATIONS)[number]

export function createScanClient(config: ScanClientConfig): ScanClient {
  const http = createScanHttpClient(config)

  return {
    ready(options) {
      return http.getText('/readyz', { signal: options?.signal })
    },

    live(options) {
      return http.getText('/livez', { signal: options?.signal })
    },

    status(options) {
      return http.getJson('/status', { signal: options?.signal })
    },

    version(options) {
      return http.getText('/version', { signal: options?.signal })
    },

    getDsoInfo(options) {
      return http.getJson('/v0/dso', { signal: options?.signal })
    },

    getValidatorFaucetsByValidator(request, options) {
      return http.getJson('/v0/validators/validator-faucets', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    listDsoScans(options) {
      return http.getJson('/v0/scans', { signal: options?.signal })
    },

    listValidatorLicenses(request, options) {
      return http.getJson('/v0/admin/validator/licenses', {
        query: request as unknown as ScanHttpQuery | undefined,
        signal: options?.signal,
      })
    },

    listDsoSequencers(options) {
      return http.getJson('/v0/dso-sequencers', { signal: options?.signal })
    },

    getPartyToParticipant(request, options) {
      return http.getJson('/v0/domains/{domain_id}/parties/{party_id}/participant-id', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getPartyToParticipants(request, options) {
      return http.getJson('/v1/domains/{domain_id}/parties/{party_id}/participant-id', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getMemberTrafficStatus(request, options) {
      return http.getJson('/v0/domains/{domain_id}/members/{member_id}/traffic-status', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getClosedRounds(options) {
      return http.getJson('/v0/closed-rounds', { signal: options?.signal })
    },

    getOpenAndIssuingMiningRounds(request, options) {
      return http.postJson('/v0/open-and-issuing-mining-rounds', request, {
        signal: options?.signal,
      })
    },

    getUpdates(request, options) {
      return http.postJson('/v2/updates', request, { signal: options?.signal })
    },

    async *iterateUpdates(request, options) {
      let after = request.after

      for (;;) {
        const pageRequest: ScanUpdateHistoryRequest =
          after === undefined ? { ...request } : { ...request, after }
        const page = await http.postJson<ScanUpdateHistoryResponse>('/v2/updates', pageRequest, {
          signal: options?.signal,
        })

        for (const item of page.transactions) {
          yield item
        }

        if (page.transactions.length < request.page_size) {
          return
        }

        const nextAfter = getNextUpdateCursor(page)
        if (nextAfter === undefined) {
          return
        }

        after = nextAfter
      }
    },

    getUpdateById(request, options) {
      return http.getJson('/v2/updates/{update_id}', {
        pathParams: { update_id: request.update_id },
        query: { daml_value_encoding: request.daml_value_encoding },
        signal: options?.signal,
      })
    },

    getDateOfMostRecentSnapshotBefore(request, options) {
      return http.getJson('/v0/state/acs/snapshot-timestamp', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getDateOfFirstSnapshotAfter(request, options) {
      return http.getJson('/v0/state/acs/snapshot-timestamp-after', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getAcsSnapshotAt(request, options) {
      return http.postJson('/v0/state/acs', request, { signal: options?.signal })
    },

    forceAcsSnapshotNow(options) {
      return http.postJson('/v0/state/acs/force', undefined, { signal: options?.signal })
    },

    getHoldingsStateAt(request, options) {
      return http.postJson('/v0/holdings/state', request, { signal: options?.signal })
    },

    getHoldingsSummaryAt(request, options) {
      return http.postJson('/v0/holdings/summary', request, { signal: options?.signal })
    },

    listAnsEntries(request, options) {
      return http.getJson('/v0/ans-entries', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    lookupAnsEntryByParty(request, options) {
      return http.getJson('/v0/ans-entries/by-party/{party}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    lookupAnsEntryByName(request, options) {
      return http.getJson('/v0/ans-entries/by-name/{name}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getDsoPartyId(options) {
      return http.getJson('/v0/dso-party-id', { signal: options?.signal })
    },

    getEvents(request, options) {
      return http.postJson('/v0/events', request, { signal: options?.signal })
    },

    getEventById(request, options) {
      return http.getJson('/v0/events/{update_id}', {
        pathParams: { update_id: request.update_id },
        query: { daml_value_encoding: request.daml_value_encoding },
        signal: options?.signal,
      })
    },

    listUnclaimedDevelopmentFundCoupons(options) {
      return http.getJson('/v0/unclaimed-development-fund-coupons', { signal: options?.signal })
    },
  }
}

export function getNextUpdateCursor(
  response: ScanUpdateHistoryResponse,
): ScanUpdateCursor | undefined {
  const lastItem = response.transactions.at(-1)
  if (lastItem === undefined) {
    return undefined
  }

  return {
    after_migration_id:
      'migration_id' in lastItem ? lastItem.migration_id : lastItem.event.migration_id,
    after_record_time: lastItem.record_time,
  }
}
