/**
 * Canton network chain definitions.
 *
 * Pre-configured connection details for Canton network environments.
 * Similar to viem's chain definitions (mainnet, sepolia, etc.).
 */

export type CantonChain = {
  readonly id: string
  readonly name: string
  readonly network: 'localnet' | 'devnet' | 'testnet' | 'mainnet'
  readonly jsonApiUrl?: string
  readonly grpcUrl?: string
  readonly scanUrl?: string
  readonly resetCycle?: string
}

export const localNet: CantonChain = {
  id: 'canton-localnet',
  name: 'Canton LocalNet',
  network: 'localnet',
  jsonApiUrl: 'http://localhost:7575',
  grpcUrl: 'http://localhost:6865',
}

export const devNet: CantonChain = {
  id: 'canton-devnet',
  name: 'Canton DevNet',
  network: 'devnet',
  resetCycle: 'Every 3 months',
}

export const testNet: CantonChain = {
  id: 'canton-testnet',
  name: 'Canton TestNet',
  network: 'testnet',
}

export const mainNet: CantonChain = {
  id: 'canton-mainnet',
  name: 'Canton MainNet',
  network: 'mainnet',
}
