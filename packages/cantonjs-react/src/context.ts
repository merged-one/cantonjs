/**
 * Canton React context and provider.
 *
 * CantonProvider wraps a TanStack QueryClientProvider and supplies the
 * LedgerClient to all child hooks via React context.
 */

import { createContext, useContext, createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { LedgerClient } from './types.js'

/** Context value holding the LedgerClient. */
type CantonContextValue = {
  readonly client: LedgerClient
}

const CantonContext = createContext<CantonContextValue | null>(null)

/** Props for CantonProvider. */
export type CantonProviderProps = {
  /** The LedgerClient instance to provide to hooks. */
  readonly client: LedgerClient
  /** Optional TanStack QueryClient. A default one is created if not provided. */
  readonly queryClient?: QueryClient
  readonly children?: ReactNode
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Provider component that supplies a LedgerClient to all cantonjs-react hooks.
 *
 * Must wrap any component tree that uses cantonjs-react hooks.
 *
 * @example
 * ```tsx
 * import { CantonProvider } from 'cantonjs-react'
 * import { createLedgerClient, jsonApi } from 'cantonjs'
 *
 * const client = createLedgerClient({
 *   transport: jsonApi({ url: 'http://localhost:7575', token: jwt }),
 *   actAs: 'Alice::1234',
 * })
 *
 * function App() {
 *   return (
 *     <CantonProvider client={client}>
 *       <MyDApp />
 *     </CantonProvider>
 *   )
 * }
 * ```
 */
export function CantonProvider({ client, queryClient, children }: CantonProviderProps) {
  return createElement(
    CantonContext.Provider,
    { value: { client } },
    createElement(
      QueryClientProvider,
      { client: queryClient ?? defaultQueryClient },
      children,
    ),
  )
}

/**
 * Access the LedgerClient from context.
 *
 * @throws If called outside a CantonProvider.
 */
export function useCantonClient(): LedgerClient {
  const ctx = useContext(CantonContext)
  if (!ctx) {
    throw new Error('useCantonClient must be used within a CantonProvider')
  }
  return ctx.client
}

/**
 * Access the current party identity.
 *
 * @returns The `actAs` party from the LedgerClient.
 */
export function useParty(): string {
  return useCantonClient().actAs
}
