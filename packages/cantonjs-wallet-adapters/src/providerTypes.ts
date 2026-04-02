/**
 * Structural TypeScript types for CIP-0103-style wallet providers.
 *
 * These match the published `@canton-network/dapp-sdk` ecosystem closely
 * enough for structural interop without forcing a runtime dependency.
 */

export type CommandId = string
export type Party = string
export type NetworkId = string
export type LedgerApiUrl = string
export type AccessToken = string
export type ProviderId = string
export type ProviderType = 'browser' | 'desktop' | 'mobile' | 'remote'
export type RequestMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'
export type WalletStatus = 'initialized' | 'allocated' | 'removed'

export type JsCommands = readonly unknown[] | Readonly<Record<string, unknown>>

export type DisclosedContract = {
  readonly templateId?: string
  readonly contractId?: string
  readonly createdEventBlob: string
  readonly synchronizerId?: string
}

export type PrepareExecuteParams = {
  readonly commandId?: CommandId
  readonly commands: JsCommands
  readonly actAs?: readonly Party[]
  readonly readAs?: readonly Party[]
  readonly disclosedContracts?: readonly DisclosedContract[]
  readonly synchronizerId?: string
  readonly packageIdSelectionPreference?: readonly string[]
}

export type SignMessageParams = {
  readonly message: string
}

export type LedgerApiParams = {
  readonly requestMethod: RequestMethod
  readonly resource: string
  readonly body?: unknown
  readonly query?: Readonly<Record<string, unknown>>
  readonly path?: Readonly<Record<string, unknown>>
}

export type ProviderInfo = {
  readonly id: ProviderId
  readonly version?: string
  readonly providerType?: ProviderType
  readonly url?: string
  readonly userUrl?: string
}

export type ConnectResult = {
  readonly isConnected: boolean
  readonly reason?: string
  readonly isNetworkConnected: boolean
  readonly networkReason?: string
  readonly userUrl?: string
}

export type Network = {
  readonly networkId: NetworkId
  readonly ledgerApi?: LedgerApiUrl
  readonly accessToken?: AccessToken
}

export type Session = {
  readonly accessToken: AccessToken
  readonly userId: string
}

export type StatusEvent = {
  readonly provider: ProviderInfo
  readonly connection: ConnectResult
  readonly network?: Network
  readonly session?: Session
}

export type Wallet = {
  readonly primary: boolean
  readonly partyId: string
  readonly status: WalletStatus
  readonly hint: string
  readonly publicKey: string
  readonly namespace: string
  readonly networkId: NetworkId
  readonly signingProviderId: string
  readonly externalTxId?: string
  readonly topologyTransactions?: string
  readonly disabled?: boolean
  readonly reason?: string
}

export type ListAccountsResult = readonly Wallet[]
export type AccountsChangedEvent = readonly Wallet[]

export type TxChangedPendingEvent = {
  readonly status: 'pending'
  readonly commandId: CommandId
}

export type TxChangedSignedEvent = {
  readonly status: 'signed'
  readonly commandId: CommandId
  readonly payload: {
    readonly signature: string
    readonly signedBy: string
    readonly party: Party
  }
}

export type TxChangedExecutedEvent = {
  readonly status: 'executed'
  readonly commandId: CommandId
  readonly payload: {
    readonly updateId: string
    readonly completionOffset: number
  }
}

export type TxChangedFailedEvent = {
  readonly status: 'failed'
  readonly commandId: CommandId
}

export type TxChangedEvent =
  | TxChangedPendingEvent
  | TxChangedSignedEvent
  | TxChangedExecutedEvent
  | TxChangedFailedEvent

export type PrepareExecuteAndWaitResult = {
  readonly tx: TxChangedExecutedEvent
}

export type SignMessageResult = {
  readonly signature: string
}

export type LedgerApiResult = unknown

export type Cip103RpcMap = {
  readonly status: {
    readonly params: undefined
    readonly result: StatusEvent
  }
  readonly connect: {
    readonly params: undefined
    readonly result: ConnectResult
  }
  readonly disconnect: {
    readonly params: undefined
    readonly result: null
  }
  readonly getActiveNetwork: {
    readonly params: undefined
    readonly result: Network
  }
  readonly prepareExecute: {
    readonly params: PrepareExecuteParams
    readonly result: null
  }
  readonly prepareExecuteAndWait: {
    readonly params: PrepareExecuteParams
    readonly result: PrepareExecuteAndWaitResult
  }
  readonly signMessage: {
    readonly params: SignMessageParams
    readonly result: SignMessageResult
  }
  readonly ledgerApi: {
    readonly params: LedgerApiParams
    readonly result: LedgerApiResult
  }
  readonly listAccounts: {
    readonly params: undefined
    readonly result: ListAccountsResult
  }
}

export type Cip103Method = keyof Cip103RpcMap

export type Cip103RequestArgs<TMethod extends Cip103Method> =
  Cip103RpcMap[TMethod]['params'] extends undefined
    ? {
        readonly method: TMethod
        readonly params?: undefined
      }
    : {
        readonly method: TMethod
        readonly params: Cip103RpcMap[TMethod]['params']
      }

export type Cip103EventMap = {
  readonly statusChanged: StatusEvent
  readonly accountsChanged: AccountsChangedEvent
  readonly txChanged: TxChangedEvent
}

export type Cip103EventName = keyof Cip103EventMap

export type Cip103EventListener<TEvent> = (event: TEvent) => void

export type Cip103Provider = {
  request<TMethod extends Cip103Method>(
    args: Cip103RequestArgs<TMethod>,
  ): Promise<Cip103RpcMap[TMethod]['result']>
  on<TEvent extends Cip103EventName>(
    event: TEvent,
    listener: Cip103EventListener<Cip103EventMap[TEvent]>,
  ): Cip103Provider
  removeListener<TEvent extends Cip103EventName>(
    event: TEvent,
    listener: Cip103EventListener<Cip103EventMap[TEvent]>,
  ): Cip103Provider
}

export function isCip103Provider(value: unknown): value is Cip103Provider {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<Cip103Provider>).request === 'function' &&
    typeof (value as Partial<Cip103Provider>).on === 'function' &&
    typeof (value as Partial<Cip103Provider>).removeListener === 'function'
  )
}
