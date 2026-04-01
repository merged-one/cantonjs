/**
 * Factory for creating a test client for Canton sandbox.
 *
 * The TestClient provides sandbox lifecycle management, party allocation,
 * and time manipulation for testing. Extends LedgerClient + AdminClient.
 */

import type { Transport } from '../transport/types.js'
import type { Party, PartyDetails } from '../types/party.js'
import { createLedgerClient, type LedgerClient } from './createLedgerClient.js'
import { createAdminClient, type AdminClient } from './createAdminClient.js'

export type TestClientConfig = {
  readonly transport: Transport
  /** Default party for ledger operations. If not provided, one will be allocated. */
  readonly party?: Party
}

export type TestClient = LedgerClient &
  AdminClient & {
    /** Get the current ledger time (static-time sandbox only). */
    getTime: () => Promise<Date>

    /** Set the ledger time (static-time sandbox only). */
    setTime: (currentTime: Date, newTime: Date) => Promise<void>

    /** Advance ledger time by a duration in seconds (static-time sandbox only). */
    advanceTime: (seconds: number) => Promise<void>

    /** Allocate multiple parties at once. */
    allocateParties: (hints: readonly string[]) => Promise<readonly PartyDetails[]>
  }

export function createTestClient(config: TestClientConfig): TestClient {
  const { transport, party = 'test-party' as Party } = config

  const ledger = createLedgerClient({ transport, actAs: party })
  const admin = createAdminClient({ transport })

  return {
    ...ledger,
    ...admin,

    async getTime() {
      const response = await transport.request<{ currentTime: string }>({
        method: 'GET',
        path: '/v2/time',
      })
      return new Date(response.currentTime)
    },

    async setTime(currentTime, newTime) {
      await transport.request({
        method: 'POST',
        path: '/v2/time',
        body: {
          currentTime: currentTime.toISOString(),
          newTime: newTime.toISOString(),
        },
      })
    },

    async advanceTime(seconds) {
      const current = await this.getTime()
      const newTime = new Date(current.getTime() + seconds * 1000)
      await this.setTime(current, newTime)
    },

    async allocateParties(hints) {
      return Promise.all(
        hints.map((hint) =>
          admin.allocateParty({ partyIdHint: hint }),
        ),
      )
    },
  }
}
