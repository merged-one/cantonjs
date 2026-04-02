import type {
  ScanClientConfig as StableScanClientConfig,
  ScanRequestOptions as StableScanRequestOptions,
} from '../createScanClient.js'
import type { operations } from '../generated/scan.types.js'
import {
  createScanHttpClient,
  type ScanHttpQuery,
} from '../http/createScanHttpClient.js'

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

type OptionalObject<T> = [T] extends [never] ? {} : T

type PathAndQueryParameters<TName extends OperationName> =
  OptionalObject<PathParameters<TName>> & OptionalObject<QueryParameters<TName>>

export type ExperimentalScanClientConfig = StableScanClientConfig

export type ExperimentalScanRequestOptions = StableScanRequestOptions

export const INTERNAL_SCAN_OPERATIONS = [
  {
    clientMethod: 'listSvBftSequencers',
    operationId: 'listSvBftSequencers',
    method: 'GET',
    path: '/v0/sv-bft-sequencers',
    stability: 'internal',
  },
  {
    clientMethod: 'getAmuletRules',
    operationId: 'getAmuletRules',
    method: 'POST',
    path: '/v0/amulet-rules',
    stability: 'internal',
  },
  {
    clientMethod: 'getExternalPartyAmuletRules',
    operationId: 'getExternalPartyAmuletRules',
    method: 'POST',
    path: '/v0/external-party-amulet-rules',
    stability: 'internal',
  },
  {
    clientMethod: 'getAnsRules',
    operationId: 'getAnsRules',
    method: 'POST',
    path: '/v0/ans-rules',
    stability: 'internal',
  },
  {
    clientMethod: 'listFeaturedAppRights',
    operationId: 'listFeaturedAppRights',
    method: 'GET',
    path: '/v0/featured-apps',
    stability: 'internal',
  },
  {
    clientMethod: 'lookupFeaturedAppRight',
    operationId: 'lookupFeaturedAppRight',
    method: 'GET',
    path: '/v0/featured-apps/{provider_party_id}',
    stability: 'internal',
  },
  {
    clientMethod: 'getTopValidatorsByValidatorFaucets',
    operationId: 'getTopValidatorsByValidatorFaucets',
    method: 'GET',
    path: '/v0/top-validators-by-validator-faucets',
    stability: 'internal',
  },
  {
    clientMethod: 'lookupTransferPreapprovalByParty',
    operationId: 'lookupTransferPreapprovalByParty',
    method: 'GET',
    path: '/v0/transfer-preapprovals/by-party/{party}',
    stability: 'internal',
  },
  {
    clientMethod: 'lookupTransferCommandCounterByParty',
    operationId: 'lookupTransferCommandCounterByParty',
    method: 'GET',
    path: '/v0/transfer-command-counter/{party}',
    stability: 'internal',
  },
  {
    clientMethod: 'lookupTransferCommandStatus',
    operationId: 'lookupTransferCommandStatus',
    method: 'GET',
    path: '/v0/transfer-command/status',
    stability: 'internal',
  },
  {
    clientMethod: 'getMigrationSchedule',
    operationId: 'getMigrationSchedule',
    method: 'GET',
    path: '/v0/migrations/schedule',
    stability: 'internal',
  },
  {
    clientMethod: 'getSynchronizerIdentities',
    operationId: 'getSynchronizerIdentities',
    method: 'GET',
    path: '/v0/synchronizer-identities/{domain_id_prefix}',
    stability: 'internal',
  },
  {
    clientMethod: 'getSynchronizerBootstrappingTransactions',
    operationId: 'getSynchronizerBootstrappingTransactions',
    method: 'GET',
    path: '/v0/synchronizer-bootstrapping-transactions/{domain_id_prefix}',
    stability: 'internal',
  },
  {
    clientMethod: 'getSpliceInstanceNames',
    operationId: 'getSpliceInstanceNames',
    method: 'GET',
    path: '/v0/splice-instance-names',
    stability: 'internal',
  },
  {
    clientMethod: 'listAmuletPriceVotes',
    operationId: 'listAmuletPriceVotes',
    method: 'GET',
    path: '/v0/amulet-price/votes',
    stability: 'internal',
  },
  {
    clientMethod: 'listVoteRequestsByTrackingCid',
    operationId: 'listVoteRequestsByTrackingCid',
    method: 'POST',
    path: '/v0/voterequest',
    stability: 'internal',
  },
  {
    clientMethod: 'lookupDsoRulesVoteRequest',
    operationId: 'lookupDsoRulesVoteRequest',
    method: 'GET',
    path: '/v0/voterequests/{vote_request_contract_id}',
    stability: 'internal',
  },
  {
    clientMethod: 'listDsoRulesVoteRequests',
    operationId: 'listDsoRulesVoteRequests',
    method: 'GET',
    path: '/v0/admin/sv/voterequests',
    stability: 'internal',
  },
  {
    clientMethod: 'listVoteRequestResults',
    operationId: 'listVoteRequestResults',
    method: 'POST',
    path: '/v0/admin/sv/voteresults',
    stability: 'internal',
  },
  {
    clientMethod: 'getMigrationInfo',
    operationId: 'getMigrationInfo',
    method: 'POST',
    path: '/v0/backfilling/migration-info',
    stability: 'internal',
  },
  {
    clientMethod: 'getUpdatesBefore',
    operationId: 'getUpdatesBefore',
    method: 'POST',
    path: '/v0/backfilling/updates-before',
    stability: 'internal',
  },
  {
    clientMethod: 'getBackfillingStatus',
    operationId: 'getBackfillingStatus',
    method: 'GET',
    path: '/v0/backfilling/status',
    stability: 'internal',
  },
  {
    clientMethod: 'featureSupport',
    operationId: 'featureSupport',
    method: 'GET',
    path: '/v0/feature-support',
    stability: 'internal',
  },
] as const

