/**
 * Canton party types.
 *
 * In Canton, the fundamental identity unit is the party — not an account or address.
 * A party's permissions are encoded in their JWT token.
 * Party IDs follow the format: `Name::fingerprint`
 */

/** A party identifier on the Canton ledger. */
export type Party = string & { readonly __party: true }

/** Object metadata for Canton resources. */
export type ObjectMeta = {
  readonly resourceVersion?: string
  readonly annotations?: Record<string, string>
}

/** Details about a known party (wire format). */
export type PartyDetails = {
  readonly party: string
  readonly isLocal?: boolean
  readonly localMetadata?: ObjectMeta
  readonly identityProviderId?: string
}

/** Request to allocate a new party. */
export type AllocatePartyRequest = {
  readonly partyIdHint?: string
  readonly localMetadata?: ObjectMeta
  readonly identityProviderId?: string
  readonly synchronizerId?: string
  readonly userId?: string
}
