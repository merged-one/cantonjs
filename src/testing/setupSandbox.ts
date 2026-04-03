/**
 * Vitest fixture for Canton sandbox lifecycle via cantonctl.
 *
 * Requires cantonctl to be installed and available on PATH.
 * If cantonctl is not available, the fixture throws with a helpful message.
 *
 * @example
 * ```typescript
 * import { setupCantonSandbox } from 'cantonjs/testing'
 *
 * const sandbox = await setupCantonSandbox()
 * // sandbox.client is a fully configured TestClient
 * // sandbox.transport is the underlying transport
 * // sandbox.url is the JSON API base URL
 *
 * // ... run tests ...
 *
 * await sandbox.teardown()
 * ```
 */

import type { AuthProvider, SessionProvider } from '../auth/types.js'
import { jsonApi } from '../transport/json-api.js'
import { createTestClient, type TestClient } from '../clients/createTestClient.js'
import type { Transport, TransportConfig } from '../transport/types.js'
import type { Party } from '../types/party.js'

/** Configuration for sandbox setup. */
export type SandboxConfig = {
  /** Port for the JSON API. Default: 7575. */
  readonly port?: number
  /** Timeout in milliseconds for sandbox to become ready. Default: 30000. */
  readonly timeout?: number
  /** JWT token. If not provided, attempts to use cantonctl auth. */
  readonly token?: string
  /** Per-request bearer token provider for participant calls. */
  readonly auth?: AuthProvider
  /** Per-request session provider for participant calls. */
  readonly session?: SessionProvider
  /** Party for the TestClient. Default: allocated via sandbox. */
  readonly party?: Party
  /** Custom fetch implementation (for testing the fixture itself). */
  readonly fetchFn?: typeof fetch
  /** Custom exec implementation (for testing the fixture itself). */
  readonly execFn?: (cmd: string) => Promise<{ stdout: string; stderr: string }>
}

/** Result from setupCantonSandbox(). */
export type SandboxContext = {
  /** The base URL of the running sandbox JSON API. */
  readonly url: string
  /** The transport connected to the sandbox. */
  readonly transport: Transport
  /** A fully configured TestClient. */
  readonly client: TestClient
  /** Tear down the sandbox. */
  readonly teardown: () => Promise<void>
}

/** Default exec using child_process (Node.js only). */
export async function defaultExec(cmd: string): Promise<{ stdout: string; stderr: string }> {
  // Dynamic import keeps Node-only modules out of browser-oriented consumers.
  const cp = await import('node:child_process')
  const util = await import('node:util')
  const execAsync = util.promisify(cp.exec)
  return execAsync(cmd) as Promise<{ stdout: string; stderr: string }>
}

/** Check if cantonctl is available on PATH. */
async function checkCantonctl(
  execFn: (cmd: string) => Promise<{ stdout: string; stderr: string }>,
): Promise<boolean> {
  try {
    await execFn('cantonctl --version')
    return true
  } catch {
    return false
  }
}

/** Wait for the sandbox health endpoint to respond. */
async function waitForHealth(
  url: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  const interval = 500

  while (Date.now() < deadline) {
    try {
      const response = await fetchFn(`${url}/livez`)
      if (response.ok) return
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(
    `Canton sandbox did not become ready within ${timeoutMs}ms at ${url}`,
  )
}

async function resolveSandboxTransportConfig(
  url: string,
  fetchFn: typeof fetch,
  execFn: (cmd: string) => Promise<{ stdout: string; stderr: string }>,
  config: SandboxConfig,
): Promise<TransportConfig> {
  const transportConfig = {
    url,
    fetchFn,
    token: config.token,
    auth: config.auth,
    session: config.session,
  } satisfies TransportConfig

  if (
    transportConfig.token === undefined &&
    transportConfig.auth === undefined &&
    transportConfig.session === undefined
  ) {
    const result = await execFn('cantonctl auth token')
    return {
      ...transportConfig,
      token: result.stdout.trim(),
    }
  }

  return transportConfig
}

/**
 * Set up a Canton sandbox for integration testing.
 *
 * Requires `cantonctl` to be installed. Starts a sandbox,
 * waits for it to be ready, and returns a configured TestClient.
 *
 * Call `teardown()` when done to stop the sandbox.
 */
export async function setupCantonSandbox(
  config: SandboxConfig = {},
): Promise<SandboxContext> {
  const {
    port = 7575,
    timeout = 30000,
    fetchFn = globalThis.fetch,
    execFn = defaultExec,
  } = config

  const url = `http://localhost:${port}`

  // Check cantonctl is available
  const available = await checkCantonctl(execFn)
  if (!available) {
    throw new Error(
      'cantonctl is not installed or not on PATH.\n' +
      'Install it from: https://github.com/merged-one/cantonctl\n' +
      'Or provide a custom execFn for testing.',
    )
  }

  // Start sandbox
  await execFn(`cantonctl dev start --port ${port}`)

  // Wait for health
  await waitForHealth(url, timeout, fetchFn)

  const transport = jsonApi(
    await resolveSandboxTransportConfig(url, fetchFn, execFn, config),
  )

  const party = config.party ?? ('test-party' as Party)
  const client = createTestClient({ transport, party })

  return {
    url,
    transport,
    client,
    async teardown() {
      try {
        await execFn(`cantonctl dev stop --port ${port}`)
      } catch {
        // Best effort cleanup
      }
    },
  }
}
