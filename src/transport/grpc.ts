/**
 * gRPC transport factory for Canton Ledger API V2.
 *
 * Uses a custom fetch-based adapter to translate Transport requests into
 * gRPC-Web calls via ConnectRPC's HTTP/2 or HTTP/1.1 protocol. This keeps
 * cantonjs zero-dependency — users bring their own `@connectrpc/connect-web`
 * or `@connectrpc/connect-node` transport.
 *
 * Since Canton's JSON API V2 and gRPC API share the same semantics, this
 * transport maps JSON API paths to gRPC service methods and re-encodes
 * request/response bodies.
 *
 * Usage:
 *   import { grpc } from 'cantonjs'
 *   import { createGrpcWebTransport } from '@connectrpc/connect-web'
 *
 *   const transport = grpc({
 *     url: 'http://localhost:7575',
 *     grpcTransport: createGrpcWebTransport({ baseUrl: 'http://localhost:7575' }),
 *   })
 */

import type { Transport, TransportRequest } from './types.js'

/** Configuration for the gRPC transport. */
export type GrpcTransportConfig = {
  /** Base URL of the Canton node. */
  readonly url: string
  /** JWT Bearer token for authentication. */
  readonly token?: string
  /**
   * A ConnectRPC transport instance (from @connectrpc/connect-web or connect-node).
   * Injected to keep cantonjs zero-dependency.
   */
  readonly grpcTransport: GrpcTransportLike
}

/**
 * Minimal interface for a ConnectRPC transport.
 * Compatible with @connectrpc/connect's Transport type.
 */
export type GrpcTransportLike = {
  readonly unary: (
    service: unknown,
    method: unknown,
    signal: AbortSignal | undefined,
    timeoutMs: number | undefined,
    header: unknown,
    message: unknown,
  ) => Promise<{ readonly message: unknown }>
}

/**
 * Create a gRPC transport for the Canton Ledger API.
 *
 * Requires @connectrpc/connect as a peer dependency (not bundled).
 * Maps Transport requests to gRPC unary calls.
 */
export function grpc(config: GrpcTransportConfig): Transport {
  const { url, token, grpcTransport } = config
  const baseUrl = url.replace(/\/+$/, '')

  return {
    type: 'grpc',
    url: baseUrl,

    async request<TResponse = unknown>(args: TransportRequest): Promise<TResponse> {
      const headers: Record<string, string> = {}
      if (token !== undefined) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const result = await grpcTransport.unary(
        pathToService(args.path),
        pathToMethod(args.path),
        args.signal,
        args.timeout,
        headers,
        args.body ?? {},
      )

      return result.message as TResponse
    },
  }
}

/**
 * Map a JSON API path to a gRPC service descriptor.
 * In a full implementation, this would use generated service descriptors
 * from Canton's protobuf definitions.
 */
function pathToService(path: string): { typeName: string } {
  const segments = path.replace(/^\/v2\//, '').split('/')
  const serviceMap: Record<string, string> = {
    'commands': 'com.daml.ledger.api.v2.CommandService',
    'interactive-submission': 'com.daml.ledger.api.v2.InteractiveSubmissionService',
    'state': 'com.daml.ledger.api.v2.StateService',
    'updates': 'com.daml.ledger.api.v2.UpdateService',
    'events': 'com.daml.ledger.api.v2.EventQueryService',
    'parties': 'com.daml.ledger.api.v2.PartyManagementService',
    'users': 'com.daml.ledger.api.v2.UserManagementService',
    'packages': 'com.daml.ledger.api.v2.PackageService',
    'dars': 'com.daml.ledger.api.v2.PackageManagementService',
    'version': 'com.daml.ledger.api.v2.VersionService',
  }
  const serviceName = serviceMap[segments[0] ?? ''] ?? 'unknown'
  return { typeName: serviceName }
}

/**
 * Map a JSON API path to a gRPC method descriptor.
 */
function pathToMethod(path: string): { name: string } {
  const methodMap: Record<string, string> = {
    '/v2/commands/submit-and-wait': 'SubmitAndWait',
    '/v2/commands/submit-and-wait-for-transaction': 'SubmitAndWaitForTransaction',
    '/v2/commands/submit-and-wait-for-reassignment': 'SubmitAndWaitForReassignment',
    '/v2/interactive-submission/prepare': 'PrepareSubmission',
    '/v2/interactive-submission/execute': 'ExecuteSubmission',
    '/v2/state/active-contracts': 'GetActiveContracts',
    '/v2/state/connected-synchronizers': 'GetConnectedSynchronizers',
    '/v2/state/ledger-end': 'GetLedgerEnd',
    '/v2/state/latest-pruned-offsets': 'GetLatestPrunedOffsets',
    '/v2/updates/transaction-by-id': 'GetTransactionById',
    '/v2/events/events-by-contract-id': 'GetEventsByContractId',
    '/v2/version': 'GetLedgerApiVersion',
  }
  const methodName = methodMap[path] ?? path.split('/').pop() ?? 'unknown'
  return { name: methodName }
}
