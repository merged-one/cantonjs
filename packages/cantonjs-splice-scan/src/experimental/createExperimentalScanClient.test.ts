import { describe, expect, it, vi } from 'vitest'
import {
  EXPERIMENTAL_SCAN_OPERATIONS,
  createExperimentalScanClient,
} from './createExperimentalScanClient.js'

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

describe('createExperimentalScanClient', () => {
  it('constructs a client that exposes only the unstable Scan surface', () => {
    const client = createExperimentalScanClient({
      url: 'https://scan.example.com/api/scan',
    }) as Record<string, unknown>

    expect(Object.keys(client).sort()).toEqual(
      EXPERIMENTAL_SCAN_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )
  })

  it('routes representative unstable calls through the vendored unstable endpoints', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ svs: [] }))
      .mockResolvedValueOnce(jsonResponse({ earliest_round: 1, latest_round: 2 }))
      .mockResolvedValueOnce(jsonResponse({ objects: [] }))
    const client = createExperimentalScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await client.listSvBftSequencers()
    await client.getAggregatedRounds()
    await client.listBulkAcsSnapshotObjects({
      at_or_before_record_time: '2026-04-02T00:00:00.000Z',
    })

    expect(fetchFn.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['https://scan.example.com/api/scan/v0/sv-bft-sequencers', 'GET'],
      ['https://scan.example.com/api/scan/v0/aggregated-rounds', 'GET'],
      [
        'https://scan.example.com/api/scan/v0/history/bulk/acs?at_or_before_record_time=2026-04-02T00%3A00%3A00.000Z',
        'GET',
      ],
    ])
  })
})
