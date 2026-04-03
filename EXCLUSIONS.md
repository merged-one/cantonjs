# Coverage Exclusions Registry

This file is the authoritative registry for every coverage exclusion in the repo.

Rules:
- Any `coverage.exclude` entry in a `vitest.config.ts` file must be listed here with a concrete reason.
- Any inline `v8 ignore` comment must be listed here with the exact file, line, and reason.
- Exclusions must be narrow. Generated code, barrel re-exports, test files, and pure type-only modules are acceptable. Ordinary runtime logic is not.
- If a branch can be tested meaningfully, test it instead of excluding it.
- `npm run verify:coverage-exclusions` is the enforcement check used by local validation and CI.

## Machine-readable registry

```json
{
  "coverageExcludes": [
    {
      "scope": "packages/cantonjs-codegen/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-codegen/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-codegen/vitest.config.ts",
      "target": "src/dar/types.ts",
      "reason": "DAR decoder type declarations are compile-time only."
    },
    {
      "scope": "packages/cantonjs-react/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-react/vitest.config.ts",
      "target": "src/**/*.test.tsx",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-react/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-react/vitest.config.ts",
      "target": "src/types.ts",
      "reason": "React package type declarations are compile-time only."
    },
    {
      "scope": "packages/cantonjs-splice-interfaces/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-splice-interfaces/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-splice-interfaces/vitest.config.ts",
      "target": "src/descriptors/types.ts",
      "reason": "Descriptor helper type declarations are compile-time only."
    },
    {
      "scope": "packages/cantonjs-splice-interfaces/vitest.config.ts",
      "target": "src/generated/**",
      "reason": "Generated Splice descriptor bindings are governed by artifact verification and contract tests instead of line-level coverage gates."
    },
    {
      "scope": "packages/cantonjs-splice-scan/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-splice-scan/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-splice-scan/vitest.config.ts",
      "target": "src/generated/**",
      "reason": "Generated Scan OpenAPI bindings are governed by spec verification and route-contract tests instead of line-level coverage gates."
    },
    {
      "scope": "packages/cantonjs-splice-token-standard/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-splice-token-standard/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-splice-validator/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-splice-validator/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-splice-validator/vitest.config.ts",
      "target": "src/generated/**",
      "reason": "Generated Validator OpenAPI bindings are governed by spec verification and route-contract tests instead of line-level coverage gates."
    },
    {
      "scope": "packages/cantonjs-wallet-adapters/vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "packages/cantonjs-wallet-adapters/vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "packages/cantonjs-wallet-adapters/vitest.config.ts",
      "target": "src/providerTypes.ts",
      "reason": "Wallet provider contract types are compile-time only."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/**/*.test.ts",
      "reason": "Vitest test files are not part of the shipped runtime surface."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/**/*.test-d.ts",
      "reason": "Type assertion tests are compile-time checks, not runtime behavior."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/**/index.ts",
      "reason": "Barrel re-exports do not add runtime behavior beyond the covered modules they re-export."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/auth/types.ts",
      "reason": "Auth helper type declarations are compile-time only."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/codegen/types.ts",
      "reason": "Codegen runtime type declarations are compile-time only."
    },
    {
      "scope": "vitest.config.ts",
      "target": "src/types/**",
      "reason": "Core Canton type definitions are compile-time only."
    }
  ],
  "inlineIgnores": [
    {
      "file": "packages/cantonjs-codegen/src/dar/decode.ts",
      "line": 192,
      "reason": "current protobufjs decode emits arrays for repeated fields; this keeps older decoded shapes safe"
    },
    {
      "file": "packages/cantonjs-codegen/src/dar/decode.ts",
      "line": 196,
      "reason": "current protobufjs decode uses lowercase field names; legacy aliases are kept for older decoded shapes"
    },
    {
      "file": "packages/cantonjs-codegen/src/dar/decode.ts",
      "line": 202,
      "reason": "current protobufjs decode emits interned string indexes; legacy raw strings are kept for older decoded shapes"
    },
    {
      "file": "packages/cantonjs-codegen/src/dar/decode.ts",
      "line": 207,
      "reason": "current protobufjs materializes missing primitive tags as 0 and unknown tags fall back to ANY"
    },
    {
      "file": "packages/cantonjs-codegen/src/dar/decode.ts",
      "line": 335,
      "reason": "protobufjs materializes absent bools as false, so the default is a compatibility shim"
    },
    {
      "file": "packages/cantonjs-codegen/src/emitter/emitModule.ts",
      "line": 94,
      "reason": "DamlDataTypeDef is an exhaustive union"
    },
    {
      "file": "packages/cantonjs-codegen/src/emitter/emitModule.ts",
      "line": 96,
      "reason": "unreachable with current decoded DamlDataTypeDef union"
    },
    {
      "file": "packages/cantonjs-codegen/src/emitter/emitModule.ts",
      "line": 273,
      "reason": "sibling and nested import paths are asserted in tests; this remains partially uncovered under V8 branch instrumentation"
    },
    {
      "file": "packages/cantonjs-codegen/src/mapper/typeMapper.ts",
      "line": 103,
      "reason": "the primitive map is exhaustive for supported non-container prims"
    }
  ]
}
```
