import { describe, it, expect } from 'vitest'
import { ConnectionError, HttpError, GrpcError, TimeoutError } from './transport.js'
import { CantonjsError } from './base.js'

describe('ConnectionError', () => {
  it('includes the URL in the message', () => {
    const error = new ConnectionError('http://localhost:7575')
    expect(error.name).toBe('ConnectionError')
    expect(error.code).toBe('CJ1001')
    expect(error.message).toContain('http://localhost:7575')
    expect(error).toBeInstanceOf(CantonjsError)
  })

  it('preserves the cause', () => {
    const cause = new Error('ECONNREFUSED')
    const error = new ConnectionError('http://localhost:7575', { cause })
    expect(error.cause).toBe(cause)
  })
})

describe('HttpError', () => {
  it('includes status code and text', () => {
    const error = new HttpError(401, 'Unauthorized')
    expect(error.name).toBe('HttpError')
    expect(error.code).toBe('CJ1002')
    expect(error.status).toBe(401)
    expect(error.message).toContain('401')
    expect(error.message).toContain('Unauthorized')
  })

  it('includes response body in meta messages', () => {
    const error = new HttpError(400, 'Bad Request', { body: '{"error":"invalid"}' })
    expect(error.message).toContain('{"error":"invalid"}')
  })

  it('stores headers', () => {
    const error = new HttpError(500, 'Internal Server Error', {
      headers: { 'x-request-id': 'abc123' },
    })
    expect(error.headers).toEqual({ 'x-request-id': 'abc123' })
  })
})

describe('GrpcError', () => {
  it('includes gRPC status code', () => {
    const error = new GrpcError(7, 'PERMISSION_DENIED')
    expect(error.name).toBe('GrpcError')
    expect(error.code).toBe('CJ1003')
    expect(error.grpcCode).toBe(7)
    expect(error.message).toContain('PERMISSION_DENIED')
  })
})

describe('TimeoutError', () => {
  it('includes timeout duration', () => {
    const error = new TimeoutError(30000)
    expect(error.name).toBe('TimeoutError')
    expect(error.code).toBe('CJ1004')
    expect(error.message).toContain('30000ms')
  })
})
