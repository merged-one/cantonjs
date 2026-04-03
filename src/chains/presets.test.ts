import { describe, expect, expectTypeOf, it } from 'vitest'
import { devNet } from './definitions.js'
import { defineChainPreset, withChainOverrides } from './presets.js'

describe('chain preset helpers', () => {
  it('derives compatibility aliases from nested metadata', () => {
    const chain = defineChainPreset({
      id: 'custom-chain',
      name: 'Custom Chain',
      network: 'testnet',
      participant: {
        jsonApiUrl: 'https://participant.example.com/json-api',
        grpcUrl: 'https://participant.example.com/grpc',
      },
      scan: {
        url: 'https://scan.example.com/api/scan',
        discoveryRoot: 'https://docs.example.com/networks/custom',
      },
      validator: {
        apiBaseUrl: 'https://validator.example.com/api/validator',
        scanProxyBaseUrl: 'https://scan-proxy.example.com',
      },
      splice: {
        releaseLine: '0.5',
        resetCycleNote: 'Reset monthly in staging.',
      },
    })

    expect(chain.jsonApiUrl).toBe(chain.participant.jsonApiUrl)
    expect(chain.grpcUrl).toBe(chain.participant.grpcUrl)
    expect(chain.scanUrl).toBe(chain.scan.url)
    expect(chain.validatorApiUrl).toBe(chain.validator.apiBaseUrl)
    expect(chain.scanProxyUrl).toBe(chain.validator.scanProxyBaseUrl)
    expect(chain.resetCycle).toBe(chain.splice.resetCycleNote)
  })

  it('merges overrides without mutating the base preset', () => {
    const overridden = withChainOverrides(devNet, {
      participant: {
        jsonApiUrl: 'https://participant.devnet.example.com/json-api',
      },
      scan: {
        url: 'https://scan.devnet.example.com/api/scan',
      },
      validator: {
        apiBaseUrl: 'https://validator.devnet.example.com/api/validator',
      },
    })

    expect(devNet.participant.jsonApiUrl).toBeUndefined()
    expect(devNet.scan.url).toBeUndefined()
    expect(devNet.validator.apiBaseUrl).toBeUndefined()

    expect(overridden.id).toBe(devNet.id)
    expect(overridden.network).toBe(devNet.network)
    expect(overridden.participant.jsonApiUrl).toBe(
      'https://participant.devnet.example.com/json-api',
    )
    expect(overridden.scan.url).toBe('https://scan.devnet.example.com/api/scan')
    expect(overridden.validator.apiBaseUrl).toBe(
      'https://validator.devnet.example.com/api/validator',
    )
    expect(overridden.scan.discoveryRoot).toBe(devNet.scan.discoveryRoot)
    expect(overridden.splice.releaseLine).toBe(devNet.splice.releaseLine)
  })

  it('exposes typed nested metadata for overrides and discovery', () => {
    expectTypeOf(devNet.scan.discoveryRoot).toEqualTypeOf<string | undefined>()
    expectTypeOf(devNet.validator.scanProxyBaseUrl).toEqualTypeOf<string | undefined>()
    expectTypeOf(devNet.authAudiences.participant).toEqualTypeOf<string | undefined>()
    expectTypeOf(devNet.splice.releaseLine).toEqualTypeOf<string | undefined>()
  })
})
