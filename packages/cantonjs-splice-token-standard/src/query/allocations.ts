import {
  AllocationFactoryV1,
  AllocationInstructionV1,
  AllocationRequestV1,
  AllocationV1,
} from 'cantonjs-splice-interfaces'
import type { TokenStandardLedgerClient, TokenStandardQueryOptions } from '../types.js'
import { queryInterfaceContracts } from './internal.js'

export function queryAllocationsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, AllocationV1, options)
}

export function queryAllocationRequestsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, AllocationRequestV1, options)
}

export function queryAllocationInstructionsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, AllocationInstructionV1, options)
}

export function queryAllocationFactoriesV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, AllocationFactoryV1, options)
}
