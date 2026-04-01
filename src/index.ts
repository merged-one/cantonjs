// Clients
export {
  createLedgerClient,
  type LedgerClient,
  type LedgerClientConfig,
} from './clients/createLedgerClient.js'

export {
  createAdminClient,
  type AdminClient,
  type AdminClientConfig,
} from './clients/createAdminClient.js'

export {
  createTestClient,
  type TestClient,
  type TestClientConfig,
} from './clients/createTestClient.js'

// Transport
export { jsonApi } from './transport/json-api.js'
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
} from './errors/index.js'
export type { ErrorCode, CantonjsErrorOptions } from './errors/base.js'

// Chains
export { localNet, devNet, testNet, mainNet, type CantonChain } from './chains/definitions.js'

// Core types
export type {
  ContractId,
  TemplateId,
  Contract,
  CreatedEvent,
  ArchivedEvent,
  ExercisedEvent,
  Event,
} from './types/contract.js'

export type { Party, PartyDetails, AllocatePartyRequest } from './types/party.js'

export type {
  Command,
  CreateCommand,
  ExerciseCommand,
  ExerciseByKeyCommand,
  SubmitOptions,
  LedgerOffset,
  Completion,
  CompletionStatus,
} from './types/command.js'

export type {
  Transaction,
  TransactionTree,
  Reassignment,
  Update,
  TransactionShape,
} from './types/transaction.js'

export type { User, UserRight, CreateUserRequest } from './types/user.js'
export type { PackageStatus, PackageDetails } from './types/package.js'
