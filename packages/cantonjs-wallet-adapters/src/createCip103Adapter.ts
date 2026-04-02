import type {
  AccountsChangedEvent,
  Cip103EventListener,
  Cip103EventMap,
  Cip103EventName,
  Cip103Method,
  Cip103Provider,
  Cip103RequestArgs,
  Cip103RpcMap,
  ConnectResult,
  LedgerApiParams,
  LedgerApiResult,
  ListAccountsResult,
  Network,
  PrepareExecuteAndWaitResult,
  PrepareExecuteParams,
  SignMessageParams,
  SignMessageResult,
  StatusEvent,
  TxChangedEvent,
} from './providerTypes.js'
import { isCip103Provider } from './providerTypes.js'

export type Cip103AdapterSource =
  | Cip103Provider
  | { readonly provider: Cip103Provider }
  | { provider(): Cip103Provider }
  | { getProvider(): Cip103Provider }
  | { getConnectedProvider(): Cip103Provider | null | undefined }

export type Cip103AdapterEventUnsubscribe = () => void

export type Cip103Adapter = {
  getProvider: () => Cip103Provider
  connect: () => Promise<ConnectResult>
  disconnect: () => Promise<null>
  status: () => Promise<StatusEvent>
  getActiveNetwork: () => Promise<Network>
  listAccounts: () => Promise<ListAccountsResult>
  prepareExecute: (params: PrepareExecuteParams) => Promise<null>
  prepareExecuteAndWait: (params: PrepareExecuteParams) => Promise<PrepareExecuteAndWaitResult>
  signMessage: (params: SignMessageParams) => Promise<SignMessageResult>
  ledgerApi: (params: LedgerApiParams) => Promise<LedgerApiResult>
  onStatusChanged: (
    listener: Cip103EventListener<StatusEvent>,
  ) => Cip103AdapterEventUnsubscribe
  onAccountsChanged: (
    listener: Cip103EventListener<AccountsChangedEvent>,
  ) => Cip103AdapterEventUnsubscribe
  onTxChanged: (listener: Cip103EventListener<TxChangedEvent>) => Cip103AdapterEventUnsubscribe
}

export function createCip103Adapter(source: Cip103AdapterSource): Cip103Adapter {
  return {
    getProvider: () => resolveProvider(source),
    connect: () => invoke(source, 'connect'),
    disconnect: () => invoke(source, 'disconnect'),
    status: () => invoke(source, 'status'),
    getActiveNetwork: () => invoke(source, 'getActiveNetwork'),
    listAccounts: () => invoke(source, 'listAccounts'),
    prepareExecute: (params) => invoke(source, 'prepareExecute', params),
    prepareExecuteAndWait: (params) => invoke(source, 'prepareExecuteAndWait', params),
    signMessage: (params) => invoke(source, 'signMessage', params),
    ledgerApi: (params) => invoke(source, 'ledgerApi', params),
    onStatusChanged: (listener) => subscribe(source, 'statusChanged', listener),
    onAccountsChanged: (listener) => subscribe(source, 'accountsChanged', listener),
    onTxChanged: (listener) => subscribe(source, 'txChanged', listener),
  }
}

function subscribe<TEvent extends Cip103EventName>(
  source: Cip103AdapterSource,
  event: TEvent,
  listener: Cip103EventListener<Cip103EventMap[TEvent]>,
): Cip103AdapterEventUnsubscribe {
  const provider = resolveProvider(source)
  provider.on(event, listener)

  return () => {
    provider.removeListener(event, listener)
  }
}

function resolveProvider(source: Cip103AdapterSource): Cip103Provider {
  if (isCip103Provider(source)) {
    return source
  }

  if ('provider' in source) {
    const providerOrFactory = source.provider
    if (isCip103Provider(providerOrFactory)) {
      return providerOrFactory
    }

    if (typeof providerOrFactory === 'function') {
      const resolved = providerOrFactory()
      if (isCip103Provider(resolved)) {
        return resolved
      }
    }
  }

  if ('getProvider' in source && typeof source.getProvider === 'function') {
    const provider = source.getProvider()
    if (isCip103Provider(provider)) {
      return provider
    }
  }

  if ('getConnectedProvider' in source && typeof source.getConnectedProvider === 'function') {
    const provider = source.getConnectedProvider()
    if (isCip103Provider(provider)) {
      return provider
    }
    throw new Error(
      'Expected a connected CIP-0103 provider, but getConnectedProvider() returned null or an invalid provider.',
    )
  }

  throw new TypeError(
    'Unsupported CIP-0103 adapter source. Provide a raw provider or an object exposing provider(), getProvider(), or getConnectedProvider().',
  )
}

function invoke<TMethod extends Cip103Method>(
  source: Cip103AdapterSource,
  method: TMethod,
  ...params: Cip103RpcMap[TMethod]['params'] extends undefined
    ? [] | [undefined]
    : [Cip103RpcMap[TMethod]['params']]
): Promise<Cip103RpcMap[TMethod]['result']> {
  const provider = resolveProvider(source)

  if (params.length === 0 || params[0] === undefined) {
    return provider.request({ method } as Cip103RequestArgs<TMethod>)
  }

  return provider.request({
    method,
    params: params[0],
  } as Cip103RequestArgs<TMethod>)
}
