import { describe, expect, it, vi } from 'vitest'
import {
  EXPERIMENTAL_SCAN_OPERATIONS,
  createExperimentalScanClient,
} from './createExperimentalScanClient.js'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}

type RouteFixture = {
  readonly url: string
  readonly request?: unknown
  readonly body?: unknown
}

describe('createExperimentalScanClient route contracts', () => {
  it('keeps the experimental Scan operation table aligned with the runtime client surface', async () => {
    const fixtures: Record<string, RouteFixture> = {
      listSvBftSequencers: {
        url: 'https://scan.example.com/api/scan/v0/sv-bft-sequencers',
      },
      getAmuletRules: {
        url: 'https://scan.example.com/api/scan/v0/amulet-rules',
        request: { round: 1 },
        body: { round: 1 },
      },
      getExternalPartyAmuletRules: {
        url: 'https://scan.example.com/api/scan/v0/external-party-amulet-rules',
        request: { party: 'Alice::external' },
        body: { party: 'Alice::external' },
      },
      getAnsRules: {
        url: 'https://scan.example.com/api/scan/v0/ans-rules',
        request: { release: '0.5' },
        body: { release: '0.5' },
      },
      listFeaturedAppRights: {
        url: 'https://scan.example.com/api/scan/v0/featured-apps',
      },
      lookupFeaturedAppRight: {
        url: 'https://scan.example.com/api/scan/v0/featured-apps/Alice%3A%3Avalidator',
        request: { provider_party_id: 'Alice::validator' },
      },
      getTopValidatorsByValidatorFaucets: {
        url: 'https://scan.example.com/api/scan/v0/top-validators-by-validator-faucets?limit=5',
        request: { limit: 5 },
      },
      lookupTransferPreapprovalByParty: {
        url: 'https://scan.example.com/api/scan/v0/transfer-preapprovals/by-party/Bob%3A%3Avalidator',
        request: { party: 'Bob::validator' },
      },
      lookupTransferCommandCounterByParty: {
        url: 'https://scan.example.com/api/scan/v0/transfer-command-counter/Bob%3A%3Avalidator',
        request: { party: 'Bob::validator' },
      },
      lookupTransferCommandStatus: {
        url: 'https://scan.example.com/api/scan/v0/transfer-command/status?sender=Alice%3A%3Avalidator&nonce=7',
        request: { sender: 'Alice::validator', nonce: 7 },
      },
      getMigrationSchedule: {
        url: 'https://scan.example.com/api/scan/v0/migrations/schedule',
      },
      getSynchronizerIdentities: {
        url: 'https://scan.example.com/api/scan/v0/synchronizer-identities/global',
        request: { domain_id_prefix: 'global' },
      },
      getSynchronizerBootstrappingTransactions: {
        url: 'https://scan.example.com/api/scan/v0/synchronizer-bootstrapping-transactions/global',
        request: { domain_id_prefix: 'global' },
      },
      getSpliceInstanceNames: {
        url: 'https://scan.example.com/api/scan/v0/splice-instance-names',
      },
      listAmuletPriceVotes: {
        url: 'https://scan.example.com/api/scan/v0/amulet-price/votes',
      },
      listVoteRequestsByTrackingCid: {
        url: 'https://scan.example.com/api/scan/v0/voterequest',
        request: { tracking_cid: '#vote-1' },
        body: { tracking_cid: '#vote-1' },
      },
      lookupDsoRulesVoteRequest: {
        url: 'https://scan.example.com/api/scan/v0/voterequests/vote-request-1',
        request: { vote_request_contract_id: 'vote-request-1' },
      },
      listDsoRulesVoteRequests: {
        url: 'https://scan.example.com/api/scan/v0/admin/sv/voterequests',
      },
      listVoteRequestResults: {
        url: 'https://scan.example.com/api/scan/v0/admin/sv/voteresults',
        request: { page_size: 10 },
        body: { page_size: 10 },
      },
      getMigrationInfo: {
        url: 'https://scan.example.com/api/scan/v0/backfilling/migration-info',
        request: { migration_id: 1 },
        body: { migration_id: 1 },
      },
      getUpdatesBefore: {
        url: 'https://scan.example.com/api/scan/v0/backfilling/updates-before',
        request: { before_record_time: '2026-04-02T00:00:00Z' },
        body: { before_record_time: '2026-04-02T00:00:00Z' },
      },
      getBackfillingStatus: {
        url: 'https://scan.example.com/api/scan/v0/backfilling/status',
      },
      featureSupport: {
        url: 'https://scan.example.com/api/scan/v0/feature-support',
      },
      getUpdateHistoryV1: {
        url: 'https://scan.example.com/api/scan/v1/updates',
        request: { page_size: 1 },
        body: { page_size: 1 },
      },
      getUpdateByIdV1: {
        url: 'https://scan.example.com/api/scan/v1/updates/update-1?daml_value_encoding=verbose',
        request: { update_id: 'update-1', daml_value_encoding: 'verbose' },
      },
      getAcsSnapshot: {
        url: 'https://scan.example.com/api/scan/v0/acs/Alice%3A%3Avalidator?record_time=2026-04-02T00%3A00%3A00Z',
        request: { party: 'Alice::validator', record_time: '2026-04-02T00:00:00Z' },
      },
      getAggregatedRounds: {
        url: 'https://scan.example.com/api/scan/v0/aggregated-rounds',
      },
      listRoundTotals: {
        url: 'https://scan.example.com/api/scan/v0/round-totals',
        request: { start_round: 1, end_round: 2 },
        body: { start_round: 1, end_round: 2 },
      },
      listRoundPartyTotals: {
        url: 'https://scan.example.com/api/scan/v0/round-party-totals',
        request: { party: 'Alice::validator' },
        body: { party: 'Alice::validator' },
      },
      getAmuletConfigForRound: {
        url: 'https://scan.example.com/api/scan/v0/amulet-config-for-round?round=5',
        request: { round: 5 },
      },
      getRoundOfLatestData: {
        url: 'https://scan.example.com/api/scan/v0/round-of-latest-data',
      },
      getRewardsCollected: {
        url: 'https://scan.example.com/api/scan/v0/rewards-collected',
        request: undefined,
      },
      getTopProvidersByAppRewards: {
        url: 'https://scan.example.com/api/scan/v0/top-providers-by-app-rewards?limit=5',
        request: { limit: 5 },
      },
      getTopValidatorsByValidatorRewards: {
        url: 'https://scan.example.com/api/scan/v0/top-validators-by-validator-rewards?limit=5',
        request: { limit: 5 },
      },
      getTopValidatorsByPurchasedTraffic: {
        url: 'https://scan.example.com/api/scan/v0/top-validators-by-purchased-traffic?limit=5',
        request: { limit: 5 },
      },
      listActivity: {
        url: 'https://scan.example.com/api/scan/v0/activities',
        request: { page_size: 20 },
        body: { page_size: 20 },
      },
      listTransactionHistory: {
        url: 'https://scan.example.com/api/scan/v0/transactions',
        request: { page_size: 20 },
        body: { page_size: 20 },
      },
      getUpdateHistory: {
        url: 'https://scan.example.com/api/scan/v0/updates',
        request: { page_size: 20 },
        body: { page_size: 20 },
      },
      getUpdateById: {
        url: 'https://scan.example.com/api/scan/v0/updates/update-2?lossless=true',
        request: { update_id: 'update-2', lossless: true },
      },
      listBulkAcsSnapshotObjects: {
        url: 'https://scan.example.com/api/scan/v0/history/bulk/acs?at_or_before_record_time=2026-04-02T00%3A00%3A00.000Z',
        request: { at_or_before_record_time: '2026-04-02T00:00:00.000Z' },
      },
    }

    expect(Object.keys(fixtures).sort()).toEqual(
      EXPERIMENTAL_SCAN_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )

    const fetchFn = vi.fn()
    const client = createExperimentalScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    }) as Record<string, (...args: unknown[]) => Promise<unknown>>

    for (const [index, operation] of EXPERIMENTAL_SCAN_OPERATIONS.entries()) {
      const fixture = fixtures[operation.clientMethod]!
      const controller = new AbortController()
      fetchFn.mockResolvedValueOnce(jsonResponse({}))

      if ('request' in fixture) {
        await client[operation.clientMethod]!(fixture.request, { signal: controller.signal })
      } else {
        await client[operation.clientMethod]!({ signal: controller.signal })
      }

      const [url, init] = fetchFn.mock.calls[index]!
      expect(url).toBe(fixture.url)
      expect(init?.method).toBe(operation.method)
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      controller.abort()
      expect((init?.signal as AbortSignal).aborted).toBe(true)

      if (fixture.body === undefined) {
        expect(init?.body).toBeUndefined()
      } else {
        expect(JSON.parse(String(init?.body))).toEqual(fixture.body)
      }
    }

    expect(fetchFn).toHaveBeenCalledTimes(EXPERIMENTAL_SCAN_OPERATIONS.length)
  })
})
