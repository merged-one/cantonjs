import { describe, it, expect } from 'vitest'
import { WebSocketError, StreamClosedError, ReconnectFailedError } from './streaming.js'
import { CantonjsError } from './base.js'

describe('WebSocketError', () => {
  it('extends CantonjsError with code CJ5001', () => {
    const error = new WebSocketError('ws://localhost:7575/v2/updates')
    expect(error).toBeInstanceOf(CantonjsError)
    expect(error.code).toBe('CJ5001')
    expect(error.name).toBe('WebSocketError')
    expect(error.message).toContain('ws://localhost:7575/v2/updates')
  })

  it('includes the cause error', () => {
    const cause = new Error('ECONNREFUSED')
    const error = new WebSocketError('ws://localhost:7575/v2/updates', { cause })
    expect(error.cause).toBe(cause)
  })

  it('includes metaMessages with URL', () => {
    const error = new WebSocketError('ws://localhost:7575/v2/updates')
    expect(error.metaMessages).toBeDefined()
    expect(error.metaMessages!.some(m => m.includes('ws://localhost:7575/v2/updates'))).toBe(true)
  })
})

describe('StreamClosedError', () => {
  it('extends CantonjsError with code CJ5002', () => {
    const error = new StreamClosedError(1006, 'abnormal closure')
    expect(error).toBeInstanceOf(CantonjsError)
    expect(error.code).toBe('CJ5002')
    expect(error.name).toBe('StreamClosedError')
    expect(error.code_).toBe(1006)
    expect(error.reason).toBe('abnormal closure')
  })

  it('includes close code in metaMessages', () => {
    const error = new StreamClosedError(1006, 'timeout')
    expect(error.metaMessages).toBeDefined()
    expect(error.metaMessages!.some(m => m.includes('1006'))).toBe(true)
  })

  it('uses the empty-reason fallback message', () => {
    const error = new StreamClosedError(1000, '')
    expect(error.metaMessages).toContain('No reason provided by server.')
  })
})

describe('ReconnectFailedError', () => {
  it('extends CantonjsError with code CJ5003', () => {
    const error = new ReconnectFailedError(5)
    expect(error).toBeInstanceOf(CantonjsError)
    expect(error.code).toBe('CJ5003')
    expect(error.name).toBe('ReconnectFailedError')
    expect(error.message).toContain('5 attempts')
  })

  it('includes the last connection error as cause', () => {
    const cause = new Error('connection refused')
    const error = new ReconnectFailedError(3, { cause })
    expect(error.cause).toBe(cause)
  })

  it('is walkable via CantonjsError.walk()', () => {
    const cause = new WebSocketError('ws://localhost:7575/v2/updates')
    const error = new ReconnectFailedError(3, { cause })

    const found = error.walk((e) => e instanceof WebSocketError)
    expect(found).toBe(cause)
  })
})
