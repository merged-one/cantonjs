import { CantonjsError, type ErrorCode } from './base.js'

/** WebSocket connection to a Canton streaming endpoint failed. */
export class WebSocketError extends CantonjsError {
  constructor(url: string, options?: { cause?: Error }) {
    super(`WebSocket connection failed: ${url}`, {
      code: 'CJ5001' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'Ensure the Canton node is running and WebSocket endpoint is accessible.',
        `Attempted URL: ${url}`,
      ],
      docsPath: 'https://github.com/merged-one/cantonjs#streaming',
    })
    this.name = 'WebSocketError'
  }
}

/** Stream was closed unexpectedly by the server. */
export class StreamClosedError extends CantonjsError {
  readonly code_: number
  readonly reason: string

  constructor(code: number, reason: string) {
    super(`Stream closed unexpectedly: ${code} ${reason}`, {
      code: 'CJ5002' as ErrorCode,
      metaMessages: [
        `WebSocket close code: ${code}`,
        reason ? `Reason: ${reason}` : 'No reason provided by server.',
      ],
    })
    this.name = 'StreamClosedError'
    this.code_ = code
    this.reason = reason
  }
}

/** Reconnection attempts exhausted. */
export class ReconnectFailedError extends CantonjsError {
  constructor(attempts: number, options?: { cause?: Error }) {
    super(`Failed to reconnect after ${attempts} attempts`, {
      code: 'CJ5003' as ErrorCode,
      cause: options?.cause,
      metaMessages: [
        'The stream was unable to reconnect to the Canton node.',
        'Check network connectivity and node availability.',
      ],
    })
    this.name = 'ReconnectFailedError'
  }
}
