/**
 * Canton Identity Provider (IDP) configuration types.
 *
 * Identity providers allow delegating user authentication to external
 * OpenID Connect providers (e.g., Auth0, Okta, Keycloak).
 */

import type { ObjectMeta } from './party.js'

/** An identity provider configuration (wire format). */
export type IdentityProviderConfig = {
  readonly identityProviderId: string
  readonly isDeactivated?: boolean
  readonly issuer: string
  readonly jwksUrl: string
  readonly audience?: string
  readonly metadata?: ObjectMeta
}

/** Request to create an identity provider. */
export type CreateIdentityProviderRequest = {
  readonly identityProviderConfig: IdentityProviderConfig
}

/** Request to update an identity provider. */
export type UpdateIdentityProviderRequest = {
  readonly identityProviderConfig: IdentityProviderConfig
  readonly updateMask?: {
    readonly paths: readonly string[]
  }
}
