import { describe, expect, it, vi } from 'vitest'
import {
  GA_SCAN_PROXY_OPERATIONS,
  createScanProxyClient,
} from './createScanProxyClient.js'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}

type RouteCase = {
  readonly invoke: (
    client: ReturnType<typeof createScanProxyClient>,
    signal: AbortSignal,
  ) => Promise<unknown>
  readonly url: string
  readonly method: 'GET' | 'POST'
  readonly body?: unknown
}

describe('createScanProxyClient route contracts', () => {
  it('routes every GA operation through the expected validator scan-proxy endpoint', async () => {
    const routeCases: Record<string, RouteCase> = {
      getDsoPartyId: {
        invoke: (client, optionsSignal) => client.getDsoPartyId({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/dso-party-id',
        method: 'GET',
      },
      getDsoInfo: {
        invoke: (client, optionsSignal) => client.getDsoInfo({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/dso',
        method: 'GET',
      },
      getOpenAndIssuingMiningRounds: {
        invoke: (client, optionsSignal) => client.getOpenAndIssuingMiningRounds({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/open-and-issuing-mining-rounds',
        method: 'GET',
      },
      lookupAnsEntryByParty: {
        invoke: (client, optionsSignal) => client.lookupAnsEntryByParty(
          { party: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries/by-party/Alice%3A%3Avalidator',
        method: 'GET',
      },
      listAnsEntries: {
        invoke: (client, optionsSignal) => client.listAnsEntries(
          { page_size: 25, name_prefix: 'ali' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries?page_size=25&name_prefix=ali',
        method: 'GET',
      },
      lookupAnsEntryByName: {
        invoke: (client, optionsSignal) => client.lookupAnsEntryByName(
          { name: 'alice.ans' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries/by-name/alice.ans',
        method: 'GET',
      },
      getHoldingsSummaryAt: {
        invoke: (client, optionsSignal) => client.getHoldingsSummaryAt(
          { parties: ['Alice::validator'] } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/holdings/summary',
        method: 'POST',
        body: { parties: ['Alice::validator'] },
      },
      listUnclaimedDevelopmentFundCoupons: {
        invoke: (client, optionsSignal) => client.listUnclaimedDevelopmentFundCoupons({
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/unclaimed-development-fund-coupons',
        method: 'GET',
      },
    }

    expect(Object.keys(routeCases).sort()).toEqual(
      GA_SCAN_PROXY_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )

    const fetchFn = vi.fn()
    const client = createScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    for (const [index, operation] of GA_SCAN_PROXY_OPERATIONS.entries()) {
      const expected = routeCases[operation.clientMethod]!
      const controller = new AbortController()
      fetchFn.mockResolvedValueOnce(jsonResponse({}))

      await expected.invoke(client, controller.signal)

      const [url, init] = fetchFn.mock.calls[index]!

      expect(url).toBe(expected.url)
      expect(init?.method).toBe(expected.method)
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      controller.abort()
      expect((init?.signal as AbortSignal).aborted).toBe(true)

      if (expected.body === undefined) {
        expect(init?.body).toBeUndefined()
      } else {
        expect(JSON.parse(String(init?.body))).toEqual(expected.body)
      }
    }

    expect(fetchFn).toHaveBeenCalledTimes(GA_SCAN_PROXY_OPERATIONS.length)
  })

  it('throws for missing path params and serializes array query params', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}))
    const client = createScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await expect(
      client.lookupAnsEntryByParty({} as never),
    ).rejects.toThrow('Missing required Scan Proxy path parameter: party')

    await client.listAnsEntries(
      {
        page_size: 25,
        provider: ['alice', 'bob'],
        skipped: undefined,
        ignored: null,
      } as never,
    )

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/scan-proxy/ans-entries?page_size=25&provider=alice&provider=bob',
    )
  })
})
