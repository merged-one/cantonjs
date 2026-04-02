import { jsonApi, type TransportConfig } from 'cantonjs'

type Primitive = string | number | boolean
type QueryValue = Primitive | readonly Primitive[] | undefined | null

export type ScanHttpPathParams = Readonly<Record<string, Primitive>>
export type ScanHttpQuery = Readonly<Record<string, QueryValue>>

export type ScanHttpRequestOptions = {
  readonly pathParams?: ScanHttpPathParams
  readonly query?: ScanHttpQuery
  readonly headers?: Readonly<Record<string, string>>
  readonly signal?: AbortSignal
}

export type ScanHttpClientConfig = TransportConfig

export type ScanHttpClient = {
  readonly url: string
  getJson: <TResponse>(path: string, options?: ScanHttpRequestOptions) => Promise<TResponse>
  getText: (path: string, options?: ScanHttpRequestOptions) => Promise<string>
  postJson: <TResponse>(
    path: string,
    body?: unknown,
    options?: ScanHttpRequestOptions,
  ) => Promise<TResponse>
}

export function createScanHttpClient(config: ScanHttpClientConfig): ScanHttpClient {
  const transport = jsonApi(config)

  return {
    url: transport.url,

    async getJson<TResponse>(path: string, options?: ScanHttpRequestOptions) {
      return await transport.request<TResponse>({
        method: 'GET',
        path: buildRequestPath(path, options),
        headers: options?.headers === undefined ? undefined : { ...options.headers },
        signal: options?.signal,
      })
    },

    async getText(path: string, options?: ScanHttpRequestOptions) {
      return await transport.request<string>({
        method: 'GET',
        path: buildRequestPath(path, options),
        headers: options?.headers === undefined ? undefined : { ...options.headers },
        signal: options?.signal,
      })
    },

    async postJson<TResponse>(
      path: string,
      body?: unknown,
      options?: ScanHttpRequestOptions,
    ) {
      return await transport.request<TResponse>({
        method: 'POST',
        path: buildRequestPath(path, options),
        body,
        headers: options?.headers === undefined ? undefined : { ...options.headers },
        signal: options?.signal,
      })
    },
  }
}

function buildRequestPath(pathTemplate: string, options?: ScanHttpRequestOptions): string {
  const path = interpolatePathParams(pathTemplate, options?.pathParams)
  const queryString = buildQueryString(options?.query)
  return queryString.length === 0 ? path : `${path}?${queryString}`
}

function interpolatePathParams(pathTemplate: string, pathParams?: ScanHttpPathParams): string {
  return pathTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = pathParams?.[key]
    if (value === undefined) {
      throw new Error(`Missing required Scan path parameter: ${key}`)
    }
    return encodeURIComponent(String(value))
  })
}

function buildQueryString(query?: ScanHttpQuery): string {
  if (query === undefined) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item))
      }
      continue
    }

    params.append(key, String(value))
  }

  return params.toString()
}
