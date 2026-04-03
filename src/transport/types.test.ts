import { describe, expect, it, vi } from 'vitest'
import type { AuthContext } from '../auth/types.js'
import { AuthProviderError } from '../errors/auth.js'
import { CantonjsError } from '../errors/base.js'
import {
  resolveTransportHeaders,
  resolveTransportSession,
} from './types.js'

const context: AuthContext = {
  transport: 'json-api',
  url: 'https://participant.example.com',
  request: {
    method: 'GET',
    path: '/v2/time',
  },
}

describe('resolveTransportSession', () => {
  it('prefers session providers over auth providers and static tokens', async () => {
    const session = vi.fn().mockResolvedValue({
      token: 'session-token',
      headers: { 'x-session': 'splice' },
    })
    const auth = vi.fn().mockResolvedValue('auth-token')

    const resolved = await resolveTransportSession(
      {
        token: 'static-token',
        auth,
        session,
      },
      context,
    )

    expect(resolved).toEqual({
      token: 'session-token',
      headers: { 'x-session': 'splice' },
    })
    expect(session).toHaveBeenCalledWith(context)
    expect(auth).not.toHaveBeenCalled()
  })

  it('uses auth providers when no session provider is configured', async () => {
    const auth = vi.fn().mockResolvedValue('auth-token')

    await expect(resolveTransportSession({ auth }, context)).resolves.toEqual({
      token: 'auth-token',
    })
  })

  it('falls back to static tokens when no provider is configured', async () => {
    await expect(resolveTransportSession({ token: 'static-token' }, context)).resolves.toEqual({
      token: 'static-token',
    })
  })

  it('returns undefined when no authentication is configured', async () => {
    await expect(resolveTransportSession({}, context)).resolves.toBeUndefined()
  })

  it('wraps provider failures as AuthProviderError', async () => {
    await expect(
      resolveTransportSession(
        {
          session: async () => {
            throw new Error('oidc unavailable')
          },
        },
        context,
      ),
    ).rejects.toThrow(AuthProviderError)
  })

  it('preserves CantonjsError instances thrown by providers', async () => {
    const error = new CantonjsError('auth failed', { code: 'CJ2999' })

    await expect(
      resolveTransportSession(
        {
          auth: async () => {
            throw error
          },
        },
        context,
      ),
    ).rejects.toBe(error)
  })
})

describe('resolveTransportHeaders', () => {
  it('merges session headers with bearer authorization', async () => {
    const signal = new AbortController().signal
    const headers = await resolveTransportHeaders(
      {
        session: async () => ({
          token: 'session-token',
          headers: {
            'x-splice-network': 'test',
            'x-request-id': 'req-1',
          },
        }),
      },
      {
        ...context,
        request: {
          ...context.request,
          signal,
        },
      },
    )

    expect(headers).toEqual({
      'x-splice-network': 'test',
      'x-request-id': 'req-1',
      Authorization: 'Bearer session-token',
    })
  })

  it('returns copied session headers when no token is present', async () => {
    const headers = await resolveTransportHeaders(
      {
        session: async () => ({
          headers: { 'x-session': 'enabled' },
        }),
      },
      context,
    )

    expect(headers).toEqual({ 'x-session': 'enabled' })
  })
})
