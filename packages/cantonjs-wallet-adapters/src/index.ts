/**
 * cantonjs-wallet-adapters — experimental CIP-0103 wallet interop for cantonjs.
 *
 * @packageDocumentation
 */

export { createCip103Adapter } from './createCip103Adapter.js'
export type {
  Cip103Adapter,
  Cip103AdapterSource,
  Cip103AdapterEventUnsubscribe,
} from './createCip103Adapter.js'

export {
  getWindowCantonProvider,
  requireWindowCantonProvider,
} from './windowCanton.js'
export type { CantonWindowLike } from './windowCanton.js'

export type {
  AccountsChangedEvent,
  Cip103EventListener,
  Cip103EventMap,
  Cip103EventName,
  Cip103Method,
  Cip103Provider,
  Cip103RequestArgs,
  Cip103RpcMap,
  ConnectResult,
  DisclosedContract,
  JsCommands,
  LedgerApiParams,
  LedgerApiResult,
  ListAccountsResult,
  Network,
  PrepareExecuteAndWaitResult,
  PrepareExecuteParams,
  Session,
  SignMessageParams,
  SignMessageResult,
  StatusEvent,
  TxChangedEvent,
  Wallet,
} from './providerTypes.js'
export { isCip103Provider } from './providerTypes.js'
