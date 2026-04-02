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

function parseManifestHeaders(manifestContents: string): Map<string, string> {
  const logicalLines: string[] = []
  let currentLine = ''

  for (const rawLine of manifestContents.replace(/\r/g, '').split('\n')) {
    if (rawLine.startsWith(' ')) {
      currentLine += rawLine.slice(1)
      continue
    }

    if (currentLine) {
      logicalLines.push(currentLine)
    }

    currentLine = rawLine
  }

  if (currentLine) {
    logicalLines.push(currentLine)
  }

  const headers = new Map<string, string>()

  for (const line of logicalLines) {
    const separator = line.indexOf(':')

    if (separator === -1) {
      continue
    }

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    headers.set(key, value)
  }

  return headers
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
    const headers = parseManifestHeaders(manifest)
    const manifestMainDalf = headers.get('Main-Dalf')

    if (manifestMainDalf) {
      mainDalf = manifestMainDalf
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
