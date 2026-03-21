import { describe, it, expect } from 'vitest';

import { parseCliArgs, promptForMissingArgs } from '../src/cli.js';

function createPrompt(responses: string[]) {
  let index = 0;
  return async () => responses[index++] ?? '';
}

describe('create-carpenter-app: cli', () => {
  it('parses structured CLI args', () => {
    const parsed = parseCliArgs([
      'my-app',
      '--preset', 'fullstack',
      '--db', 'mysql',
      '--ui', 'vue',
      '--features', 'auth,cache',
      '--pm', 'pnpm',
      '--skip-install',
    ]);

    expect(parsed).toEqual({
      name: 'my-app',
      preset: 'fullstack',
      db: 'mysql',
      ui: 'vue',
      features: ['auth', 'cache'],
      packageManager: 'pnpm',
      skipInstall: true,
    });
  });

  it('prompts for missing values using defaults', async () => {
    const resolved = await promptForMissingArgs({ name: '' }, createPrompt([
      '',
      '',
      '',
      '',
      '',
      '',
    ]));

    expect(resolved.name).toBe('my-carpenter-app');
    expect(resolved.preset).toBe('api');
    expect(resolved.db).toBe('postgres');
    expect(resolved.ui).toBe('none');
    expect(resolved.features).toEqual(['auth', 'cache', 'queue', 'mail']);
    expect(resolved.packageManager).toBe('npm');
    expect(resolved.skipInstall).toBe(false);
  });

  it('prompts for fullstack UI and custom features', async () => {
    const resolved = await promptForMissingArgs({ name: 'demo' }, createPrompt([
      '2',
      '3',
      '2',
      'auth,cache,mail',
      '4',
      'n',
    ]));

    expect(resolved.name).toBe('demo');
    expect(resolved.preset).toBe('fullstack');
    expect(resolved.db).toBe('sqlite');
    expect(resolved.ui).toBe('vue');
    expect(resolved.features).toEqual(['auth', 'cache', 'mail']);
    expect(resolved.packageManager).toBe('bun');
    expect(resolved.skipInstall).toBe(true);
  });

  it('uses defaults for omitted flags when explicit selections are provided', async () => {
    const resolved = await promptForMissingArgs(
      { name: 'demo', preset: 'minimal', skipInstall: true },
      async () => {
        throw new Error('Prompt should not be called');
      },
    );

    expect(resolved.name).toBe('demo');
    expect(resolved.preset).toBe('minimal');
    expect(resolved.db).toBe('postgres');
    expect(resolved.ui).toBe('none');
    expect(resolved.features).toEqual([]);
    expect(resolved.packageManager).toBe('npm');
    expect(resolved.skipInstall).toBe(true);
  });
});
