/**
 * Canton network chain definitions.
 *
 * Public environments default to discovery-first metadata. Consumers can
 * layer in deployment-specific participant, Scan, or validator URLs with
 * `withChainOverrides()` without committing operator-specific endpoints.
 */

import { defineChainPreset, type CantonChain } from './presets.js'

export type {
  CantonAuthAudienceHints,
  CantonChain,
  CantonChainOverrides,
  CantonChainPresetInput,
  CantonNetwork,
  CantonParticipantEndpoints,
  CantonScanEndpoints,
  CantonSpliceMetadata,
  CantonValidatorEndpoints,
} from './presets.js'

const SPLICE_DISCOVERY_ROOT = 'https://docs.global.canton.network.sync.global'
const SPLICE_RELEASE_LINE = '0.5'
const PARTICIPANT_AUDIENCE_HINT =
  'https://daml.com/participant/jwt/aud/participant/<participant-id>'
const PUBLIC_SCAN_AUDIENCE_HINT =
  'Public Scan is often anonymous; if a token is required, use the operator-published audience.'
const VALIDATOR_AUDIENCE_HINT =
  'Validator API audiences are operator-specific and should come from your validator or wallet provider.'

export const localNet: CantonChain = defineChainPreset({
  id: 'canton-localnet',
  name: 'Canton LocalNet',
  network: 'localnet',
  participant: {
    jsonApiUrl: 'http://localhost:7575',
    grpcUrl: 'http://localhost:6865',
  },
  authAudiences: {
    participant: PARTICIPANT_AUDIENCE_HINT,
  },
})

export const devNet: CantonChain = defineChainPreset({
  id: 'canton-devnet',
  name: 'Canton DevNet',
  network: 'devnet',
  scan: {
    discoveryRoot: SPLICE_DISCOVERY_ROOT,
  },
  authAudiences: {
    participant: PARTICIPANT_AUDIENCE_HINT,
    scan: PUBLIC_SCAN_AUDIENCE_HINT,
    validator: VALIDATOR_AUDIENCE_HINT,
  },
  splice: {
    releaseLine: SPLICE_RELEASE_LINE,
    resetCycleNote:
      'Public dev deployments may reset during release-line rollovers or operator maintenance.',
  },
})

export const testNet: CantonChain = defineChainPreset({
  id: 'canton-testnet',
  name: 'Canton TestNet',
  network: 'testnet',
  scan: {
    discoveryRoot: SPLICE_DISCOVERY_ROOT,
  },
  authAudiences: {
    participant: PARTICIPANT_AUDIENCE_HINT,
    scan: PUBLIC_SCAN_AUDIENCE_HINT,
    validator: VALIDATOR_AUDIENCE_HINT,
  },
  splice: {
    releaseLine: SPLICE_RELEASE_LINE,
    resetCycleNote:
      'Treat public test environments as resettable and resolve live endpoints from operator docs.',
  },
})

export const mainNet: CantonChain = defineChainPreset({
  id: 'canton-mainnet',
  name: 'Canton MainNet',
  network: 'mainnet',
  scan: {
    discoveryRoot: SPLICE_DISCOVERY_ROOT,
  },
  authAudiences: {
    participant: PARTICIPANT_AUDIENCE_HINT,
    scan: PUBLIC_SCAN_AUDIENCE_HINT,
    validator: VALIDATOR_AUDIENCE_HINT,
  },
  splice: {
    releaseLine: SPLICE_RELEASE_LINE,
  },
})
