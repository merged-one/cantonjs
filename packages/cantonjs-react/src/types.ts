/**
 * Minimal type interfaces matching cantonjs exports.
 *
 * These are defined locally so cantonjs-react can be developed and tested
 * without requiring the cantonjs package to be published. At runtime,
 * users pass their actual cantonjs client instances.
 */

/** Minimal Transport interface matching cantonjs Transport. */
export type Transport = {
  readonly type: string
  readonly url: string
  request: <TResponse = unknown>(args: TransportRequest) => Promise<TResponse>
}

/** Minimal TransportRequest. */
export type TransportRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeout?: number
}

/** Minimal LedgerClient interface. */
export type LedgerClient = {
  readonly actAs: string
  readonly readAs: readonly string[]
  createContract: (
    templateId: string,
    createArguments: Record<string, unknown>,
    options?: { commandId?: string; workflowId?: string; signal?: AbortSignal },
  ) => Promise<CreatedEvent>
  exerciseChoice: (
    templateId: string,
    contractId: string,
    choice: string,
    choiceArgument: Record<string, unknown>,
    options?: { commandId?: string; workflowId?: string; signal?: AbortSignal },
  ) => Promise<JsTransaction>
  queryContracts: (
    templateId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<readonly ActiveContract[]>
}

/** Minimal CreatedEvent. */
export type CreatedEvent = {
  readonly contractId: string
  readonly templateId: string
  readonly createArgument: Record<string, unknown>
  readonly [key: string]: unknown
}

/** Minimal JsTransaction. */
export type JsTransaction = {
  readonly updateId: string
  readonly events: readonly Record<string, unknown>[]
  readonly [key: string]: unknown
}

/** Minimal ActiveContract. */
export type ActiveContract = {
  readonly createdEvent: CreatedEvent
  readonly synchronizerId: string
  readonly reassignmentCounter: number
}
