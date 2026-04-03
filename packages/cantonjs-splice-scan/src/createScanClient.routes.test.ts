import { describe, expect, it, vi } from 'vitest'
import {
  PUBLIC_SCAN_OPERATIONS,
  createScanClient,
} from './createScanClient.js'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}

function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain',
    },
  })
}

type RouteCase = {
  readonly invoke: (
    client: ReturnType<typeof createScanClient>,
    signal: AbortSignal,
  ) => Promise<unknown>
  readonly url: string
  readonly method: 'GET' | 'POST'
  readonly response: Response
  readonly body?: unknown
}

describe('createScanClient route contracts', () => {
  it('keeps the public operation table aligned with the runtime client surface', async () => {
    const routeCases: Record<string, RouteCase> = {
      ready: {
        invoke: (client, optionsSignal) => client.ready({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/readyz',
        method: 'GET',
        response: textResponse('ready'),
      },
      live: {
        invoke: (client, optionsSignal) => client.live({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/livez',
        method: 'GET',
        response: textResponse('live'),
      },
      status: {
        invoke: (client, optionsSignal) => client.status({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/status',
        method: 'GET',
        response: jsonResponse({}),
      },
      version: {
        invoke: (client, optionsSignal) => client.version({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/version',
        method: 'GET',
        response: textResponse('0.5.0'),
      },
      getDsoInfo: {
        invoke: (client, optionsSignal) => client.getDsoInfo({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/dso',
        method: 'GET',
        response: jsonResponse({}),
      },
      getValidatorFaucetsByValidator: {
        invoke: (client, optionsSignal) => client.getValidatorFaucetsByValidator(
          { validator: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/validators/validator-faucets?validator=Alice%3A%3Avalidator',
        method: 'GET',
        response: jsonResponse({}),
      },
      listDsoScans: {
        invoke: (client, optionsSignal) => client.listDsoScans({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/scans',
        method: 'GET',
        response: jsonResponse({}),
      },
      listValidatorLicenses: {
        invoke: (client, optionsSignal) => client.listValidatorLicenses(
          { page_size: 5 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/admin/validator/licenses?page_size=5',
        method: 'GET',
        response: jsonResponse({}),
      },
      listDsoSequencers: {
        invoke: (client, optionsSignal) => client.listDsoSequencers({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/dso-sequencers',
        method: 'GET',
        response: jsonResponse({}),
      },
      getPartyToParticipant: {
        invoke: (client, optionsSignal) => client.getPartyToParticipant(
          { domain_id: 'global', party_id: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/domains/global/parties/Alice%3A%3Avalidator/participant-id',
        method: 'GET',
        response: jsonResponse({}),
      },
      getPartyToParticipants: {
        invoke: (client, optionsSignal) => client.getPartyToParticipants(
          { domain_id: 'global', party_id: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v1/domains/global/parties/Alice%3A%3Avalidator/participant-id',
        method: 'GET',
        response: jsonResponse({}),
      },
      getMemberTrafficStatus: {
        invoke: (client, optionsSignal) => client.getMemberTrafficStatus(
          { domain_id: 'global', member_id: 'member::1' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/domains/global/members/member%3A%3A1/traffic-status',
        method: 'GET',
        response: jsonResponse({}),
      },
      getClosedRounds: {
        invoke: (client, optionsSignal) => client.getClosedRounds({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/closed-rounds',
        method: 'GET',
        response: jsonResponse({}),
      },
      getOpenAndIssuingMiningRounds: {
        invoke: (client, optionsSignal) => client.getOpenAndIssuingMiningRounds(
          { limit: 1 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/open-and-issuing-mining-rounds',
        method: 'POST',
        body: { limit: 1 },
        response: jsonResponse({}),
      },
      getUpdates: {
        invoke: (client, optionsSignal) => client.getUpdates(
          { page_size: 1 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v2/updates',
        method: 'POST',
        body: { page_size: 1 },
        response: jsonResponse({ transactions: [] }),
      },
      getUpdateById: {
        invoke: (client, optionsSignal) => client.getUpdateById(
          { update_id: 'update-1', daml_value_encoding: 'verbose' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v2/updates/update-1?daml_value_encoding=verbose',
        method: 'GET',
        response: jsonResponse({}),
      },
      getDateOfMostRecentSnapshotBefore: {
        invoke: (client, optionsSignal) => client.getDateOfMostRecentSnapshotBefore(
          { before_record_time: '2026-04-02T00:00:00Z' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/state/acs/snapshot-timestamp?before_record_time=2026-04-02T00%3A00%3A00Z',
        method: 'GET',
        response: jsonResponse({}),
      },
      getDateOfFirstSnapshotAfter: {
        invoke: (client, optionsSignal) => client.getDateOfFirstSnapshotAfter(
          { after_record_time: '2026-04-02T00:00:00Z' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/state/acs/snapshot-timestamp-after?after_record_time=2026-04-02T00%3A00%3A00Z',
        method: 'GET',
        response: jsonResponse({}),
      },
      getAcsSnapshotAt: {
        invoke: (client, optionsSignal) => client.getAcsSnapshotAt(
          { migration_id: 1 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/state/acs',
        method: 'POST',
        body: { migration_id: 1 },
        response: jsonResponse({}),
      },
      forceAcsSnapshotNow: {
        invoke: (client, optionsSignal) => client.forceAcsSnapshotNow({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/state/acs/force',
        method: 'POST',
        response: jsonResponse({}),
      },
      getHoldingsStateAt: {
        invoke: (client, optionsSignal) => client.getHoldingsStateAt(
          { parties: ['Alice::validator'] } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/holdings/state',
        method: 'POST',
        body: { parties: ['Alice::validator'] },
        response: jsonResponse({}),
      },
      getHoldingsSummaryAt: {
        invoke: (client, optionsSignal) => client.getHoldingsSummaryAt(
          { parties: ['Alice::validator'] } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/holdings/summary',
        method: 'POST',
        body: { parties: ['Alice::validator'] },
        response: jsonResponse({}),
      },
      listAnsEntries: {
        invoke: (client, optionsSignal) => client.listAnsEntries(
          { page_size: 25, name_prefix: 'ali' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/ans-entries?page_size=25&name_prefix=ali',
        method: 'GET',
        response: jsonResponse({}),
      },
      lookupAnsEntryByParty: {
        invoke: (client, optionsSignal) => client.lookupAnsEntryByParty(
          { party: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/ans-entries/by-party/Alice%3A%3Avalidator',
        method: 'GET',
        response: jsonResponse({}),
      },
      lookupAnsEntryByName: {
        invoke: (client, optionsSignal) => client.lookupAnsEntryByName(
          { name: 'alice.ans' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/ans-entries/by-name/alice.ans',
        method: 'GET',
        response: jsonResponse({}),
      },
      getDsoPartyId: {
        invoke: (client, optionsSignal) => client.getDsoPartyId({ signal: optionsSignal }),
        url: 'https://scan.example.com/api/scan/v0/dso-party-id',
        method: 'GET',
        response: jsonResponse({}),
      },
      getEvents: {
        invoke: (client, optionsSignal) => client.getEvents(
          { page_size: 20 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/events',
        method: 'POST',
        body: { page_size: 20 },
        response: jsonResponse({}),
      },
      getEventById: {
        invoke: (client, optionsSignal) => client.getEventById(
          { update_id: 'update-1', daml_value_encoding: 'verbose' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://scan.example.com/api/scan/v0/events/update-1?daml_value_encoding=verbose',
        method: 'GET',
        response: jsonResponse({}),
      },
      listUnclaimedDevelopmentFundCoupons: {
        invoke: (client, optionsSignal) => client.listUnclaimedDevelopmentFundCoupons({
          signal: optionsSignal,
        }),
        url: 'https://scan.example.com/api/scan/v0/unclaimed-development-fund-coupons',
        method: 'GET',
        response: jsonResponse({}),
      },
    }

    expect(Object.keys(routeCases).sort()).toEqual(
      PUBLIC_SCAN_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )

    const fetchFn = vi.fn()
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    for (const [index, operation] of PUBLIC_SCAN_OPERATIONS.entries()) {
      const expected = routeCases[operation.clientMethod]!
      const controller = new AbortController()
      fetchFn.mockResolvedValueOnce(expected.response)

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

    expect(fetchFn).toHaveBeenCalledTimes(PUBLIC_SCAN_OPERATIONS.length)
  })
})
