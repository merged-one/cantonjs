/**
 * Canton user management types.
 *
 * Users are the identity layer above parties. A user can act as multiple parties
 * and have different rights (read, write, admin).
 */

import type { Party } from './party.js'

/** A user in the Canton user management system. */
export type User = {
  readonly id: string
  readonly primaryParty?: Party
  readonly isDeactivated: boolean
  readonly identityProviderId: string
  readonly metadata?: {
    readonly resourceVersion: string
    readonly annotations: Record<string, string>
  }
}

/** Rights that can be granted to a user. */
export type UserRight =
  | { readonly type: 'canActAs'; readonly party: Party }
  | { readonly type: 'canReadAs'; readonly party: Party }
  | { readonly type: 'participantAdmin' }
  | { readonly type: 'identityProviderAdmin' }

/** Request to create a user. */
export type CreateUserRequest = {
  readonly id: string
  readonly primaryParty?: Party
  readonly rights?: readonly UserRight[]
  readonly identityProviderId?: string
}
