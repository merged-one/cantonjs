/**
 * Interactive submission types for external signing workflows.
 *
 * The interactive submission flow allows external signing of transactions:
 * 1. Prepare — submit commands, get back a prepared transaction with hash
 * 2. Sign — sign the hash externally (HSM, hardware wallet, etc.)
 * 3. Execute — submit the signed transaction
 *
 * Canton 3.3+ uses hashing algorithm V2.
 */

import type { TaggedCommand } from './command.js'

/** Request to prepare a transaction for external signing. */
export type PrepareSubmissionRequest = {
  readonly commands: readonly TaggedCommand[]
  readonly commandId: string
  readonly actAs: readonly string[]
  readonly readAs?: readonly string[]
  readonly workflowId?: string
  readonly synchronizerId?: string
  readonly submissionId?: string
}

/** Response from preparing a transaction — contains the hash to sign. */
export type PrepareSubmissionResponse = {
  readonly preparedTransaction: string
  readonly preparedTransactionHash: string
  readonly hashingSchemeVersion: string
}

/** Request to execute a previously prepared and signed transaction. */
export type ExecuteSubmissionRequest = {
  readonly preparedTransaction: string
  readonly partySignatures: readonly PartySignatures[]
  readonly submissionId?: string
}

/** Signatures from a party for a prepared transaction. */
export type PartySignatures = {
  readonly party: string
  readonly signatures: readonly Signature[]
}

/** A cryptographic signature. */
export type Signature = {
  readonly format: SignatureFormat
  readonly signature: string
  readonly signedBy: string
}

/** Supported signature formats. */
export type SignatureFormat = 'RAW'
