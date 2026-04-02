import type { Cip103Provider } from './providerTypes.js'
import { isCip103Provider } from './providerTypes.js'

export type CantonWindowLike = {
  readonly canton?: unknown
}

export function getWindowCantonProvider(
  target: CantonWindowLike = globalThis as unknown as CantonWindowLike,
): Cip103Provider | undefined {
  return isCip103Provider(target.canton) ? target.canton : undefined
}

export function requireWindowCantonProvider(
  target?: CantonWindowLike,
): Cip103Provider {
  const provider = getWindowCantonProvider(target)

  if (!provider) {
    throw new Error(
      'No CIP-0103 provider found on window.canton. Use the official dApp SDK or inject a compatible provider first.',
    )
  }

  return provider
}
