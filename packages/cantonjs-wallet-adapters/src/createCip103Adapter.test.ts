import { describe, expect, it, vi } from 'vitest'
import { createCip103Adapter } from './createCip103Adapter.js'
import type {
  Cip103EventListener,
  Cip103EventMap,
  Cip103EventName,
  Cip103Method,
  Cip103Provider,
  Cip103RequestArgs,
  Cip103RpcMap,
  PrepareExecuteParams,
  Wallet,
} from './providerTypes.js'

type MockProvider = {
  readonly provider: Cip103Provider
  readonly request: ReturnType<typeof vi.fn>
  emit<TEvent extends Cip103EventName>(event: TEvent, payload: Cip103EventMap[TEvent]): void
}

function createMockProvider(): MockProvider {
  const listeners = new Map<Cip103EventName, Set<Cip103EventListener<unknown>>>()

  const request = vi.fn(
    async <TMethod extends Cip103Method>(
      args: Cip103RequestArgs<TMethod>,
    ): Promise<Cip103RpcMap[TMethod]['result']> => {
      switch (args.method) {
        case 'connect':
          return {
            isConnected: true,
            isNetworkConnected: true,
            userUrl: 'https://wallet.example.com/app',
          } as Cip103RpcMap[TMethod]['result']
        case 'disconnect':
          return null as Cip103RpcMap[TMethod]['result']
        case 'status':
          return {
            provider: {
              id: 'splice-wallet',
              providerType: 'browser',
            },
            connection: {
              isConnected: true,
              isNetworkConnected: true,
            },
            network: {
              networkId: 'test-net',
              ledgerApi: 'https://ledger.example.com',
              accessToken: 'jwt-123',
            },
          } as Cip103RpcMap[TMethod]['result']
        case 'getActiveNetwork':
          return {
            networkId: 'test-net',
            ledgerApi: 'https://ledger.example.com',
            accessToken: 'jwt-123',
          } as Cip103RpcMap[TMethod]['result']
        case 'listAccounts':
          return [createWallet('Alice::wallet', true)] as Cip103RpcMap[TMethod]['result']
        case 'prepareExecute':
          return null as Cip103RpcMap[TMethod]['result']
        case 'prepareExecuteAndWait':
          return {
            tx: {
              status: 'executed',
              commandId: args.params.commandId ?? 'cmd-1',
              payload: {
                updateId: 'update-1',
                completionOffset: 42,
              },
            },
          } as Cip103RpcMap[TMethod]['result']
        case 'signMessage':
          return {
            signature: `signed:${args.params.message}`,
          } as Cip103RpcMap[TMethod]['result']
        case 'ledgerApi':
          return {
            requestMethod: args.params.requestMethod,
            resource: args.params.resource,
          } as Cip103RpcMap[TMethod]['result']
      }
    },
  )

  const provider: Cip103Provider = {
    request,
    on(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add(listener as Cip103EventListener<unknown>)
      return provider
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener as Cip103EventListener<unknown>)
      return provider
    },
  }

  return {
    provider,
    request,
    emit(event, payload) {
      listeners.get(event)?.forEach((listener) => {
        listener(payload)
      })
    },
  }
}

function createWallet(partyId: string, primary = false): Wallet {
  return {
    primary,
    partyId,
    status: 'allocated',
    hint: partyId,
    publicKey: 'pubkey-1',
    namespace: 'wallet-namespace',
    networkId: 'test-net',
    signingProviderId: 'signer-1',
  }
}

describe('createCip103Adapter', () => {
  it('passes connect and disconnect through to the provider', async () => {
    const { provider, request } = createMockProvider()
    const adapter = createCip103Adapter(provider)

    await expect(adapter.connect()).resolves.toEqual({
      isConnected: true,
      isNetworkConnected: true,
      userUrl: 'https://wallet.example.com/app',
    })
    await expect(adapter.disconnect()).resolves.toBeNull()

    expect(request).toHaveBeenNthCalledWith(1, { method: 'connect' })
    expect(request).toHaveBeenNthCalledWith(2, { method: 'disconnect' })
  })

  it('looks up the active network from the provider', async () => {
    const { provider, request } = createMockProvider()
    const adapter = createCip103Adapter(provider)

    await expect(adapter.getActiveNetwork()).resolves.toEqual({
      networkId: 'test-net',
      ledgerApi: 'https://ledger.example.com',
      accessToken: 'jwt-123',
    })

    expect(request).toHaveBeenCalledWith({ method: 'getActiveNetwork' })
  })

  it('passes prepareExecute and prepareExecuteAndWait through unchanged', async () => {
    const { provider, request } = createMockProvider()
    const adapter = createCip103Adapter(provider)
    const params: PrepareExecuteParams = {
      commandId: 'cmd-123',
      commands: [
        {
          CreateCommand: {
            templateId: '#Pkg:Module:Template',
            createArguments: { owner: 'Alice::wallet' },
          },
        },
      ],
      actAs: ['Alice::wallet'],
    }

    await expect(adapter.prepareExecute(params)).resolves.toBeNull()
    await expect(adapter.prepareExecuteAndWait(params)).resolves.toEqual({
      tx: {
        status: 'executed',
        commandId: 'cmd-123',
        payload: {
          updateId: 'update-1',
          completionOffset: 42,
        },
      },
    })

    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'prepareExecute',
      params,
    })
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'prepareExecuteAndWait',
      params,
    })
  })

  it('passes signMessage through unchanged', async () => {
    const { provider, request } = createMockProvider()
    const adapter = createCip103Adapter(provider)

    await expect(adapter.signMessage({ message: 'hello canton' })).resolves.toEqual({
      signature: 'signed:hello canton',
    })

    expect(request).toHaveBeenCalledWith({
      method: 'signMessage',
      params: { message: 'hello canton' },
    })
  })

  it('subscribes to account change events and returns an unsubscribe function', () => {
    const { provider, emit } = createMockProvider()
    const adapter = createCip103Adapter(provider)
    const listener = vi.fn()

    const stop = adapter.onAccountsChanged(listener)
    const wallets = [createWallet('Bob::wallet')]

    emit('accountsChanged', wallets)
    expect(listener).toHaveBeenCalledWith(wallets)

    stop()
    emit('accountsChanged', [createWallet('Carol::wallet')])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('accepts official SDK-style getProvider and getConnectedProvider sources', async () => {
    const { provider } = createMockProvider()

    const fromClient = createCip103Adapter({
      getProvider: () => provider,
    })
    const fromSdk = createCip103Adapter({
      getConnectedProvider: () => provider,
    })

    await expect(fromClient.listAccounts()).resolves.toEqual([createWallet('Alice::wallet', true)])
    await expect(fromSdk.status()).resolves.toMatchObject({
      connection: {
        isConnected: true,
      },
    })
  })

  it('throws when getConnectedProvider returns null', () => {
    const adapter = createCip103Adapter({
      getConnectedProvider: () => null,
    })

    expect(() => adapter.getProvider()).toThrow(
      'Expected a connected CIP-0103 provider, but getConnectedProvider() returned null or an invalid provider.',
    )
  })
})
