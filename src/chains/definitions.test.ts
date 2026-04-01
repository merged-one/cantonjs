import { describe, it, expect } from 'vitest'
import { localNet, devNet, testNet, mainNet } from './definitions.js'

describe('chain definitions', () => {
  it('localNet has default ports', () => {
    expect(localNet.id).toBe('canton-localnet')
    expect(localNet.network).toBe('localnet')
    expect(localNet.jsonApiUrl).toBe('http://localhost:7575')
    expect(localNet.grpcUrl).toBe('http://localhost:6865')
  })

  it('devNet has reset cycle', () => {
    expect(devNet.id).toBe('canton-devnet')
    expect(devNet.network).toBe('devnet')
    expect(devNet.resetCycle).toBe('Every 3 months')
  })

  it('testNet is defined', () => {
    expect(testNet.id).toBe('canton-testnet')
    expect(testNet.network).toBe('testnet')
  })

  it('mainNet is defined', () => {
    expect(mainNet.id).toBe('canton-mainnet')
    expect(mainNet.network).toBe('mainnet')
  })
})
