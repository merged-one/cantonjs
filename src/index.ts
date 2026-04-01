// Clients
export {
  createLedgerClient,
  type LedgerClient,
  type LedgerClientConfig,
  type CommandOptions,
  type QueryOptions,
  type ConnectedSynchronizer,
  type PrunedOffsets,
} from './clients/createLedgerClient.js'

export {
  createAdminClient,
  type AdminClient,
  type AdminClientConfig,
  type PaginationOptions,
  type PaginatedResult,
} from './clients/createAdminClient.js'

export {
  createTestClient,
  type TestClient,
  type TestClientConfig,
} from './clients/createTestClient.js'

// Transport
export { jsonApi } from './transport/json-api.js'
export { grpc, type GrpcTransportConfig, type GrpcTransportLike } from './transport/grpc.js'
export { fallback, type FallbackTransportConfig } from './transport/fallback.js'
export type { Transport, TransportConfig, TransportRequest } from './transport/types.js'

// Errors
export {
  CantonjsError,
  ConnectionError,
  HttpError,
  GrpcError,
  TimeoutError,
  CommandRejectedError,
  ContractNotFoundError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
  WebSocketError,
  StreamClosedError,
  ReconnectFailedError,
} from './errors/index.js'
export type { ErrorCode, CantonjsErrorOptions } from './errors/base.js'

// Chains
export { localNet, devNet, testNet, mainNet, type CantonChain } from './chains/definitions.js'

// Core types
export type {
  ContractId,
  TemplateId,
  CreatedEvent,
  ArchivedEvent,
  ExercisedEvent,
  TaggedEvent,
  ActiveContract,
  ContractEntry,
} from './types/contract.js'

export type { Party, ObjectMeta, PartyDetails, AllocatePartyRequest } from './types/party.js'

export type {
  LedgerOffset,
  TaggedCommand,
  JsCommands,
  TransactionShape,
  EventFormat,
  TransactionFormat,
} from './types/command.js'

export type {
  JsTransaction,
  TaggedUpdate,
  UpdateFormat,
} from './types/transaction.js'

export type { User, Right, RightKind, CreateUserRequest } from './types/user.js'
export type { PackageStatus, PackageDetails } from './types/package.js'
export type {
  IdentityProviderConfig,
  CreateIdentityProviderRequest,
  UpdateIdentityProviderRequest,
} from './types/idp.js'

export type {
  Reassignment,
  ReassignmentEvent,
  AssignedEvent,
  UnassignedEvent,
  ReassignmentCommand,
  UnassignCommand,
  AssignCommand,
} from './types/reassignment.js'

export type {
  PrepareSubmissionResponse,
  ExecuteSubmissionRequest,
  PartySignatures,
  Signature,
  SignatureFormat,
} from './types/interactive.js'

// Streaming
export { streamUpdates } from './streaming/streamUpdates.js'
export { streamContracts, type ActiveContractsResponse } from './streaming/streamContracts.js'
export { streamCompletions } from './streaming/streamCompletions.js'
export { toWebSocketUrl } from './streaming/createStream.js'
export type {
  WebSocketConstructor,
  WebSocketLike,
  ReconnectConfig,
  StreamOptions,
  StreamUpdatesOptions,
  StreamContractsOptions,
  StreamCompletionsOptions,
  CompletionEvent,
} from './streaming/types.js'
