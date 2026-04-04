# Splice Internal APIs

> [!NOTE]
> Historical experimental note. It describes the pre-prune handling of unstable Splice HTTP surfaces. In the current package set, validator-private experimental imports are removed entirely; keep this page only as provenance. Use [Migration notes](/MIGRATING_TO_SPLICE_SUPPORT) and [Package Architecture](/guide/package-architecture) for current guidance.

> [!WARNING]
> Experimental Splice wrappers in this repo are pinned to `vendor/splice/0.5.17`.
> They may break on any upstream release. They must remain isolated behind explicit experimental subpaths.

This repo keeps unstable Splice HTTP surfaces out of GA package entrypoints.
In the current package set, only the Scan experimental wrapper remains available, and only behind an explicit experimental subpath.

## Current Experimental Import Path

- `cantonjs-splice-scan/experimental`
  Exposes the `internal`, `deprecated`, and `pre-alpha` operations from the vendored `scan.yaml`.

## Removed From The Current Package Set

- `cantonjs-splice-validator/experimental`
  This existed in the pre-prune line to expose `validator-internal.yaml` plus `scan-proxy` routes whose backing Scan semantics were tagged `internal`.
  It is removed from the current package set and now survives only as migration history.

## Pinned Upstream Line

All experimental docs and wrappers in this milestone were generated from the vendored Splice release line at `vendor/splice/0.5.17`.

When updating the vendored Splice artifacts:

1. Regenerate the Scan experimental wrapper and committed generated types against the new vendored tag.
2. Update the warning banners in:
   - `packages/cantonjs-splice-scan/README.md`
   - `docs/experimental/splice-internal-apis.md`
3. Re-run the Scan package test/typecheck commands in the same change.

## Scope Rules

- Do not export experimental modules from `cantonjs-splice-scan` main entrypoint.
- Do not reintroduce validator-private experimental subpaths into the current package set without a separate scope and ownership review.
- Prefer thin pass-through wrappers that preserve upstream operation names and paths.
- Treat upstream `internal`, `deprecated`, `pre-alpha`, and `validator-internal` surfaces as unstable by default.
- If an upstream operation graduates to a stable public contract, move it into the GA surface in a separate milestone with its own documentation review.
