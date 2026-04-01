import { CantonjsError, type ErrorCode } from './base.js'

/** Command was rejected by the ledger. */
export class CommandRejectedError extends CantonjsError {
  readonly grpcStatusCode: number
  readonly rejectionReason: string

  constructor(rejectionReason: string, options?: { cause?: Error; grpcStatusCode?: number }) {
    super(`Command rejected: ${rejectionReason}`, {
      code: 'CJ3001' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'The ledger rejected this command. Check the rejection reason for details.',
        'Common causes: authorization failure, contract not active, duplicate command.',
      ],
    })
    this.name = 'CommandRejectedError'
    this.grpcStatusCode = options?.grpcStatusCode ?? 0
    this.rejectionReason = rejectionReason
  }
}

/** Contract was not found on the ledger. */
export class ContractNotFoundError extends CantonjsError {
  readonly contractId: string

  constructor(contractId: string) {
    super(`Contract not found: ${contractId}`, {
      code: 'CJ3002' as ErrorCode,
      metaMessages: [
        'The contract may have been archived or may not be visible to the current party.',
        `Contract ID: ${contractId}`,
      ],
    })
    this.name = 'ContractNotFoundError'
    this.contractId = contractId
  }
}

/** Party is not authorized for the requested operation. */
export class AuthorizationError extends CantonjsError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, {
      code: 'CJ3003' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'Ensure the party has the required rights (actAs or readAs) for this operation.',
        'Check that the JWT token includes the correct party claims.',
      ],
    })
    this.name = 'AuthorizationError'
  }
}
