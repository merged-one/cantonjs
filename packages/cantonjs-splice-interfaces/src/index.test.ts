import { describe, expect, it } from 'vitest'

describe('package imports', () => {
  it('allows consumers to import the stable interfaces package', async () => {
    const mod = await import('./index.js')

    expect(mod.TransferInstructionV1.interfaceId).toBe(
      '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
    )
    expect(mod.WalletUserProxy.templateId).toBe(
      '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy',
    )
    expect(mod.WalletUserProxyTypes.WalletUserProxy.templateId).toBe(
      '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy',
    )
    expect(mod).toHaveProperty('HoldingV1Types')
    expect(mod).toHaveProperty('FeaturedAppRightV2Types')
  })
})
