/**
 * Canton party types.
 *
 * In Canton, the fundamental identity unit is the party — not an account or address.
 * A party's permissions are encoded in their JWT token.
 */

/** A party identifier on the Canton ledger. */
export type Party = string & { readonly __party: true }

/** Details about a known party. */
export type PartyDetails = {
  readonly party: Party
  readonly displayName: string
  readonly isLocal: boolean
  readonly identityProviderId: string
}

/** Request to allocate a new party. */
export type AllocatePartyRequest = {
  readonly identifierHint?: string
  readonly displayName?: string
  readonly identityProviderId?: string
}
