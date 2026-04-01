/**
 * Canton user management types.
 *
 * Users are the identity layer above parties. A user can act as multiple parties
 * and have different rights.
 *
 * Rights on the wire use deeply nested tagged unions:
 *   { "kind": { "CanActAs": { "value": { "party": "..." } } } }
 */

import type { ObjectMeta } from './party.js'

/** A user in the Canton user management system (wire format). */
export type User = {
  readonly id: string
  readonly primaryParty?: string
  readonly isDeactivated?: boolean
  readonly metadata?: ObjectMeta
  readonly identityProviderId?: string
}

/** A right on the wire (tagged union). */
export type Right = {
  readonly kind: RightKind
}

/** Right kind (tagged discriminated union). */
export type RightKind =
  | { readonly CanActAs: { readonly value: { readonly party: string } } }
  | { readonly CanReadAs: { readonly value: { readonly party: string } } }
  | { readonly CanExecuteAs: { readonly value: { readonly party: string } } }
  | { readonly CanExecuteAsAnyParty: { readonly value: Record<string, never> } }
  | { readonly CanReadAsAnyParty: { readonly value: Record<string, never> } }
  | { readonly ParticipantAdmin: { readonly value: Record<string, never> } }
  | { readonly IdentityProviderAdmin: { readonly value: Record<string, never> } }

/** Request to create a user. */
export type CreateUserRequest = {
  readonly user: User
  readonly rights?: readonly Right[]
}
