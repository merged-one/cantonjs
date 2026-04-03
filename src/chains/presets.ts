export type CantonNetwork = 'localnet' | 'devnet' | 'testnet' | 'mainnet'

export type CantonParticipantEndpoints = {
  readonly jsonApiUrl?: string
  readonly grpcUrl?: string
}

export type CantonScanEndpoints = {
  readonly url?: string
  readonly discoveryRoot?: string
}

export type CantonValidatorEndpoints = {
  readonly apiBaseUrl?: string
  readonly scanProxyBaseUrl?: string
}

export type CantonAuthAudienceHints = {
  readonly participant?: string
  readonly scan?: string
  readonly validator?: string
}

export type CantonSpliceMetadata = {
  readonly releaseLine?: string
  readonly resetCycleNote?: string
}

export type CantonChain = {
  readonly id: string
  readonly name: string
  readonly network: CantonNetwork
  readonly participant: CantonParticipantEndpoints
  readonly scan: CantonScanEndpoints
  readonly validator: CantonValidatorEndpoints
  readonly authAudiences: CantonAuthAudienceHints
  readonly splice: CantonSpliceMetadata

  readonly jsonApiUrl?: string
  readonly grpcUrl?: string
  readonly scanUrl?: string
  readonly validatorApiUrl?: string
  readonly scanProxyUrl?: string
  readonly resetCycle?: string
}

export type CantonChainPresetInput = {
  readonly id: string
  readonly name: string
  readonly network: CantonNetwork
  readonly participant?: CantonParticipantEndpoints
  readonly scan?: CantonScanEndpoints
  readonly validator?: CantonValidatorEndpoints
  readonly authAudiences?: CantonAuthAudienceHints
  readonly splice?: CantonSpliceMetadata
}

export type CantonChainOverrides = {
  readonly name?: string
  readonly participant?: Partial<CantonParticipantEndpoints>
  readonly scan?: Partial<CantonScanEndpoints>
  readonly validator?: Partial<CantonValidatorEndpoints>
  readonly authAudiences?: Partial<CantonAuthAudienceHints>
  readonly splice?: Partial<CantonSpliceMetadata>
}

export function defineChainPreset(input: CantonChainPresetInput): CantonChain {
  const participant = { ...(input.participant ?? {}) }
  const scan = { ...(input.scan ?? {}) }
  const validator = { ...(input.validator ?? {}) }
  const authAudiences = { ...(input.authAudiences ?? {}) }
  const splice = { ...(input.splice ?? {}) }

  return {
    id: input.id,
    name: input.name,
    network: input.network,
    participant,
    scan,
    validator,
    authAudiences,
    splice,
    jsonApiUrl: participant.jsonApiUrl,
    grpcUrl: participant.grpcUrl,
    scanUrl: scan.url,
    validatorApiUrl: validator.apiBaseUrl,
    scanProxyUrl: validator.scanProxyBaseUrl,
    resetCycle: splice.resetCycleNote,
  }
}

export function withChainOverrides(
  chain: CantonChain,
  overrides: CantonChainOverrides = {},
): CantonChain {
  return defineChainPreset({
    id: chain.id,
    name: overrides.name ?? chain.name,
    network: chain.network,
    participant: {
      ...chain.participant,
      ...overrides.participant,
    },
    scan: {
      ...chain.scan,
      ...overrides.scan,
    },
    validator: {
      ...chain.validator,
      ...overrides.validator,
    },
    authAudiences: {
      ...chain.authAudiences,
      ...overrides.authAudiences,
    },
    splice: {
      ...chain.splice,
      ...overrides.splice,
    },
  })
}
