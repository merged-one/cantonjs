/**
 * DAR file parser.
 *
 * DAR (Daml Archive) files are ZIP archives containing:
 * - One or more .dalf files (Daml-LF protobuf-encoded packages)
 * - META-INF/MANIFEST.MF (manifest listing the main DALF)
 *
 * This module extracts DALF files from the DAR ZIP.
 */

import JSZip from 'jszip'

/** Extracted DALF entry from a DAR archive. */
export type DalfEntry = {
  readonly filename: string
  readonly bytes: Uint8Array
}

/**
 * Parse a DAR file and extract all DALF entries.
 *
 * @param darBytes - Raw bytes of the DAR file
 * @returns Array of DALF entries (filename + bytes)
 */
export async function parseDar(darBytes: Uint8Array): Promise<{
  dalfs: readonly DalfEntry[]
  mainDalf: string
}> {
  const zip = await JSZip.loadAsync(darBytes)

  // Read manifest to find main DALF
  const manifestFile = zip.file('META-INF/MANIFEST.MF')
  let mainDalf = ''

  if (manifestFile) {
    const manifest = await manifestFile.async('text')
    const mainMatch = manifest.match(/Main-Dalf:\s*(.+?)(?:\r?\n|$)/)
    if (mainMatch?.[1]) {
      mainDalf = mainMatch[1].trim()
    }
  }

  // Extract all DALF files
  const dalfs: DalfEntry[] = []

  for (const [filename, file] of Object.entries(zip.files)) {
    if (filename.endsWith('.dalf') && !file.dir) {
      const bytes = await file.async('uint8array')
      dalfs.push({ filename, bytes })
    }
  }

  if (dalfs.length === 0) {
    throw new Error('No .dalf files found in DAR archive')
  }

  // If no manifest, use the first DALF as main
  if (!mainDalf && dalfs.length > 0) {
    mainDalf = dalfs[0]!.filename
  }

  return { dalfs, mainDalf }
}
