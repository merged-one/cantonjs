import type { JsTransaction, TaggedEvent, TaggedUpdate } from 'cantonjs'
import type {
  TokenStandardHistoryItem,
  TokenStandardV1InterfaceId,
} from '../types.js'
import { TOKEN_STANDARD_V1_INTERFACE_IDS } from '../types.js'

const tokenStandardInterfaceIdSet = new Set<string>(TOKEN_STANDARD_V1_INTERFACE_IDS)

function toTokenStandardInterfaceId(
  interfaceId: string | undefined,
): TokenStandardV1InterfaceId | undefined {
  if (interfaceId === undefined || !tokenStandardInterfaceIdSet.has(interfaceId)) {
    return undefined
  }

  return interfaceId as TokenStandardV1InterfaceId
}

function inferExercisedInterfaceId(
  interfaceId: string | undefined,
  implementedInterfaces: readonly string[] | undefined,
): TokenStandardV1InterfaceId | undefined {
  const directMatch = toTokenStandardInterfaceId(interfaceId)
  if (directMatch !== undefined) {
    return directMatch
  }

  const supportedImplementedInterfaces = (implementedInterfaces ?? [])
    .map((candidate) => toTokenStandardInterfaceId(candidate))
    .filter((candidate): candidate is TokenStandardV1InterfaceId => candidate !== undefined)

  return supportedImplementedInterfaces.length === 1 ? supportedImplementedInterfaces[0] : undefined
}

export function parseTokenStandardHistoryFromTransactionV1(
  transaction: JsTransaction,
): readonly TokenStandardHistoryItem[] {
  const history: TokenStandardHistoryItem[] = []

  transaction.events.forEach((event: TaggedEvent, eventIndex: number) => {
    if ('CreatedEvent' in event) {
      for (const interfaceView of event.CreatedEvent.interfaceViews ?? []) {
        const interfaceId = toTokenStandardInterfaceId(interfaceView.interfaceId)
        if (interfaceId === undefined) {
          continue
        }

        history.push({
          kind: 'created',
          interfaceId,
          contractId: event.CreatedEvent.contractId,
          templateId: event.CreatedEvent.templateId,
          updateId: transaction.updateId,
          offset: transaction.offset,
          eventIndex,
          effectiveAt: transaction.effectiveAt,
          recordTime: transaction.recordTime,
          synchronizerId: transaction.synchronizerId,
          view: interfaceView.viewValue,
        })
      }

      return
    }

    if ('ArchivedEvent' in event) {
      for (const implementedInterface of event.ArchivedEvent.implementedInterfaces ?? []) {
        const interfaceId = toTokenStandardInterfaceId(implementedInterface)
        if (interfaceId === undefined) {
          continue
        }

        history.push({
          kind: 'archived',
          interfaceId,
          contractId: event.ArchivedEvent.contractId,
          templateId: event.ArchivedEvent.templateId,
          updateId: transaction.updateId,
          offset: transaction.offset,
          eventIndex,
          effectiveAt: transaction.effectiveAt,
          recordTime: transaction.recordTime,
          synchronizerId: transaction.synchronizerId,
        })
      }

      return
    }

    if ('ExercisedEvent' in event) {
      const interfaceId = inferExercisedInterfaceId(
        event.ExercisedEvent.interfaceId,
        event.ExercisedEvent.implementedInterfaces,
      )

      if (interfaceId === undefined) {
        return
      }

      history.push({
        kind: 'exercised',
        interfaceId,
        contractId: event.ExercisedEvent.contractId,
        templateId: event.ExercisedEvent.templateId,
        updateId: transaction.updateId,
        offset: transaction.offset,
        eventIndex,
        effectiveAt: transaction.effectiveAt,
        recordTime: transaction.recordTime,
        synchronizerId: transaction.synchronizerId,
        choice: event.ExercisedEvent.choice,
        consuming: event.ExercisedEvent.consuming,
        choiceArgument: event.ExercisedEvent.choiceArgument,
        exerciseResult: event.ExercisedEvent.exerciseResult,
      })
    }
  })

  return history
}

export function parseTokenStandardHistoryFromUpdatesV1(
  updates: readonly TaggedUpdate[],
): readonly TokenStandardHistoryItem[] {
  return updates.flatMap((update) => {
    if ('Transaction' in update) {
      return parseTokenStandardHistoryFromTransactionV1(update.Transaction.value)
    }

    return []
  })
}
