import { describe, expect, it, vi } from 'vitest'
import {
  EXPERIMENTAL_SCAN_PROXY_OPERATIONS,
  createExperimentalScanProxyClient,
} from './createExperimentalScanProxyClient.js'
import {
  VALIDATOR_INTERNAL_OPERATIONS,
  createExperimentalValidatorInternalClient,
} from './createExperimentalValidatorInternalClient.js'

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

type ScanProxyCase = {
  readonly invoke: (
    client: ReturnType<typeof createExperimentalScanProxyClient>,
    signal: AbortSignal,
  ) => Promise<unknown>
  readonly url: string
  readonly method: 'GET' | 'POST'
  readonly body?: unknown
}

type ValidatorCase = {
  readonly invoke: (
    client: ReturnType<typeof createExperimentalValidatorInternalClient>,
    signal: AbortSignal,
  ) => Promise<unknown>
  readonly url: string
  readonly method: 'GET' | 'POST' | 'DELETE'
  readonly body?: unknown
  readonly response: Response
}

describe('experimental route contracts', () => {
  it('routes every experimental scan-proxy operation through the expected endpoint', async () => {
    const routeCases: Record<string, ScanProxyCase> = {
      lookupFeaturedAppRight: {
        invoke: (client, optionsSignal) => client.lookupFeaturedAppRight(
          { provider_party_id: 'Alice::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/featured-apps/Alice%3A%3Avalidator',
        method: 'GET',
      },
      getAmuletRules: {
        invoke: (client, optionsSignal) => client.getAmuletRules({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/amulet-rules',
        method: 'GET',
      },
      getAnsRules: {
        invoke: (client, optionsSignal) => client.getAnsRules(
          { release: '0.5' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/ans-rules',
        method: 'POST',
        body: { release: '0.5' },
      },
      lookupTransferPreapprovalByParty: {
        invoke: (client, optionsSignal) => client.lookupTransferPreapprovalByParty(
          { party: 'Bob::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/transfer-preapprovals/by-party/Bob%3A%3Avalidator',
        method: 'GET',
      },
      lookupTransferCommandCounterByParty: {
        invoke: (client, optionsSignal) => client.lookupTransferCommandCounterByParty(
          { party: 'Bob::validator' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/transfer-command-counter/Bob%3A%3Avalidator',
        method: 'GET',
      },
      lookupTransferCommandStatus: {
        invoke: (client, optionsSignal) => client.lookupTransferCommandStatus(
          { sender: 'Alice::validator', nonce: 7 } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/scan-proxy/transfer-command/status?sender=Alice%3A%3Avalidator&nonce=7',
        method: 'GET',
      },
    }

    expect(Object.keys(routeCases).sort()).toEqual(
      EXPERIMENTAL_SCAN_PROXY_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )

    const fetchFn = vi.fn()
    const client = createExperimentalScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    for (const [index, operation] of EXPERIMENTAL_SCAN_PROXY_OPERATIONS.entries()) {
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

    expect(fetchFn).toHaveBeenCalledTimes(EXPERIMENTAL_SCAN_PROXY_OPERATIONS.length)
  })

  it('validates experimental scan-proxy path params and serializes repeated query params', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}))
    const client = createExperimentalScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await expect(
      client.lookupFeaturedAppRight({} as never),
    ).rejects.toThrow('Missing required experimental Scan Proxy path parameter: provider_party_id')

    await client.lookupTransferCommandStatus(
      {
        sender: ['Alice::validator', 'Bob::validator'],
        nonce: 7,
        ignored: null,
      } as never,
    )

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/scan-proxy/transfer-command/status?sender=Alice%3A%3Avalidator&sender=Bob%3A%3Avalidator&nonce=7',
    )
  })

  it('routes every validator-internal operation through the expected endpoint', async () => {
    const routeCases: Record<string, ValidatorCase> = {
      ready: {
        invoke: (client, optionsSignal) => client.ready({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/readyz',
        method: 'GET',
        response: textResponse('ready'),
      },
      live: {
        invoke: (client, optionsSignal) => client.live({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/livez',
        method: 'GET',
        response: textResponse('live'),
      },
      getValidatorUserInfo: {
        invoke: (client, optionsSignal) => client.getValidatorUserInfo({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/validator-user',
        method: 'GET',
        response: jsonResponse({}),
      },
      register: {
        invoke: (client, optionsSignal) => client.register({ invite_code: 'invite-1' } as never, {
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/register',
        method: 'POST',
        body: { invite_code: 'invite-1' },
        response: jsonResponse({}),
      },
      onboardUser: {
        invoke: (client, optionsSignal) => client.onboardUser({ user: 'alice' } as never, {
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/admin/users',
        method: 'POST',
        body: { user: 'alice' },
        response: jsonResponse({}),
      },
      listUsers: {
        invoke: (client, optionsSignal) => client.listUsers({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/admin/users',
        method: 'GET',
        response: jsonResponse({}),
      },
      offboardUser: {
        invoke: (client, optionsSignal) => client.offboardUser({ user_id: 'alice' } as never, {
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/admin/users/offboard?user_id=alice',
        method: 'POST',
        response: jsonResponse({}),
      },
      dumpParticipantIdentities: {
        invoke: (client, optionsSignal) => client.dumpParticipantIdentities({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/admin/participant/identities',
        method: 'GET',
        response: jsonResponse({}),
      },
      getDecentralizedSynchronizerConnectionConfig: {
        invoke: (client, optionsSignal) => client.getDecentralizedSynchronizerConnectionConfig({
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/admin/participant/global-domain-connection-config',
        method: 'GET',
        response: jsonResponse({}),
      },
      getValidatorDomainDataSnapshot: {
        invoke: (client, optionsSignal) => client.getValidatorDomainDataSnapshot(
          { timestamp: '2026-04-02T00:00:00Z' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/domain/data-snapshot?timestamp=2026-04-02T00%3A00%3A00Z',
        method: 'GET',
        response: jsonResponse({}),
      },
      lookupTransferPreapprovalByParty: {
        invoke: (client, optionsSignal) => client.lookupTransferPreapprovalByParty(
          { 'receiver-party': 'Bob::party' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/transfer-preapprovals/by-party/Bob%3A%3Aparty',
        method: 'GET',
        response: jsonResponse({}),
      },
      cancelTransferPreapprovalByParty: {
        invoke: (client, optionsSignal) => client.cancelTransferPreapprovalByParty(
          { 'receiver-party': 'Bob::party' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/transfer-preapprovals/by-party/Bob%3A%3Aparty',
        method: 'DELETE',
        response: jsonResponse({}),
      },
      listTransferPreapprovals: {
        invoke: (client, optionsSignal) => client.listTransferPreapprovals({ signal: optionsSignal }),
        url: 'https://validator.example.com/api/validator/v0/admin/transfer-preapprovals',
        method: 'GET',
        response: jsonResponse({}),
      },
      prepareTransferPreapprovalSend: {
        invoke: (client, optionsSignal) => client.prepareTransferPreapprovalSend(
          { amount: '10.0' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/transfer-preapproval/prepare-send',
        method: 'POST',
        body: { amount: '10.0' },
        response: jsonResponse({}),
      },
      submitTransferPreapprovalSend: {
        invoke: (client, optionsSignal) => client.submitTransferPreapprovalSend(
          { prepared_transaction: 'blob' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/transfer-preapproval/submit-send',
        method: 'POST',
        body: { prepared_transaction: 'blob' },
        response: jsonResponse({}),
      },
      generateExternalPartyTopology: {
        invoke: (client, optionsSignal) => client.generateExternalPartyTopology(
          { party: 'Alice::external' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/topology/generate',
        method: 'POST',
        body: { party: 'Alice::external' },
        response: jsonResponse({}),
      },
      submitExternalPartyTopology: {
        invoke: (client, optionsSignal) => client.submitExternalPartyTopology(
          { topology_txs: [] } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/topology/submit',
        method: 'POST',
        body: { topology_txs: [] },
        response: jsonResponse({}),
      },
      createExternalPartySetupProposal: {
        invoke: (client, optionsSignal) => client.createExternalPartySetupProposal(
          { party: 'Alice::external' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/setup-proposal',
        method: 'POST',
        body: { party: 'Alice::external' },
        response: jsonResponse({}),
      },
      listExternalPartySetupProposals: {
        invoke: (client, optionsSignal) => client.listExternalPartySetupProposals({
          signal: optionsSignal,
        }),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/setup-proposal',
        method: 'GET',
        response: jsonResponse({}),
      },
      prepareAcceptExternalPartySetupProposal: {
        invoke: (client, optionsSignal) => client.prepareAcceptExternalPartySetupProposal(
          { proposal_id: 'proposal-1' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/setup-proposal/prepare-accept',
        method: 'POST',
        body: { proposal_id: 'proposal-1' },
        response: jsonResponse({}),
      },
      submitAcceptExternalPartySetupProposal: {
        invoke: (client, optionsSignal) => client.submitAcceptExternalPartySetupProposal(
          { prepared_transaction: 'blob' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/setup-proposal/submit-accept',
        method: 'POST',
        body: { prepared_transaction: 'blob' },
        response: jsonResponse({}),
      },
      getExternalPartyBalance: {
        invoke: (client, optionsSignal) => client.getExternalPartyBalance(
          { party: 'Alice::external' } as never,
          { signal: optionsSignal },
        ),
        url: 'https://validator.example.com/api/validator/v0/admin/external-party/balance?party=Alice%3A%3Aexternal',
        method: 'GET',
        response: jsonResponse({}),
      },
    }

    expect(Object.keys(routeCases).sort()).toEqual(
      VALIDATOR_INTERNAL_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )

    const fetchFn = vi.fn()
    const client = createExperimentalValidatorInternalClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    for (const [index, operation] of VALIDATOR_INTERNAL_OPERATIONS.entries()) {
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

    expect(fetchFn).toHaveBeenCalledTimes(VALIDATOR_INTERNAL_OPERATIONS.length)
  })

  it('validates experimental validator path params and serializes repeated query params', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({})))
    const client = createExperimentalValidatorInternalClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await expect(
      client.lookupTransferPreapprovalByParty({} as never),
    ).rejects.toThrow('Missing required experimental validator path parameter: receiver-party')

    await client.listExternalPartySetupProposals({ signal: undefined })

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/admin/external-party/setup-proposal',
    )

    await client.getValidatorDomainDataSnapshot(
      {
        timestamp: ['2026-04-02T00:00:00Z', '2026-04-03T00:00:00Z'],
        ignored: null,
      } as never,
    )

    expect(fetchFn.mock.calls[1]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/admin/domain/data-snapshot?timestamp=2026-04-02T00%3A00%3A00Z&timestamp=2026-04-03T00%3A00%3A00Z',
    )
  })
})
