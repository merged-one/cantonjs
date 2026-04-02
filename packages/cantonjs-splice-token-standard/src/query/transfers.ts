import { TransferFactoryV1, TransferInstructionV1 } from 'cantonjs-splice-interfaces'
import type { TokenStandardLedgerClient, TokenStandardQueryOptions } from '../types.js'
import { queryInterfaceContracts } from './internal.js'

export function queryTransferInstructionsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, TransferInstructionV1, options)
}

export function queryTransferFactoriesV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, TransferFactoryV1, options)
}
