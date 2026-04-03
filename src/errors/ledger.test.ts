import { describe, expect, it } from 'vitest'
import {
  AuthorizationError,
  CommandRejectedError,
  ContractNotFoundError,
} from './ledger.js'

describe('ledger errors', () => {
  it('captures rejection metadata for rejected commands', () => {
    const cause = new Error('ABORTED')
    const error = new CommandRejectedError('contract not active', {
      cause,
      grpcStatusCode: 10,
    })

    expect(error.name).toBe('CommandRejectedError')
    expect(error.code).toBe('CJ3001')
    expect(error.rejectionReason).toBe('contract not active')
    expect(error.grpcStatusCode).toBe(10)
    expect(error.cause).toBe(cause)
    expect(error.message).toContain('Command rejected: contract not active')
  })

  it('defaults rejected commands to grpc status code 0', () => {
    const error = new CommandRejectedError('duplicate command')
    expect(error.grpcStatusCode).toBe(0)
  })

  it('captures missing contract identifiers', () => {
    const error = new ContractNotFoundError('#contract-1')

    expect(error.name).toBe('ContractNotFoundError')
    expect(error.code).toBe('CJ3002')
    expect(error.contractId).toBe('#contract-1')
    expect(error.message).toContain('Contract not found: #contract-1')
  })

  it('captures authorization failures and preserves the cause', () => {
    const cause = new Error('PERMISSION_DENIED')
    const error = new AuthorizationError('actAs missing for Alice::1234', { cause })

    expect(error.name).toBe('AuthorizationError')
    expect(error.code).toBe('CJ3003')
    expect(error.cause).toBe(cause)
    expect(error.message).toContain('actAs missing for Alice::1234')
    expect(error.message).toContain('Ensure the party has the required rights')
  })
})
