import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseDar } from './parse.js'

describe('parseDar', () => {
  it('reads wrapped Main-Dalf manifest headers', async () => {
    const zip = new JSZip()

    zip.file(
      'META-INF/MANIFEST.MF',
      [
        'Manifest-Version: 1.0',
        'Main-Dalf: pkg-1234567890abcdef/pkg-1234567890abcdef0123456789abcdef01234',
        ' 56789abcdef.dalf',
        '',
      ].join('\n'),
    )
    zip.file(
      'pkg-1234567890abcdef/pkg-1234567890abcdef0123456789abcdef0123456789abcdef.dalf',
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    )
    zip.file('pkg-1234567890abcdef/dependency.dalf', new Uint8Array([0xca, 0xfe]))

    const darBytes = await zip.generateAsync({ type: 'uint8array' })
    const parsed = await parseDar(darBytes)

    expect(parsed.mainDalf).toBe(
      'pkg-1234567890abcdef/pkg-1234567890abcdef0123456789abcdef0123456789abcdef.dalf',
    )
    expect(parsed.dalfs.map((dalf) => dalf.filename)).toEqual([
      'pkg-1234567890abcdef/pkg-1234567890abcdef0123456789abcdef0123456789abcdef.dalf',
      'pkg-1234567890abcdef/dependency.dalf',
    ])
  })

  it('falls back to the first dalf when the manifest is missing or malformed', async () => {
    const zip = new JSZip()
    zip.file(
      'META-INF/MANIFEST.MF',
      [
        'Manifest-Version: 1.0',
        'Broken Header',
        '',
      ].join('\n'),
    )
    zip.file('pkg-a/main.dalf', new Uint8Array([0x01]))
    zip.file('pkg-b/dependency.dalf', new Uint8Array([0x02]))

    const parsed = await parseDar(await zip.generateAsync({ type: 'uint8array' }))

    expect(parsed.mainDalf).toBe('pkg-a/main.dalf')
    expect(parsed.dalfs.map((dalf) => dalf.filename)).toEqual([
      'pkg-a/main.dalf',
      'pkg-b/dependency.dalf',
    ])
  })

  it('throws when the archive does not contain any dalf files', async () => {
    const zip = new JSZip()
    zip.file('META-INF/MANIFEST.MF', 'Manifest-Version: 1.0\n')

    await expect(
      parseDar(await zip.generateAsync({ type: 'uint8array' })),
    ).rejects.toThrow('No .dalf files found in DAR archive')
  })

  it('handles an empty manifest without emitting an extra logical header line', async () => {
    const zip = new JSZip()
    zip.file('META-INF/MANIFEST.MF', '')
    zip.file('pkg/main.dalf', new Uint8Array([0x01, 0x02]))

    const parsed = await parseDar(await zip.generateAsync({ type: 'uint8array' }))

    expect(parsed.mainDalf).toBe('pkg/main.dalf')
    expect(parsed.dalfs).toHaveLength(1)
  })
})
