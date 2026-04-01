import { describe, it, expect, vi } from 'vitest'
import { setupCantonSandbox } from './setupSandbox.js'

describe('setupCantonSandbox', () => {
  it('throws when cantonctl is not available', async () => {
    const execFn = vi.fn().mockRejectedValue(new Error('command not found'))

    await expect(
      setupCantonSandbox({ execFn }),
    ).rejects.toThrow('cantonctl is not installed')
  })

  it('starts sandbox and waits for health', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' }) // --version
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // dev start
      .mockResolvedValueOnce({ stdout: 'test-jwt-token', stderr: '' }) // auth token

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({
      port: 7777,
      execFn,
      fetchFn,
    })

    expect(sandbox.url).toBe('http://localhost:7777')
    expect(sandbox.transport).toBeDefined()
    expect(sandbox.client).toBeDefined()
    expect(typeof sandbox.teardown).toBe('function')

    // Verify cantonctl was called correctly
    expect(execFn).toHaveBeenCalledWith('cantonctl --version')
    expect(execFn).toHaveBeenCalledWith('cantonctl dev start --port 7777')
    expect(execFn).toHaveBeenCalledWith('cantonctl auth token')
  })

  it('uses provided token instead of cantonctl auth', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({
      token: 'my-custom-token',
      execFn,
      fetchFn,
    })

    // Should NOT call cantonctl auth
    expect(execFn).not.toHaveBeenCalledWith('cantonctl auth token')
    expect(sandbox.transport).toBeDefined()
  })

  it('uses default port 7575', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'jwt', stderr: '' })

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({ execFn, fetchFn })

    expect(sandbox.url).toBe('http://localhost:7575')
    expect(execFn).toHaveBeenCalledWith('cantonctl dev start --port 7575')
  })

  it('teardown calls cantonctl dev stop', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'jwt', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' }) // dev stop

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({ port: 8888, execFn, fetchFn })
    await sandbox.teardown()

    expect(execFn).toHaveBeenCalledWith('cantonctl dev stop --port 8888')
  })

  it('teardown does not throw if stop fails', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'jwt', stderr: '' })
      .mockRejectedValueOnce(new Error('already stopped'))

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({ execFn, fetchFn })
    // Should not throw
    await sandbox.teardown()
  })

  it('retries health check until ready', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'jwt', stderr: '' })

    let callCount = 0
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.reject(new Error('ECONNREFUSED'))
      }
      return Promise.resolve({ ok: true })
    }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({ execFn, fetchFn })
    expect(sandbox.transport).toBeDefined()
    expect(callCount).toBeGreaterThanOrEqual(3)
  })

  it('throws if health check times out', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })

    const fetchFn = vi.fn().mockRejectedValue(
      new Error('ECONNREFUSED'),
    ) as unknown as typeof fetch

    await expect(
      setupCantonSandbox({ timeout: 1000, execFn, fetchFn }),
    ).rejects.toThrow('did not become ready within 1000ms')
  }, 10000)

  it('client has TestClient methods', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'jwt', stderr: '' })

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({ execFn, fetchFn })

    expect(typeof sandbox.client.createContract).toBe('function')
    expect(typeof sandbox.client.exerciseChoice).toBe('function')
    expect(typeof sandbox.client.allocateParty).toBe('function')
    expect(typeof sandbox.client.getTime).toBe('function')
    expect(typeof sandbox.client.advanceTime).toBe('function')
  })
})
