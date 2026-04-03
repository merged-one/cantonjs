import { describe, expect, it } from 'vitest'
import {
  AllocationRequestV1,
  AllocationFactoryV1,
  AllocationInstructionV1,
  AllocationV1,
  AnyContractV1,
  FeaturedAppActivityMarkerV2,
  FeaturedAppRightV2,
  HoldingV1,
  TransferFactoryV1,
  TransferInstructionV1,
  WalletUserProxy,
} from './index.js'

describe('stable descriptor metadata', () => {
  it('captures package coordinates and identifiers for token standard interfaces', () => {
    expect(HoldingV1).toMatchObject({
      kind: 'interface',
      packageName: 'splice-api-token-holding-v1',
      packageVersion: '1.0.0',
      moduleName: 'Splice.Api.Token.HoldingV1',
      entityName: 'Holding',
      interfaceId: '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding',
    })
    expect(Object.keys(HoldingV1.choices)).toEqual([])
  })

  it('includes stable choice metadata for interface descriptors', () => {
    expect(TransferInstructionV1).toMatchObject({
      packageName: 'splice-api-token-transfer-instruction-v1',
      packageVersion: '1.0.0',
      moduleName: 'Splice.Api.Token.TransferInstructionV1',
      entityName: 'TransferInstruction',
      interfaceId: '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
    })
    expect(Object.keys(TransferInstructionV1.choices)).toEqual([
      'TransferInstruction_Accept',
      'TransferInstruction_Reject',
      'TransferInstruction_Withdraw',
      'TransferInstruction_Update',
    ])
    expect(Object.keys(AllocationFactoryV1.choices)).toEqual([
      'AllocationFactory_Allocate',
      'AllocationFactory_PublicFetch',
    ])
  })

  it('exposes the featured app interfaces and wallet proxy template from official artifacts', () => {
    expect(FeaturedAppRightV2).toMatchObject({
      packageName: 'splice-api-featured-app-v2',
      packageVersion: '1.0.0',
      moduleName: 'Splice.Api.FeaturedAppRightV2',
      entityName: 'FeaturedAppRight',
      interfaceId: '#splice-api-featured-app-v2:Splice.Api.FeaturedAppRightV2:FeaturedAppRight',
    })
    expect(Object.keys(FeaturedAppRightV2.choices)).toEqual([
      'FeaturedAppRight_CreateActivityMarker',
    ])

    expect(WalletUserProxy).toMatchObject({
      kind: 'template',
      packageName: 'splice-util-featured-app-proxies',
      packageVersion: '1.2.2',
      moduleName: 'Splice.Util.FeaturedApp.WalletUserProxy',
      entityName: 'WalletUserProxy',
      templateId: '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.WalletUserProxy:WalletUserProxy',
    })
    expect(Object.keys(WalletUserProxy.choices)).toEqual([
      'WalletUserProxy_PublicFetch',
      'WalletUserProxy_TransferFactory_Transfer',
      'WalletUserProxy_TransferInstruction_Accept',
      'WalletUserProxy_TransferInstruction_Reject',
      'WalletUserProxy_TransferInstruction_Withdraw',
      'WalletUserProxy_AllocationFactory_Allocate',
      'WalletUserProxy_Allocation_Withdraw',
      'WalletUserProxy_BatchTransfer',
    ])
  })

  it('keeps additional stable interfaces available from the metadata package', () => {
    expect(AnyContractV1).toMatchObject({
      packageName: 'splice-api-token-metadata-v1',
      packageVersion: '1.0.0',
      moduleName: 'Splice.Api.Token.MetadataV1',
      entityName: 'AnyContract',
      interfaceId: '#splice-api-token-metadata-v1:Splice.Api.Token.MetadataV1:AnyContract',
    })
    expect(Object.keys(AnyContractV1.choices)).toEqual([])

    expect(AllocationInstructionV1.packageId).toContain('splice-api-token-allocation-instruction-v1-1.0.0-')
  })

  it('keeps every maintained descriptor wrapper aligned with stable metadata', () => {
    const descriptors = [
      [HoldingV1, 'interface', '#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding', []],
      [AnyContractV1, 'interface', '#splice-api-token-metadata-v1:Splice.Api.Token.MetadataV1:AnyContract', []],
      [TransferInstructionV1, 'interface', '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction', [
        'TransferInstruction_Accept',
        'TransferInstruction_Reject',
        'TransferInstruction_Withdraw',
        'TransferInstruction_Update',
      ]],
      [TransferFactoryV1, 'interface', '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory', [
        'TransferFactory_Transfer',
        'TransferFactory_PublicFetch',
      ]],
      [AllocationV1, 'interface', '#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation', [
        'Allocation_ExecuteTransfer',
        'Allocation_Cancel',
        'Allocation_Withdraw',
      ]],
      [AllocationRequestV1, 'interface', '#splice-api-token-allocation-request-v1:Splice.Api.Token.AllocationRequestV1:AllocationRequest', [
        'AllocationRequest_Reject',
        'AllocationRequest_Withdraw',
      ]],
      [AllocationInstructionV1, 'interface', '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationInstruction', [
        'AllocationInstruction_Withdraw',
        'AllocationInstruction_Update',
      ]],
      [AllocationFactoryV1, 'interface', '#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory', [
        'AllocationFactory_Allocate',
        'AllocationFactory_PublicFetch',
      ]],
      [FeaturedAppRightV2, 'interface', '#splice-api-featured-app-v2:Splice.Api.FeaturedAppRightV2:FeaturedAppRight', [
        'FeaturedAppRight_CreateActivityMarker',
      ]],
      [FeaturedAppActivityMarkerV2, 'interface', '#splice-api-featured-app-v2:Splice.Api.FeaturedAppRightV2:FeaturedAppActivityMarker', []],
      [WalletUserProxy, 'template', WalletUserProxy.templateId, [
        'WalletUserProxy_PublicFetch',
        'WalletUserProxy_TransferFactory_Transfer',
        'WalletUserProxy_TransferInstruction_Accept',
        'WalletUserProxy_TransferInstruction_Reject',
        'WalletUserProxy_TransferInstruction_Withdraw',
        'WalletUserProxy_AllocationFactory_Allocate',
        'WalletUserProxy_Allocation_Withdraw',
        'WalletUserProxy_BatchTransfer',
      ]],
    ] as const

    for (const [descriptor, kind, id, choices] of descriptors) {
      expect(descriptor.kind).toBe(kind)
      expect('interfaceId' in descriptor ? descriptor.interfaceId : descriptor.templateId).toBe(id)
      expect(Object.keys(descriptor.choices)).toEqual(choices)
      expect(descriptor.packageName).not.toHaveLength(0)
      expect(descriptor.packageVersion).not.toHaveLength(0)
      expect(descriptor.packageId).toContain(`${descriptor.packageName}-${descriptor.packageVersion}-`)
    }
  })
})
