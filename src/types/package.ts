/**
 * Canton package management types.
 *
 * Packages (DARs/DALFs) contain Daml code compiled for the ledger.
 */

/** Status of a package on the ledger. */
export type PackageStatus = 'REGISTERED' | 'UNKNOWN'

/** Details about a known package. */
export type PackageDetails = {
  readonly packageId: string
  readonly packageSize: number
  readonly sourceDescription: string
  readonly knownSince: string
}
