import { describe, expect, it, vi } from 'vitest'
import {
  EXPERIMENTAL_SCAN_PROXY_OPERATIONS,
  createExperimentalScanProxyClient,
} from './createExperimentalScanProxyClient.js'
import {
  VALIDATOR_INTERNAL_OPERATIONS,
  createExperimentalValidatorInternalClient,
} from './createExperimentalValidatorInternalClient.js'

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

function textResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: {
      'content-type': 'text/plain',
      ...(init?.headers ?? {}),
    },
  })
}

describe('validator experimental entrypoints', () => {
  it('constructs the validator-internal client surface', () => {
    const client = createExperimentalValidatorInternalClient({
      url: 'https://validator.example.com/api/validator',
    }) as Record<string, unknown>

    expect(Object.keys(client).sort()).toEqual(
      VALIDATOR_INTERNAL_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )
  })

  it('routes representative validator-internal calls', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(textResponse('ready'))
      .mockResolvedValueOnce(jsonResponse({ party_id: 'Validator::operator' }))
    const client = createExperimentalValidatorInternalClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await client.ready()
    await client.getValidatorUserInfo()

    expect(fetchFn.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['https://validator.example.com/api/validator/readyz', 'GET'],
      ['https://validator.example.com/api/validator/v0/validator-user', 'GET'],
    ])
  })

  it('constructs the internal-backed scan proxy surface', () => {
    const client = createExperimentalScanProxyClient({
      url: 'https://validator.example.com/api/validator',
    }) as Record<string, unknown>

    expect(Object.keys(client).sort()).toEqual(
      EXPERIMENTAL_SCAN_PROXY_OPERATIONS.map((operation) => operation.clientMethod).sort(),
    )
  })

  it('routes representative internal-backed scan proxy calls', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ amulet_rules: [] }))
      .mockResolvedValueOnce(jsonResponse({ featured_app_right: undefined }))
      .mockResolvedValueOnce(jsonResponse({ transfer_commands: [] }))
    const client = createExperimentalScanProxyClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    await client.getAmuletRules()
    await client.lookupFeaturedAppRight({ provider_party_id: 'Alice::validator' })
    await client.lookupTransferCommandStatus({
      sender: 'Alice::validator',
      nonce: 7,
    })

    expect(fetchFn.mock.calls.map((call) => [call[0], call[1]?.method])).toEqual([
      ['https://validator.example.com/api/validator/v0/scan-proxy/amulet-rules', 'GET'],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/featured-apps/Alice%3A%3Avalidator',
        'GET',
      ],
      [
        'https://validator.example.com/api/validator/v0/scan-proxy/transfer-command/status?sender=Alice%3A%3Avalidator&nonce=7',
        'GET',
      ],
    ])
  })
})
