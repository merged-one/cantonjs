import type { ActiveContract, EventFormat } from 'cantonjs'
import type { InferView, StableInterfaceDescriptor } from 'cantonjs-splice-interfaces'
import type {
  TokenInterfaceContract,
  TokenStandardLedgerClient,
  TokenStandardQueryOptions,
} from '../types.js'

export function buildInterfaceEventFormat(
  parties: readonly string[],
  interfaceId: string,
): EventFormat {
  return {
    filtersByParty: Object.fromEntries(
      parties.map((party) => [
        party,
        {
          cumulative: [
            {
              identifierFilter: {
                InterfaceFilter: {
                  value: {
                    interfaceId,
                    includeInterfaceView: true,
                    includeCreatedEventBlob: false,
                  },
                },
              },
            },
          ],
        },
      ]),
    ),
    verbose: true,
  }
}

export function extractInterfaceView<TDescriptor extends StableInterfaceDescriptor>(
  contract: ActiveContract,
  descriptor: TDescriptor,
): InferView<TDescriptor> | undefined {
  const matchedView = contract.createdEvent.interfaceViews?.find(
    (interfaceView: { readonly interfaceId: string; readonly viewValue: Record<string, unknown> }) =>
      interfaceView.interfaceId === descriptor.interfaceId,
  )

  return matchedView?.viewValue as InferView<TDescriptor> | undefined
}

export function toTokenInterfaceContract<TDescriptor extends StableInterfaceDescriptor>(
  contract: ActiveContract,
  descriptor: TDescriptor,
): TokenInterfaceContract<TDescriptor> | undefined {
  const view = extractInterfaceView(contract, descriptor)

  if (view === undefined) {
    return undefined
  }

  return {
    ...contract,
    interfaceId: descriptor.interfaceId,
    view,
  }
}

export async function queryInterfaceContracts<TDescriptor extends StableInterfaceDescriptor>(
  client: TokenStandardLedgerClient,
  descriptor: TDescriptor,
  options?: TokenStandardQueryOptions,
): Promise<readonly TokenInterfaceContract<TDescriptor>[]> {
  const parties = [client.actAs, ...(client.readAs ?? [])]
  const contracts = await client.queryContracts(descriptor.interfaceId, {
    activeAtOffset: options?.activeAtOffset,
    signal: options?.signal,
    eventFormat: buildInterfaceEventFormat(parties, descriptor.interfaceId),
  })

  return contracts
    .map((contract) => toTokenInterfaceContract(contract, descriptor))
    .filter((contract): contract is TokenInterfaceContract<TDescriptor> => contract !== undefined)
}
