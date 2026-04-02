/**
 * Transport abstraction for Canton API communication.
 *
 * Inspired by viem's transport pattern: clients are instantiated with a
 * transport that handles the actual request execution. This separates
 * client logic from communication concerns.
 */

import type { AuthContext, AuthProvider, AuthSession, SessionProvider } from '../auth/types.js'
import { AuthProviderError } from '../errors/auth.js'
import { CantonjsError } from '../errors/base.js'

/** A transport handles sending requests to a Canton node. */
export type Transport = {
  readonly type: string
  readonly url: string
  request: <TResponse = unknown>(args: TransportRequest) => Promise<TResponse>
}

/** A request to be sent via transport. */
export type TransportRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeout?: number
}

/** Authentication configuration shared by core transports. */
export type TransportAuthConfig = {
  /** Static JWT Bearer token for authentication. */
  readonly token?: string
  /** Per-request bearer token provider. */
  readonly auth?: AuthProvider
  /** Per-request session provider for advanced auth/header injection. */
  readonly session?: SessionProvider
}

/** Configuration shared by all transport types. */
export type TransportConfig = TransportAuthConfig & {
  /** Base URL of the Canton node. */
  readonly url: string
  /** Request timeout in milliseconds. Default: 30000. */
  readonly timeout?: number
  /** Custom fetch implementation (for testing or environments without global fetch). */
  readonly fetchFn?: typeof fetch
}

/** Factory function type for creating transports. */
export type TransportFactory = (config: TransportConfig) => Transport

export async function resolveTransportSession(
  config: TransportAuthConfig,
  context: AuthContext,
): Promise<AuthSession | undefined> {
  if (config.session !== undefined) {
    try {
      return await config.session(context)
    } catch (error) {
      throw toAuthProviderError(context, error)
    }
  }

  if (config.auth !== undefined) {
    try {
      const token = await config.auth(context)
      return token === undefined ? undefined : { token }
    } catch (error) {
      throw toAuthProviderError(context, error)
    }
  }

  return config.token === undefined ? undefined : { token: config.token }
}

export async function resolveTransportHeaders(
  config: TransportAuthConfig,
  context: AuthContext,
): Promise<Record<string, string>> {
  const session = await resolveTransportSession(config, context)
  const headers = session?.headers === undefined ? {} : { ...session.headers }

  if (session?.token !== undefined) {
    headers['Authorization'] = `Bearer ${session.token}`
  }

  return headers
}

function toAuthProviderError(context: AuthContext, error: unknown): CantonjsError {
  if (error instanceof CantonjsError) {
    return error
  }

  return new AuthProviderError(context.transport, context.request.path, {
    cause: error instanceof Error ? error : new Error(String(error)),
  })
}
