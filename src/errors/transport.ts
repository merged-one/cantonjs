import { CantonjsError, type ErrorCode } from './base.js'

/** Error connecting to a Canton node. */
export class ConnectionError extends CantonjsError {
  constructor(url: string, options?: { cause?: Error }) {
    super(`Failed to connect to Canton node at ${url}`, {
      code: 'CJ1001' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'Ensure the Canton node is running and accessible.',
        `Attempted URL: ${url}`,
      ],
      docsPath: 'https://github.com/merged-one/cantonjs#connection',
    })
    this.name = 'ConnectionError'
  }
}

/** HTTP error from the JSON Ledger API. */
export class HttpError extends CantonjsError {
  readonly status: number
  readonly headers?: Record<string, string>

  constructor(
    status: number,
    statusText: string,
    options?: { cause?: Error; headers?: Record<string, string>; body?: string },
  ) {
    super(`HTTP ${status}: ${statusText}`, {
      code: 'CJ1002' as ErrorCode,
      cause: options?.cause,
      metaMessages: options?.body ? [`Response body: ${options.body}`] : undefined,
    })
    this.name = 'HttpError'
    this.status = status
    this.headers = options?.headers
  }
}

/** gRPC error from the Ledger API. */
export class GrpcError extends CantonjsError {
  readonly grpcCode: number

  constructor(grpcCode: number, message: string, options?: { cause?: Error }) {
    super(message, {
      code: 'CJ1003' as ErrorCode,
      cause: options?.cause,
      metaMessages: [`gRPC status code: ${grpcCode}`],
    })
    this.name = 'GrpcError'
    this.grpcCode = grpcCode
  }
}

/** Request timed out. */
export class TimeoutError extends CantonjsError {
  constructor(timeoutMs: number, options?: { cause?: Error }) {
    super(`Request timed out after ${timeoutMs}ms`, {
      code: 'CJ1004' as ErrorCode,
      cause: options?.cause,
      metaMessages: ['Consider increasing the timeout or checking network conditions.'],
    })
    this.name = 'TimeoutError'
  }
}
