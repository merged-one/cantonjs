import { CantonjsError, type ErrorCode } from './base.js'

/** JWT token has expired. */
export class TokenExpiredError extends CantonjsError {
  readonly expiredAt: Date

  constructor(expiredAt: Date) {
    super('JWT token has expired', {
      code: 'CJ2001' as ErrorCode,
      metaMessages: [
        `Token expired at: ${expiredAt.toISOString()}`,
        'Generate a new token using cantonctl auth or your identity provider.',
      ],
    })
    this.name = 'TokenExpiredError'
    this.expiredAt = expiredAt
  }
}

/** JWT token is invalid or malformed. */
export class InvalidTokenError extends CantonjsError {
  constructor(reason: string, options?: { cause?: Error }) {
    super(`Invalid JWT token: ${reason}`, {
      code: 'CJ2002' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'Ensure the token is a valid JWT with the required Canton claims.',
        'Required scope: daml_ledger_api',
      ],
    })
    this.name = 'InvalidTokenError'
  }
}
