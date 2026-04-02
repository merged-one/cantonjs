import { describe, expect, it, vi } from 'vitest'
import {
  AuthProviderError,
  ConnectionError,
  HttpError,
} from './errors.js'
import {
  createScanClient,
  getNextUpdateCursor,
  type ScanUpdateHistoryItem,
  type ScanUpdateHistoryResponse,
} from './createScanClient.js'

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

function transaction(
  update_id: string,
  migration_id: number,
  record_time: string,
): ScanUpdateHistoryItem {
  return {
    update_id,
    migration_id,
    workflow_id: '',
    record_time,
    synchronizer_id: 'sync::1',
    effective_at: record_time,
    root_event_ids: [],
    events_by_id: {},
  }
}

function reassignment(
  update_id: string,
  migration_id: number,
  record_time: string,
): ScanUpdateHistoryItem {
  return {
    update_id,
    offset: `${migration_id}`,
    record_time,
    event: {
      submitter: 'Alice::validator',
      source_synchronizer: 'sync::1',
      target_synchronizer: 'sync::2',
      migration_id,
      unassign_id: `unassign-${update_id}`,
      reassignment_counter: 1,
      contract_id: `contract-${update_id}`,
    },
  }
}

describe('createScanClient', () => {
  it('keeps auth optional for public endpoints', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ network: 'public' }))
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await client.getDsoInfo()

    const call = fetchFn.mock.calls[0]
    expect(call?.[1]?.headers['Authorization']).toBeUndefined()
  })

  it('injects session headers and bearer token when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ network: 'public' }))
    const session = vi.fn().mockResolvedValue({
      token: 'scan-jwt',
      headers: { 'x-scan-network': 'public' },
    })
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      session,
      fetchFn,
    })

    await client.getDsoInfo()

    const call = fetchFn.mock.calls[0]
    expect(call?.[1]?.headers['Authorization']).toBe('Bearer scan-jwt')
    expect(call?.[1]?.headers['x-scan-network']).toBe('public')
    expect(session).toHaveBeenCalledTimes(1)
  })

  it('maps HTTP failures to HttpError', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'missing update' }, { status: 404, statusText: 'Not Found' }),
    )
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await expect(client.getUpdateById({ update_id: 'missing' })).rejects.toThrow(HttpError)
  })

  it('wraps auth provider failures as AuthProviderError', async () => {
    const fetchFn = vi.fn()
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      auth: async () => {
        throw new Error('auth backend unavailable')
      },
      fetchFn,
    })

    await expect(client.getDsoInfo()).rejects.toThrow(AuthProviderError)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('maps network failures to ConnectionError', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    await expect(client.getDsoInfo()).rejects.toThrow(ConnectionError)
  })

  it('derives the next /v2/updates cursor from the last page item', () => {
    const response: ScanUpdateHistoryResponse = {
      transactions: [
        transaction('update-1', 7, '2026-04-02T01:00:00.000Z'),
        reassignment('update-2', 8, '2026-04-02T01:00:01.000Z'),
      ],
    }

    expect(getNextUpdateCursor(response)).toEqual({
      after_migration_id: 8,
      after_record_time: '2026-04-02T01:00:01.000Z',
    })
  })

  it('returns no next cursor for an empty /v2/updates page', () => {
    expect(getNextUpdateCursor({ transactions: [] })).toBeUndefined()
  })

  it('iterates /v2/updates across pages using the last item cursor', async () => {
    const requestBodies: unknown[] = []
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        requestBodies.push(JSON.parse(String(init.body)))
        return jsonResponse({
          transactions: [
            transaction('update-1', 7, '2026-04-02T01:00:00.000Z'),
            reassignment('update-2', 8, '2026-04-02T01:00:01.000Z'),
          ],
        })
      })
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        requestBodies.push(JSON.parse(String(init.body)))
        return jsonResponse({
          transactions: [transaction('update-3', 9, '2026-04-02T01:00:02.000Z')],
        })
      })

    const client = createScanClient({
      url: 'https://scan.example.com/api/scan',
      fetchFn,
    })

    const updates: ScanUpdateHistoryItem[] = []
    for await (const update of client.iterateUpdates({ page_size: 2 })) {
      updates.push(update)
    }

    expect(updates.map((update) => update.update_id)).toEqual([
      'update-1',
      'update-2',
      'update-3',
    ])
    expect(requestBodies).toEqual([
      { page_size: 2 },
      {
        page_size: 2,
        after: {
          after_migration_id: 8,
          after_record_time: '2026-04-02T01:00:01.000Z',
        },
      },
    ])
  })
})
