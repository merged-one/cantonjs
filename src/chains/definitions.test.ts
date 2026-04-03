import { describe, it, expect } from 'vitest'
import { localNet, devNet, testNet, mainNet } from './definitions.js'

describe('chain definitions', () => {
  it('localNet has default ports', () => {
    expect(localNet.id).toBe('canton-localnet')
    expect(localNet.network).toBe('localnet')
    expect(localNet.participant.jsonApiUrl).toBe('http://localhost:7575')
    expect(localNet.participant.grpcUrl).toBe('http://localhost:6865')
    expect(localNet.jsonApiUrl).toBe('http://localhost:7575')
    expect(localNet.grpcUrl).toBe('http://localhost:6865')
  })

  it('devNet uses discovery metadata instead of hardcoded public endpoints', () => {
    expect(devNet.id).toBe('canton-devnet')
    expect(devNet.network).toBe('devnet')
    expect(devNet.scan.discoveryRoot).toBe('https://docs.global.canton.network.sync.global')
    expect(devNet.scan.url).toBeUndefined()
    expect(devNet.validator.apiBaseUrl).toBeUndefined()
    expect(devNet.splice.releaseLine).toBe('0.5')
    expect(devNet.resetCycle).toContain('reset')
  })

  it('testNet carries release-line metadata', () => {
    expect(testNet.id).toBe('canton-testnet')
    expect(testNet.network).toBe('testnet')
    expect(testNet.scan.discoveryRoot).toBe('https://docs.global.canton.network.sync.global')
    expect(testNet.splice.releaseLine).toBe('0.5')
    expect(testNet.splice.resetCycleNote).toContain('resettable')
  })

  it('mainNet is defined without assuming operator-specific validator endpoints', () => {
    expect(mainNet.id).toBe('canton-mainnet')
    expect(mainNet.network).toBe('mainnet')
    expect(mainNet.scan.discoveryRoot).toBe('https://docs.global.canton.network.sync.global')
    expect(mainNet.scan.url).toBeUndefined()
    expect(mainNet.validator.apiBaseUrl).toBeUndefined()
    expect(mainNet.splice.releaseLine).toBe('0.5')
  })
})
