#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { main as runCarpenterCli } from '@formwork/cli/bin';

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  return runCarpenterCli(argv);
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  void main().then((code) => {
    process.exit(code);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
