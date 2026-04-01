import { describe, it, expect } from 'vitest'
import { CantonjsError, type ErrorCode } from './base.js'

describe('CantonjsError', () => {
  it('creates an error with code and short message', () => {
    const error = new CantonjsError('Something went wrong', {
      code: 'CJ1001' as ErrorCode,
    })

    expect(error.name).toBe('CantonjsError')
    expect(error.code).toBe('CJ1001')
    expect(error.shortMessage).toBe('Something went wrong')
    expect(error.message).toContain('Something went wrong')
    expect(error.message).toContain('CJ1001')
  })

  it('includes meta messages in the formatted message', () => {
    const error = new CantonjsError('Connection failed', {
      code: 'CJ1001' as ErrorCode,
      metaMessages: ['Check that the server is running.', 'URL: http://localhost:7575'],
    })

    expect(error.message).toContain('Check that the server is running.')
    expect(error.message).toContain('URL: http://localhost:7575')
    expect(error.metaMessages).toHaveLength(2)
  })

  it('includes docs path in the formatted message', () => {
    const error = new CantonjsError('Auth failed', {
      code: 'CJ2001' as ErrorCode,
      docsPath: 'https://docs.example.com/auth',
    })

    expect(error.message).toContain('https://docs.example.com/auth')
    expect(error.docsPath).toBe('https://docs.example.com/auth')
  })

  it('preserves the cause error', () => {
    const cause = new Error('underlying error')
    const error = new CantonjsError('Wrapped error', {
      code: 'CJ1001' as ErrorCode,
      cause,
    })

    expect(error.cause).toBe(cause)
  })

  it('walk() returns cause when no predicate is given', () => {
    const cause = new Error('root cause')
    const error = new CantonjsError('Outer', {
      code: 'CJ1001' as ErrorCode,
      cause,
    })

    expect(error.walk()).toBe(cause)
  })

  it('walk() returns undefined when no cause and no predicate match', () => {
    const error = new CantonjsError('No cause', {
      code: 'CJ1001' as ErrorCode,
    })

    expect(error.walk()).toBeUndefined()
  })

  it('walk() finds self when predicate matches', () => {
    const error = new CantonjsError('Match me', {
      code: 'CJ1001' as ErrorCode,
    })

    const found = error.walk((e) => e instanceof CantonjsError && e.code === ('CJ1001' as ErrorCode))
    expect(found).toBe(error)
  })

  it('walk() traverses nested CantonjsError chain', () => {
    const inner = new CantonjsError('Inner', { code: 'CJ2001' as ErrorCode })
    const outer = new CantonjsError('Outer', {
      code: 'CJ1001' as ErrorCode,
      cause: inner,
    })

    const found = outer.walk(
      (e) => e instanceof CantonjsError && e.code === ('CJ2001' as ErrorCode),
    )
    expect(found).toBe(inner)
  })

  it('walk() finds a non-CantonjsError cause matching predicate', () => {
    const cause = new TypeError('bad type')
    const error = new CantonjsError('Wrapper', {
      code: 'CJ1001' as ErrorCode,
      cause,
    })

    const found = error.walk((e) => e instanceof TypeError)
    expect(found).toBe(cause)
  })

  it('walk() returns undefined when no match in chain', () => {
    const inner = new CantonjsError('Inner', { code: 'CJ2001' as ErrorCode })
    const outer = new CantonjsError('Outer', {
      code: 'CJ1001' as ErrorCode,
      cause: inner,
    })

    const found = outer.walk((e) => e instanceof RangeError)
    expect(found).toBeUndefined()
  })

  it('is an instance of Error', () => {
    const error = new CantonjsError('Test', { code: 'CJ1001' as ErrorCode })
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CantonjsError)
  })
})
