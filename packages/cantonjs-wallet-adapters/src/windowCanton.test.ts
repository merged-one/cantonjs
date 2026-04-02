import { describe, expect, it, vi } from 'vitest'
import { getWindowCantonProvider, requireWindowCantonProvider } from './windowCanton.js'
import type { Cip103Provider } from './providerTypes.js'

function createProvider(): Cip103Provider {
  const provider: Cip103Provider = {
    request: vi.fn(),
    on: vi.fn().mockReturnThis(),
    removeListener: vi.fn().mockReturnThis(),
  }

  return provider
}

describe('window canton helpers', () => {
  it('returns the injected provider when window.canton exists', () => {
    const provider = createProvider()

    expect(
      getWindowCantonProvider({
        canton: provider,
      }),
    ).toBe(provider)
  })

  it('returns undefined for a missing or invalid provider', () => {
    expect(getWindowCantonProvider({})).toBeUndefined()
    expect(getWindowCantonProvider({ canton: {} })).toBeUndefined()
  })

  it('throws when a provider is required but missing', () => {
    expect(() => requireWindowCantonProvider({})).toThrow(
      'No CIP-0103 provider found on window.canton. Use the official dApp SDK or inject a compatible provider first.',
    )
  })
})
