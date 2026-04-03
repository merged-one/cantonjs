#!/usr/bin/env node

/**
 * CLI entry point for cantonjs-codegen.
 *
 * Usage:
 *   cantonjs-codegen --dar <path> --output <dir>
 */

import { runCli } from './runCli.js'

export { formatUsage, parseArgs, runCli } from './runCli.js'

void runCli().then((exitCode) => {
  if (exitCode !== 0) {
    process.exit(exitCode)
  }
})
