import { describe, it, expect, vi } from 'vitest'
import { grpc } from './grpc.js'
import type { GrpcTransportLike } from './grpc.js'

function mockGrpcTransport(response: unknown = {}): GrpcTransportLike {
  return {
    unary: vi.fn().mockResolvedValue({ message: response }),
  }
}

describe('grpc', () => {
  it('creates a transport with type "grpc"', () => {
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: mockGrpcTransport(),
    })
    expect(transport.type).toBe('grpc')
    expect(transport.url).toBe('http://localhost:7575')
  })

  it('strips trailing slashes from URL', () => {
    const transport = grpc({
      url: 'http://localhost:7575/',
      grpcTransport: mockGrpcTransport(),
    })
    expect(transport.url).toBe('http://localhost:7575')
  })

  it('forwards request body as message', async () => {
    const grpcTransportLike = mockGrpcTransport({ offset: 42 })
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: grpcTransportLike,
    })

    const result = await transport.request<{ offset: number }>({
      method: 'GET',
      path: '/v2/state/ledger-end',
    })

    expect(result.offset).toBe(42)
    expect(grpcTransportLike.unary).toHaveBeenCalledWith(
      { typeName: 'com.daml.ledger.api.v2.StateService' },
      { name: 'GetLedgerEnd' },
      undefined,
      undefined,
      {},
      {},
    )
  })

  it('includes Authorization header when token is provided', async () => {
    const grpcTransportLike = mockGrpcTransport({})
    const transport = grpc({
      url: 'http://localhost:7575',
      token: 'my-jwt-token',
      grpcTransport: grpcTransportLike,
    })

    await transport.request({ method: 'GET', path: '/v2/version' })

    const headers = (grpcTransportLike.unary as ReturnType<typeof vi.fn>).mock.calls[0]![4]
    expect(headers).toEqual({ Authorization: 'Bearer my-jwt-token' })
  })

  it('passes signal and timeout to gRPC transport', async () => {
    const grpcTransportLike = mockGrpcTransport({})
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: grpcTransportLike,
    })

    const controller = new AbortController()
    await transport.request({
      method: 'POST',
      path: '/v2/commands/submit-and-wait',
      body: { commands: [] },
      signal: controller.signal,
      timeout: 5000,
    })

    const calls = (grpcTransportLike.unary as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(calls[2]).toBe(controller.signal)
    expect(calls[3]).toBe(5000)
    expect(calls[5]).toEqual({ commands: [] })
  })

  it('maps command paths to CommandService', async () => {
    const grpcTransportLike = mockGrpcTransport({})
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: grpcTransportLike,
    })

    await transport.request({
      method: 'POST',
      path: '/v2/commands/submit-and-wait-for-transaction',
      body: {},
    })

    const calls = (grpcTransportLike.unary as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(calls[0]).toEqual({ typeName: 'com.daml.ledger.api.v2.CommandService' })
    expect(calls[1]).toEqual({ name: 'SubmitAndWaitForTransaction' })
  })

  it('maps interactive submission paths correctly', async () => {
    const grpcTransportLike = mockGrpcTransport({})
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: grpcTransportLike,
    })

    await transport.request({
      method: 'POST',
      path: '/v2/interactive-submission/prepare',
      body: {},
    })

    const calls = (grpcTransportLike.unary as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(calls[0]).toEqual({ typeName: 'com.daml.ledger.api.v2.InteractiveSubmissionService' })
    expect(calls[1]).toEqual({ name: 'PrepareSubmission' })
  })

  it('maps reassignment path correctly', async () => {
    const grpcTransportLike = mockGrpcTransport({})
    const transport = grpc({
      url: 'http://localhost:7575',
      grpcTransport: grpcTransportLike,
    })

    await transport.request({
      method: 'POST',
      path: '/v2/commands/submit-and-wait-for-reassignment',
      body: {},
    })

    const calls = (grpcTransportLike.unary as ReturnType<typeof vi.fn>).mock.calls[0]!
    expect(calls[1]).toEqual({ name: 'SubmitAndWaitForReassignment' })
  })
})
