/**
 * Structured error hierarchy for cantonjs.
 *
 * Follows viem's BaseError pattern with walk(), docsPath, and metaMessages.
 * Error code ranges are complementary to cantonctl's E1xxx-E8xxx system.
 *
 * cantonjs error ranges:
 *   CJ1xxx — Transport errors (connection, HTTP, gRPC)
 *   CJ2xxx — Authentication errors (JWT, token lifecycle)
 *   CJ3xxx — Ledger errors (command rejection, contract not found)
 *   CJ4xxx — Admin errors (party, user, package management)
 *   CJ5xxx — Streaming errors (subscription, reconnection)
 *   CJ6xxx — Codegen errors (type mismatch, generation failures)
 */

export type ErrorCode = `CJ${number}`

export class CantonjsError extends Error {
  readonly code: ErrorCode
  readonly shortMessage: string
  readonly docsPath?: string
  readonly metaMessages?: readonly string[]
  override readonly cause?: Error

  constructor(shortMessage: string, options: CantonjsErrorOptions) {
    const message = buildMessage(shortMessage, options)
    super(message)
    this.name = 'CantonjsError'
    this.code = options.code
    this.shortMessage = shortMessage
    this.docsPath = options.docsPath
    this.metaMessages = options.metaMessages
    this.cause = options.cause
  }

  /**
   * Walk the error cause chain, returning the first error matching the predicate.
   * Useful for finding specific error types in nested cause chains.
   */
  walk(fn?: (error: Error) => boolean): Error | undefined {
    if (fn === undefined) {
      return this.cause
    }
    if (fn(this)) {
      return this
    }
    if (this.cause instanceof CantonjsError) {
      return this.cause.walk(fn)
    }
    if (this.cause !== undefined && fn(this.cause)) {
      return this.cause
    }
    return undefined
  }
}

export type CantonjsErrorOptions = {
  readonly code: ErrorCode
  readonly cause?: Error
  readonly docsPath?: string
  readonly metaMessages?: readonly string[]
}

function buildMessage(shortMessage: string, options: CantonjsErrorOptions): string {
  const parts: string[] = [shortMessage]

  if (options.metaMessages !== undefined && options.metaMessages.length > 0) {
    parts.push('')
    for (const meta of options.metaMessages) {
      parts.push(`  ${meta}`)
    }
  }

  if (options.docsPath !== undefined) {
    parts.push('')
    parts.push(`  Docs: ${options.docsPath}`)
  }

  parts.push('')
  parts.push(`  Error code: ${options.code}`)

  return parts.join('\n')
}
