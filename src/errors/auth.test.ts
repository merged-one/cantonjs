import { describe, expect, it } from 'vitest'
import {
  AuthProviderError,
  InvalidTokenError,
  TokenExpiredError,
} from './auth.js'

describe('auth errors', () => {
  it('captures the expiry timestamp for expired tokens', () => {
    const expiredAt = new Date('2026-04-02T00:00:00.000Z')
    const error = new TokenExpiredError(expiredAt)

    expect(error.name).toBe('TokenExpiredError')
    expect(error.code).toBe('CJ2001')
    expect(error.expiredAt).toBe(expiredAt)
    expect(error.message).toContain('JWT token has expired')
    expect(error.message).toContain(expiredAt.toISOString())
  })

  it('wraps invalid token reasons and preserves the cause', () => {
    const cause = new Error('jwt malformed')
    const error = new InvalidTokenError('missing daml_ledger_api scope', { cause })

    expect(error.name).toBe('InvalidTokenError')
    expect(error.code).toBe('CJ2002')
    expect(error.cause).toBe(cause)
    expect(error.message).toContain('Invalid JWT token: missing daml_ledger_api scope')
    expect(error.message).toContain('Required scope: daml_ledger_api')
  })

  it('records transport and path details for auth provider failures', () => {
    const cause = new Error('oidc unavailable')
    const error = new AuthProviderError('json-api', '/v2/time', { cause })

    expect(error.name).toBe('AuthProviderError')
    expect(error.code).toBe('CJ2003')
    expect(error.cause).toBe(cause)
    expect(error.message).toContain('Transport: json-api')
    expect(error.message).toContain('Path: /v2/time')
  })
})
