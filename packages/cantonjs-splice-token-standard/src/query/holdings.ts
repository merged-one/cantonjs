import { HoldingV1 } from 'cantonjs-splice-interfaces'
import type { TokenStandardLedgerClient, TokenStandardQueryOptions } from '../types.js'
import { queryInterfaceContracts } from './internal.js'

export function queryHoldingsV1(
  client: TokenStandardLedgerClient,
  options?: TokenStandardQueryOptions,
) {
  return queryInterfaceContracts(client, HoldingV1, options)
}
