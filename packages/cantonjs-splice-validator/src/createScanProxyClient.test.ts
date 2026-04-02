import { describe, expect, it, vi } from 'vitest'
import {
  GA_SCAN_PROXY_OPERATIONS,
  createScanProxyClient,
} from './createScanProxyClient.js'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

describe('createScanProxyClient', () => {
  it('exposes only the allowed GA scan proxy subset', () => {
    const client = createScanProxyClient({
      url: 'https://validator.example.com/api/validator',
    }) as Record<string, unknown>

    expect(Object.keys(client).sort()).toEqual(
      [
        'getDsoInfo',
        'getDsoPartyId',
        'getHoldingsSummaryAt',
        'getOpenAndIssuingMiningRounds',
        'listAnsEntries',
        'listUnclaimedDevelopmentFundCoupons',
        'lookupAnsEntryByName',
        'lookupAnsEntryByParty',
      ].sort(),
    )
    expect(client).not.toHaveProperty('lookupFeaturedAppRight')
    expect(client).not.toHaveProperty('getAmuletRules')
    expect(client).not.toHaveProperty('getAnsRules')
    expect(client).not.toHaveProperty('lookupTransferPreapprovalByParty')
    expect(client).not.toHaveProperty('lookupTransferCommandCounterByParty')
    expect(client).not.toHaveProperty('lookupTransferCommandStatus')
  })

  it('routes the GA subset through the expected scan-proxy endpoints', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ dso_party_id: 'DSO::validator' }))
      .mockResolvedValueOnce(jsonResponse({ network_name: 'splice-test' }))
      .mockResolvedValueOnce(
        jsonResponse({
          open_mining_rounds: [],
          issuing_mining_rounds: [],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entry: {
            user: 'Alice::validator',
            name: 'alice.ans',
            url: 'https://alice.example.com',
            description: 'Alice app',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [
            {
              user: 'Alice::validator',
              name: 'alice.ans',
              url: 'https://alice.example.com',
              description: 'Alice app',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entry: {
            user: 'Alice::validator',
            name: 'alice.ans',
            url: 'https://alice.example.com',
            description: 'Alice app',
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ coupons: [] }))
    const client = createScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await client.getDsoPartyId()
    await client.getDsoInfo()
    await client.getOpenAndIssuingMiningRounds()
    await client.lookupAnsEntryByParty({ party: 'Alice::validator' })
    await client.listAnsEntries({ page_size: 25, name_prefix: 'ali' })
    await client.lookupAnsEntryByName({ name: 'alice.ans' })
    await client.getHoldingsSummaryAt({ parties: ['Alice::validator'] })
    await client.listUnclaimedDevelopmentFundCoupons()

    expect(fetchFn.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['https://validator.example.com/api/validator/v0/scan-proxy/dso-party-id', 'GET'],
      ['https://validator.example.com/api/validator/v0/scan-proxy/dso', 'GET'],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/open-and-issuing-mining-rounds',
        'GET',
      ],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries/by-party/Alice%3A%3Avalidator',
        'GET',
      ],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries?page_size=25&name_prefix=ali',
        'GET',
      ],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries/by-name/alice.ans',
        'GET',
      ],
      ['https://validator.example.com/api/validator/v0/scan-proxy/holdings/summary', 'POST'],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/unclaimed-development-fund-coupons',
        'GET',
      ],
    ])
    expect(JSON.parse(String(fetchFn.mock.calls[6]?.[1]?.body))).toEqual({
      parties: ['Alice::validator'],
    })
  })

  it('keeps the GA operation list aligned with the runtime client surface', () => {
    expect(GA_SCAN_PROXY_OPERATIONS.map((operation) => operation.clientMethod).sort()).toEqual(
      [
        'getDsoInfo',
        'getDsoPartyId',
        'getHoldingsSummaryAt',
        'getOpenAndIssuingMiningRounds',
        'listAnsEntries',
        'listUnclaimedDevelopmentFundCoupons',
        'lookupAnsEntryByName',
        'lookupAnsEntryByParty',
      ].sort(),
    )
  })
})