export const DEPRECATED_SCAN_OPERATIONS = [
  {
    clientMethod: 'getUpdateHistoryV1',
    operationId: 'getUpdateHistoryV1',
    method: 'POST',
    path: '/v1/updates',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getUpdateByIdV1',
    operationId: 'getUpdateByIdV1',
    method: 'GET',
    path: '/v1/updates/{update_id}',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getAcsSnapshot',
    operationId: 'getAcsSnapshot',
    method: 'GET',
    path: '/v0/acs/{party}',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getAggregatedRounds',
    operationId: 'getAggregatedRounds',
    method: 'GET',
    path: '/v0/aggregated-rounds',
    stability: 'deprecated',
  },
  {
    clientMethod: 'listRoundTotals',
    operationId: 'listRoundTotals',
    method: 'POST',
    path: '/v0/round-totals',
    stability: 'deprecated',
  },
  {
    clientMethod: 'listRoundPartyTotals',
    operationId: 'listRoundPartyTotals',
    method: 'POST',
    path: '/v0/round-party-totals',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getAmuletConfigForRound',
    operationId: 'getAmuletConfigForRound',
    method: 'GET',
    path: '/v0/amulet-config-for-round',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getRoundOfLatestData',
    operationId: 'getRoundOfLatestData',
    method: 'GET',
    path: '/v0/round-of-latest-data',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getRewardsCollected',
    operationId: 'getRewardsCollected',
    method: 'GET',
    path: '/v0/rewards-collected',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getTopProvidersByAppRewards',
    operationId: 'getTopProvidersByAppRewards',
    method: 'GET',
    path: '/v0/top-providers-by-app-rewards',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getTopValidatorsByValidatorRewards',
    operationId: 'getTopValidatorsByValidatorRewards',
    method: 'GET',
    path: '/v0/top-validators-by-validator-rewards',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getTopValidatorsByPurchasedTraffic',
    operationId: 'getTopValidatorsByPurchasedTraffic',
    method: 'GET',
    path: '/v0/top-validators-by-purchased-traffic',
    stability: 'deprecated',
  },
  {
    clientMethod: 'listActivity',
    operationId: 'listActivity',
    method: 'POST',
    path: '/v0/activities',
    stability: 'deprecated',
  },
  {
    clientMethod: 'listTransactionHistory',
    operationId: 'listTransactionHistory',
    method: 'POST',
    path: '/v0/transactions',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getUpdateHistory',
    operationId: 'getUpdateHistory',
    method: 'POST',
    path: '/v0/updates',
    stability: 'deprecated',
  },
  {
    clientMethod: 'getUpdateById',
    operationId: 'getUpdateById',
    method: 'GET',
    path: '/v0/updates/{update_id}',
    stability: 'deprecated',
  },
] as const

