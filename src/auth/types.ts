export type MaybePromise<T> = T | Promise<T>

/** Request metadata exposed to auth/session providers. */
export type AuthContext = {
  /** Transport type making the request, e.g. json-api or grpc. */
  readonly transport: string
  /** Base URL for the target Canton endpoint. */
  readonly url: string
  /** HTTP-style request metadata for the current transport call. */
  readonly request: {
    readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    readonly path: string
    readonly headers?: Readonly<Record<string, string>>
    readonly signal?: AbortSignal
  }
}

/** A resolved auth session for a single request. */
export type AuthSession = {
  /** Bearer token to attach as Authorization header. */
  readonly token?: string
  /** Additional headers to attach for the current request. */
  readonly headers?: Readonly<Record<string, string>>
}

/** Per-request bearer token provider. */
export type AuthProvider = (context: AuthContext) => MaybePromise<string | undefined>

/** Per-request session provider for auth headers and bearer tokens. */
export type SessionProvider = (context: AuthContext) => MaybePromise<AuthSession | undefined>
