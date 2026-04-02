# Splice Internal APIs

> [!WARNING]
> Experimental Splice wrappers in this repo are pinned to `vendor/splice/0.5.17`.
> They may break on any upstream release. They must remain isolated behind explicit experimental subpaths.

This repo keeps unstable Splice HTTP surfaces out of GA package entrypoints. Experimental wrappers exist only so downstream users can opt in deliberately while seeing the stability boundary in the import path.

## Import Paths

- `cantonjs-splice-scan/experimental`
  Exposes the `internal`, `deprecated`, and `pre-alpha` operations from the vendored `scan.yaml`.
- `cantonjs-splice-validator/experimental`
  Exposes the vendored `validator-internal.yaml` client plus the `scan-proxy` routes whose backing Scan semantics are tagged `internal` in the vendored `scan.yaml`.

## Pinned Upstream Line

All experimental docs and wrappers in this milestone were generated from the vendored Splice release line at `vendor/splice/0.5.17`.

When updating the vendored Splice artifacts:

1. Regenerate the experimental wrappers and committed generated types against the new vendored tag.
2. Update the warning banners in:
   - `packages/cantonjs-splice-scan/README.md`
   - `packages/cantonjs-splice-validator/README.md`
   - `docs/experimental/splice-internal-apis.md`
3. Re-run the Scan and Validator test/typecheck commands in the same change.

## Scope Rules

- Do not export experimental modules from `cantonjs-splice-scan` or `cantonjs-splice-validator` main entrypoints.
- Prefer thin pass-through wrappers that preserve upstream operation names and paths.
- Treat upstream `internal`, `deprecated`, `pre-alpha`, and `validator-internal` surfaces as unstable by default.
- If an upstream operation graduates to a stable public contract, move it into the GA surface in a separate milestone with its own documentation review.
