import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { defaultExec, setupCantonSandbox } from './setupSandbox.js'

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

  it('treats an empty token as missing and falls back to cantonctl auth', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
      .mockResolvedValueOnce({ stdout: 'sandbox-jwt-token', stderr: '' })

    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({
      token: '',
      execFn,
      fetchFn,
    })

    expect(execFn).toHaveBeenCalledWith('cantonctl auth token')
    expect(sandbox.transport).toBeDefined()
  })

  it('uses an auth provider instead of cantonctl auth', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
    const auth = vi.fn().mockResolvedValue('fresh-auth-token')
    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({
      auth,
      execFn,
      fetchFn,
    })

    expect(execFn).not.toHaveBeenCalledWith('cantonctl auth token')
    expect(auth).not.toHaveBeenCalled()
    expect(sandbox.transport).toBeDefined()
  })

  it('uses a session provider instead of cantonctl auth', async () => {
    const execFn = vi.fn()
      .mockResolvedValueOnce({ stdout: 'cantonctl 0.1.0', stderr: '' })
      .mockResolvedValueOnce({ stdout: '', stderr: '' })
    const session = vi.fn().mockResolvedValue({
      token: 'fresh-session-token',
      headers: { 'x-session-source': 'sandbox' },
    })
    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch

    const sandbox = await setupCantonSandbox({
      session,
      execFn,
      fetchFn,
    })

    expect(execFn).not.toHaveBeenCalledWith('cantonctl auth token')
    expect(session).not.toHaveBeenCalled()
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

  it('defaultExec resolves cantonctl through PATH', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cantonctl-stub-'))
    const cantonctlPath = path.join(tempDir, 'cantonctl')
    const originalPath = process.env.PATH

    await fs.writeFile(
      cantonctlPath,
      [
        '#!/bin/sh',
        'if [ "$1" = "--version" ]; then',
        '  echo "cantonctl 0.1.0"',
        '  exit 0',
        'fi',
        'if [ "$1" = "dev" ] && [ "$2" = "start" ]; then',
        '  exit 0',
        'fi',
        'if [ "$1" = "auth" ] && [ "$2" = "token" ]; then',
        '  echo "stub-jwt-token"',
        '  exit 0',
        'fi',
        'if [ "$1" = "dev" ] && [ "$2" = "stop" ]; then',
        '  exit 0',
        'fi',
        'echo "unexpected cantonctl invocation" >&2',
        'exit 1',
        '',
      ].join('\n'),
      { mode: 0o755 },
    )
    await fs.chmod(cantonctlPath, 0o755)

    process.env.PATH = `${tempDir}${path.delimiter}${originalPath ?? ''}`

    try {
      await expect(defaultExec('cantonctl --version')).resolves.toMatchObject({
        stdout: 'cantonctl 0.1.0\n',
      })
    } finally {
      process.env.PATH = originalPath
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  })
})
