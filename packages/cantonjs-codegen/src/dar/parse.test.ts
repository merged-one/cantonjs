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
})