export const PRE_ALPHA_SCAN_OPERATIONS = [
  {
    clientMethod: 'listBulkAcsSnapshotObjects',
    operationId: 'listBulkAcsSnapshotObjects',
    method: 'GET',
    path: '/v0/history/bulk/acs',
    stability: 'pre-alpha',
  },
] as const

export const EXPERIMENTAL_SCAN_OPERATIONS = [
  ...INTERNAL_SCAN_OPERATIONS,
  ...DEPRECATED_SCAN_OPERATIONS,
  ...PRE_ALPHA_SCAN_OPERATIONS,
] as const

export type ExperimentalScanOperation = (typeof EXPERIMENTAL_SCAN_OPERATIONS)[number]

export type ExperimentalScanClient = {
  listSvBftSequencers: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listSvBftSequencers'>>
  getAmuletRules: (
    request: JsonRequestBody<'getAmuletRules'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getAmuletRules'>>
  getExternalPartyAmuletRules: (
    request: JsonRequestBody<'getExternalPartyAmuletRules'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getExternalPartyAmuletRules'>>
  getAnsRules: (
    request: JsonRequestBody<'getAnsRules'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getAnsRules'>>
  listFeaturedAppRights: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listFeaturedAppRights'>>
  lookupFeaturedAppRight: (
    request: PathParameters<'lookupFeaturedAppRight'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'lookupFeaturedAppRight'>>
  getTopValidatorsByValidatorFaucets: (
    request: QueryParameters<'getTopValidatorsByValidatorFaucets'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getTopValidatorsByValidatorFaucets'>>
  lookupTransferPreapprovalByParty: (
    request: PathParameters<'lookupTransferPreapprovalByParty'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'lookupTransferPreapprovalByParty'>>
  lookupTransferCommandCounterByParty: (
    request: PathParameters<'lookupTransferCommandCounterByParty'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'lookupTransferCommandCounterByParty'>>
  lookupTransferCommandStatus: (
    request: QueryParameters<'lookupTransferCommandStatus'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'lookupTransferCommandStatus'>>
  getMigrationSchedule: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getMigrationSchedule'>>
  getSynchronizerIdentities: (
    request: PathParameters<'getSynchronizerIdentities'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getSynchronizerIdentities'>>
  getSynchronizerBootstrappingTransactions: (
    request: PathParameters<'getSynchronizerBootstrappingTransactions'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getSynchronizerBootstrappingTransactions'>>
  getSpliceInstanceNames: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getSpliceInstanceNames'>>
  listAmuletPriceVotes: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listAmuletPriceVotes'>>
  listVoteRequestsByTrackingCid: (
    request: JsonRequestBody<'listVoteRequestsByTrackingCid'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listVoteRequestsByTrackingCid'>>
  lookupDsoRulesVoteRequest: (
    request: PathParameters<'lookupDsoRulesVoteRequest'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'lookupDsoRulesVoteRequest'>>
  listDsoRulesVoteRequests: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listDsoRulesVoteRequests'>>
  listVoteRequestResults: (
    request: JsonRequestBody<'listVoteRequestResults'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listVoteRequestResults'>>
  getMigrationInfo: (
    request: JsonRequestBody<'getMigrationInfo'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getMigrationInfo'>>
  getUpdatesBefore: (
    request: JsonRequestBody<'getUpdatesBefore'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getUpdatesBefore'>>
  getBackfillingStatus: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getBackfillingStatus'>>
  featureSupport: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'featureSupport'>>
  getUpdateHistoryV1: (
    request: JsonRequestBody<'getUpdateHistoryV1'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getUpdateHistoryV1'>>
  getUpdateByIdV1: (
    request: PathAndQueryParameters<'getUpdateByIdV1'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getUpdateByIdV1'>>
  getAcsSnapshot: (
    request: PathAndQueryParameters<'getAcsSnapshot'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getAcsSnapshot'>>
  getAggregatedRounds: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getAggregatedRounds'>>
  listRoundTotals: (
    request: JsonRequestBody<'listRoundTotals'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listRoundTotals'>>
  listRoundPartyTotals: (
    request: JsonRequestBody<'listRoundPartyTotals'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listRoundPartyTotals'>>
  getAmuletConfigForRound: (
    request: QueryParameters<'getAmuletConfigForRound'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getAmuletConfigForRound'>>
  getRoundOfLatestData: (
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getRoundOfLatestData'>>
  getRewardsCollected: (
    request?: QueryParameters<'getRewardsCollected'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getRewardsCollected'>>
  getTopProvidersByAppRewards: (
    request: QueryParameters<'getTopProvidersByAppRewards'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getTopProvidersByAppRewards'>>
  getTopValidatorsByValidatorRewards: (
    request: QueryParameters<'getTopValidatorsByValidatorRewards'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getTopValidatorsByValidatorRewards'>>
  getTopValidatorsByPurchasedTraffic: (
    request: QueryParameters<'getTopValidatorsByPurchasedTraffic'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getTopValidatorsByPurchasedTraffic'>>
  listActivity: (
    request: JsonRequestBody<'listActivity'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listActivity'>>
  listTransactionHistory: (
    request: JsonRequestBody<'listTransactionHistory'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listTransactionHistory'>>
  getUpdateHistory: (
    request: JsonRequestBody<'getUpdateHistory'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getUpdateHistory'>>
  getUpdateById: (
    request: PathAndQueryParameters<'getUpdateById'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'getUpdateById'>>
  listBulkAcsSnapshotObjects: (
    request: QueryParameters<'listBulkAcsSnapshotObjects'>,
    options?: ExperimentalScanRequestOptions,
  ) => Promise<SuccessResponse<'listBulkAcsSnapshotObjects'>>
}

export function createExperimentalScanClient(
  config: ExperimentalScanClientConfig,
): ExperimentalScanClient {
  const http = createScanHttpClient(config)

  return {
    listSvBftSequencers(options) {
      return http.getJson('/v0/sv-bft-sequencers', { signal: options?.signal })
    },

    getAmuletRules(request, options) {
      return http.postJson('/v0/amulet-rules', request, { signal: options?.signal })
    },

    getExternalPartyAmuletRules(request, options) {
      return http.postJson('/v0/external-party-amulet-rules', request, {
        signal: options?.signal,
      })
    },

    getAnsRules(request, options) {
      return http.postJson('/v0/ans-rules', request, { signal: options?.signal })
    },

    listFeaturedAppRights(options) {
      return http.getJson('/v0/featured-apps', { signal: options?.signal })
    },

    lookupFeaturedAppRight(request, options) {
      return http.getJson('/v0/featured-apps/{provider_party_id}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getTopValidatorsByValidatorFaucets(request, options) {
      return http.getJson('/v0/top-validators-by-validator-faucets', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    lookupTransferPreapprovalByParty(request, options) {
      return http.getJson('/v0/transfer-preapprovals/by-party/{party}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    lookupTransferCommandCounterByParty(request, options) {
      return http.getJson('/v0/transfer-command-counter/{party}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    lookupTransferCommandStatus(request, options) {
      return http.getJson('/v0/transfer-command/status', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getMigrationSchedule(options) {
      return http.getJson('/v0/migrations/schedule', { signal: options?.signal })
    },

    getSynchronizerIdentities(request, options) {
      return http.getJson('/v0/synchronizer-identities/{domain_id_prefix}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getSynchronizerBootstrappingTransactions(request, options) {
      return http.getJson('/v0/synchronizer-bootstrapping-transactions/{domain_id_prefix}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    getSpliceInstanceNames(options) {
      return http.getJson('/v0/splice-instance-names', { signal: options?.signal })
    },

    listAmuletPriceVotes(options) {
      return http.getJson('/v0/amulet-price/votes', { signal: options?.signal })
    },

    listVoteRequestsByTrackingCid(request, options) {
      return http.postJson('/v0/voterequest', request, { signal: options?.signal })
    },

    lookupDsoRulesVoteRequest(request, options) {
      return http.getJson('/v0/voterequests/{vote_request_contract_id}', {
        pathParams: request,
        signal: options?.signal,
      })
    },

    listDsoRulesVoteRequests(options) {
      return http.getJson('/v0/admin/sv/voterequests', { signal: options?.signal })
    },

    listVoteRequestResults(request, options) {
      return http.postJson('/v0/admin/sv/voteresults', request, { signal: options?.signal })
    },

    getMigrationInfo(request, options) {
      return http.postJson('/v0/backfilling/migration-info', request, {
        signal: options?.signal,
      })
    },

    getUpdatesBefore(request, options) {
      return http.postJson('/v0/backfilling/updates-before', request, {
        signal: options?.signal,
      })
    },

    getBackfillingStatus(options) {
      return http.getJson('/v0/backfilling/status', { signal: options?.signal })
    },

    featureSupport(options) {
      return http.getJson('/v0/feature-support', { signal: options?.signal })
    },

    getUpdateHistoryV1(request, options) {
      return http.postJson('/v1/updates', request, { signal: options?.signal })
    },

    getUpdateByIdV1(request, options) {
      return http.getJson('/v1/updates/{update_id}', {
        pathParams: { update_id: request.update_id },
        query: { daml_value_encoding: request.daml_value_encoding },
        signal: options?.signal,
      })
    },

    getAcsSnapshot(request, options) {
      return http.getJson('/v0/acs/{party}', {
        pathParams: { party: request.party },
        query: { record_time: request.record_time },
        signal: options?.signal,
      })
    },

    getAggregatedRounds(options) {
      return http.getJson('/v0/aggregated-rounds', { signal: options?.signal })
    },

    listRoundTotals(request, options) {
      return http.postJson('/v0/round-totals', request, { signal: options?.signal })
    },

    listRoundPartyTotals(request, options) {
      return http.postJson('/v0/round-party-totals', request, { signal: options?.signal })
    },

    getAmuletConfigForRound(request, options) {
      return http.getJson('/v0/amulet-config-for-round', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getRoundOfLatestData(options) {
      return http.getJson('/v0/round-of-latest-data', { signal: options?.signal })
    },

    getRewardsCollected(request, options) {
      return http.getJson('/v0/rewards-collected', {
        query: request as unknown as ScanHttpQuery | undefined,
        signal: options?.signal,
      })
    },

    getTopProvidersByAppRewards(request, options) {
      return http.getJson('/v0/top-providers-by-app-rewards', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getTopValidatorsByValidatorRewards(request, options) {
      return http.getJson('/v0/top-validators-by-validator-rewards', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    getTopValidatorsByPurchasedTraffic(request, options) {
      return http.getJson('/v0/top-validators-by-purchased-traffic', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },

    listActivity(request, options) {
      return http.postJson('/v0/activities', request, { signal: options?.signal })
    },

    listTransactionHistory(request, options) {
      return http.postJson('/v0/transactions', request, { signal: options?.signal })
    },

    getUpdateHistory(request, options) {
      return http.postJson('/v0/updates', request, { signal: options?.signal })
    },

    getUpdateById(request, options) {
      return http.getJson('/v0/updates/{update_id}', {
        pathParams: { update_id: request.update_id },
        query: { lossless: request.lossless },
        signal: options?.signal,
      })
    },

    listBulkAcsSnapshotObjects(request, options) {
      return http.getJson('/v0/history/bulk/acs', {
        query: request as unknown as ScanHttpQuery,
        signal: options?.signal,
      })
    },
  }
}
