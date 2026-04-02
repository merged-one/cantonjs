import { AnyContractV1 } from 'cantonjs-splice-interfaces'
import type { TokenStandardLedgerClient, TokenStandardQueryOptions } from '../types.js'
import { queryInterfaceContracts } from './internal.js'

export function queryMetadataContractsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, AnyContractV1, options)
}
