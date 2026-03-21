#!/usr/bin/env node
/**
 * @module create-carpenter-app
 * @description CLI entry point for scaffolding a new Carpenter application.
 *
 * Usage:
 *   npx create-carpenter-app my-app                    # Interactive mode
 *   npx create-carpenter-app my-app --preset api       # Skip prompts, use preset
 *   npx create-carpenter-app my-app --preset minimal --db sqlite --no-auth
 *
 * What happens:
 *   1. Parse CLI args (or prompt interactively)
 *   2. Generate project files based on selected preset + features
 *   3. Write files to disk
 *   4. Install dependencies
 *   5. Print next steps
 *
 * @patterns Template Method (scaffolding lifecycle), Strategy (presets)
 */

import { promises as fs, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { ProjectGenerator } from './index.js';
import type { ProjectConfig, Preset, Database, UIFramework } from './index.js';

// ── CLI Argument Parsing ──────────────────────────────────

interface CliArgs {
  name: string;
  preset?: Preset;
  db?: Database;
  ui?: UIFramework;
  features?: string[];
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  skipInstall?: boolean;
  help?: boolean;
}

type PromptFn = (message: string) => Promise<string>;

interface PromptAdapter {
  text(message: string, defaultValue?: string): Promise<string>;
  select<T extends string>(message: string, options: readonly T[], defaultValue: T): Promise<T>;
  multiselect(message: string, options: readonly string[], defaultValues: string[]): Promise<string[]>;
  confirm(message: string, defaultValue: boolean): Promise<boolean>;
  close(): Promise<void>;
}

const PRESET_OPTIONS: Preset[] = ['api', 'fullstack', 'minimal', 'monolith'];
const DATABASE_OPTIONS: Database[] = ['postgres', 'mysql', 'sqlite', 'mongodb'];
const UI_OPTIONS: UIFramework[] = ['react', 'vue', 'svelte', 'solid', 'none'];
const PACKAGE_MANAGER_OPTIONS: NonNullable<CliArgs['packageManager']>[] = ['npm', 'pnpm', 'yarn', 'bun'];
const FEATURE_OPTIONS = ['auth', 'cache', 'queue', 'mail', 'storage', 'realtime', 'i18n', 'tenancy', 'ai', 'admin', 'billing', 'graphql', 'otel', 'flags'];

class PromptCancelledError extends Error {
  constructor() {
    super('Prompt cancelled');
  }
}

/**
 * Parse process.argv into structured CLI arguments.
 *
 * Supports:
 *   create-carpenter-app my-app
 *   create-carpenter-app my-app --preset api
 *   create-carpenter-app my-app --db mysql --ui vue --features auth,cache,queue
 *   create-carpenter-app --help
 */
export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = { name: '' };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { args.help = true; continue; }
    if (arg === '--preset') { args.preset = argv[++i] as Preset; continue; }
    if (arg === '--db') { args.db = argv[++i] as Database; continue; }
    if (arg === '--ui') { args.ui = argv[++i] as UIFramework; continue; }
    if (arg === '--features') { args.features = argv[++i]?.split(','); continue; }
    if (arg === '--pm') { args.packageManager = argv[++i] as CliArgs['packageManager']; continue; }
    if (arg === '--skip-install') { args.skipInstall = true; continue; }
    // First non-flag argument is the project name
    if (!arg.startsWith('-') && !args.name) { args.name = arg; }
  }

  return args;
}

function formatOptions<T extends string>(options: readonly T[]): string {
  return options.map((option, index) => `${index + 1}) ${option}`).join(', ');
}

function resolveChoice<T extends string>(value: string, options: readonly T[], fallback: T): T {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;

  const byIndex = Number.parseInt(normalized, 10);
  if (!Number.isNaN(byIndex) && byIndex >= 1 && byIndex <= options.length) {
    return options[byIndex - 1]!;
  }

  return options.find((option) => option.toLowerCase() === normalized) ?? fallback;
}

function parseFeatureList(value: string, fallback: string[]): string[] {
  const normalized = value.trim();
  if (!normalized) return [...fallback];
  return normalized
    .split(',')
    .map((feature) => feature.trim())
    .filter(Boolean);
}

function resolveYesNo(value: string, fallback: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (['y', 'yes'].includes(normalized)) return true;
  if (['n', 'no'].includes(normalized)) return false;
  return fallback;
}

function toPromptAdapter(promptOrAdapter: PromptFn | PromptAdapter): PromptAdapter {
  if (typeof promptOrAdapter !== 'function') return promptOrAdapter;

  return {
    text: async (message: string, defaultValue = '') => {
      const value = await promptOrAdapter(`${message} [${defaultValue}]: `);
      return value.trim() || defaultValue;
    },
    select: async <T extends string>(message: string, options: readonly T[], defaultValue: T) => {
      const value = await promptOrAdapter(`${message} (${formatOptions(options)}) [${defaultValue}]: `);
      return resolveChoice(value, options, defaultValue);
    },
    multiselect: async (message: string, _options: readonly string[], defaultValues: string[]) => {
      const value = await promptOrAdapter(`${message} (comma-separated) [${defaultValues.join(',') || 'none'}]: `);
      return parseFeatureList(value, defaultValues);
    },
    confirm: async (message: string, defaultValue: boolean) => {
      const suffix = defaultValue ? '[Y/n]' : '[y/N]';
      const value = await promptOrAdapter(`${message} ${suffix}: `);
      return resolveYesNo(value, defaultValue);
    },
    close: async () => undefined,
  };
}

export async function promptForMissingArgs(args: CliArgs, promptOrAdapter: PromptFn | PromptAdapter): Promise<CliArgs> {
  const prompt = toPromptAdapter(promptOrAdapter);
  const hasExplicitSelections = args.preset !== undefined
    || args.db !== undefined
    || args.ui !== undefined
    || args.features !== undefined
    || args.packageManager !== undefined
    || args.skipInstall !== undefined;

  const name = args.name || await prompt.text('Project name', 'my-carpenter-app');

  const presetInput = args.preset
    ?? (hasExplicitSelections ? 'api' : await prompt.select('Preset', PRESET_OPTIONS, 'api'));

  const dbInput = args.db
    ?? (hasExplicitSelections ? 'postgres' : await prompt.select('Database', DATABASE_OPTIONS, 'postgres'));

  const uiInput = args.ui
    ?? (presetInput === 'api' || presetInput === 'minimal'
      ? 'none'
      : hasExplicitSelections ? 'react' : await prompt.select('UI framework', UI_OPTIONS, 'react'));

  const defaultFeatures = PRESET_FEATURES[presetInput];
  const featuresInput = args.features
    ?? (hasExplicitSelections ? defaultFeatures : await prompt.multiselect('Features', FEATURE_OPTIONS, defaultFeatures));

  const packageManager = args.packageManager
    ?? (hasExplicitSelections ? 'npm' : await prompt.select('Package manager', PACKAGE_MANAGER_OPTIONS, 'npm'));

  const installNow = args.skipInstall === undefined
    ? (hasExplicitSelections ? true : await prompt.confirm('Install dependencies now?', true))
    : !args.skipInstall;

  return {
    ...args,
    name,
    preset: presetInput,
    db: dbInput,
    ui: uiInput,
    features: featuresInput,
    packageManager,
    skipInstall: !installNow,
  };
}

function createReadlinePromptSession(): PromptAdapter {
  const rl = createInterface({ input, output });
  const question = (message: string) => rl.question(message);

  return {
    text: async (message: string, defaultValue = '') => {
      const value = await question(`${message} [${defaultValue}]: `);
      return value.trim() || defaultValue;
    },
    select: async <T extends string>(message: string, options: readonly T[], defaultValue: T) => {
      const value = await question(`${message} (${formatOptions(options)}) [${defaultValue}]: `);
      return resolveChoice(value, options, defaultValue);
    },
    multiselect: async (message: string, _options: readonly string[], defaultValues: string[]) => {
      const value = await question(`${message} (comma-separated) [${defaultValues.join(',') || 'none'}]: `);
      return parseFeatureList(value, defaultValues);
    },
    confirm: async (message: string, defaultValue: boolean) => {
      const suffix = defaultValue ? '[Y/n]' : '[y/N]';
      const value = await question(`${message} ${suffix}: `);
      return resolveYesNo(value, defaultValue);
    },
    close: async () => {
      await rl.close();
    },
  };
}

async function createPromptSession(): Promise<PromptAdapter> {
  if (!input.isTTY || !output.isTTY) {
    return createReadlinePromptSession();
  }

  try {
    const clack = await import('@clack/prompts');
    const resolveValue = <T>(value: T | symbol): T => {
      if (clack.isCancel(value)) {
        clack.cancel('Scaffolding cancelled.');
        throw new PromptCancelledError();
      }
      return value;
    };

    clack.intro('Create a Carpenter app');

    return {
      text: async (message: string, defaultValue = '') => resolveValue(await clack.text({
        message,
        placeholder: defaultValue || undefined,
        defaultValue: defaultValue || undefined,
      })),
      select: async <T extends string>(message: string, options: readonly T[], defaultValue: T) => resolveValue(await clack.select<string>({
        message,
        options: options.map((option) => ({ value: option, label: String(option) })),
        initialValue: defaultValue,
      })) as T,
      multiselect: async (message: string, options: readonly string[], defaultValues: string[]) => resolveValue(await clack.multiselect<string>({
        message,
        options: options.map((option) => ({ value: option, label: String(option) })),
        initialValues: defaultValues,
        required: false,
      })),
      confirm: async (message: string, defaultValue: boolean) => resolveValue(await clack.confirm({
        message,
        initialValue: defaultValue,
      })),
      close: async () => {
        clack.outro('Scaffolder configuration ready.');
      },
    };
  } catch {
    return createReadlinePromptSession();
  }
}

// ── Help Text ─────────────────────────────────────────────

export const HELP_TEXT = `
🪚 create-carpenter-app — Scaffold a new Carpenter application

USAGE
  npx create-carpenter-app <project-name> [options]

OPTIONS
  --preset <preset>     Project template (default: interactive)
                        api        — REST API with JWT auth, validation, queue
                        fullstack  — API + UI (React/Vue/Svelte) with SSR
                        minimal    — Bare-bones HTTP server, no ORM/auth
                        monolith   — Everything: API + UI + queue + mail + admin

  --db <database>       Database driver to configure
                        postgres   — PostgreSQL (default)
                        mysql      — MySQL / MariaDB
                        sqlite     — SQLite (file-based, no server needed)
                        mongodb    — MongoDB

  --ui <framework>      UI framework (fullstack/monolith presets only)
                        react      — React with JSX (default)
                        vue        — Vue 3 with SFC
                        svelte     — Svelte with SvelteKit
                        solid      — SolidJS
                        none       — No UI framework (API only)

  --features <list>     Comma-separated features to include
                        auth       — Authentication (JWT + session guards)
                        cache      — Cache system (memory, file, Redis)
                        queue      — Background job processing (sync, BullMQ)
                        mail       — Email sending (SMTP, Resend, SendGrid)
                        storage    — File storage (local, S3)
                        realtime   — WebSocket broadcasting
                        i18n       — Internationalization
                        tenancy    — Multi-tenant support
                        ai         — AI/LLM integration

  --pm <manager>        Package manager: npm (default), pnpm, yarn, bun
  --skip-install        Don't run npm install after scaffolding
  -h, --help            Show this help message

EXAMPLES
  npx create-carpenter-app my-api --preset api --db postgres
  npx create-carpenter-app my-saas --preset monolith --db mysql --features auth,tenancy,billing
  npx create-carpenter-app my-app --preset fullstack --ui vue --features auth,cache,mail
  npx create-carpenter-app quick-test --preset minimal --db sqlite --skip-install
`;

// ── Feature → Package Mapping ─────────────────────────────
// Maps feature names to the @formwork/* packages they require.
// This is what makes Carpenter modular — you only install what you use.

export const FEATURE_PACKAGES: Record<string, string[]> = {
  auth:     ['@formwork/auth', '@formwork/session'],
  cache:    ['@formwork/cache'],
  queue:    ['@formwork/queue'],
  mail:     ['@formwork/mail'],
  storage:  ['@formwork/storage'],
  realtime: ['@formwork/realtime'],
  i18n:     ['@formwork/i18n'],
  tenancy:  ['@formwork/tenancy'],
  ai:       ['@formwork/ai'],
  admin:    ['@formwork/admin'],
  billing:  ['@formwork/billing'],
  graphql:  ['@formwork/graphql'],
  otel:     ['@formwork/otel'],
  flags:    ['@formwork/flags'],
};

// Database driver → npm package
export const DB_PACKAGES: Record<Database, string> = {
  postgres: 'pg',
  mysql: 'mysql2',
  sqlite: 'better-sqlite3',
  mongodb: 'mongodb',
};

// Preset → default features included
export const PRESET_FEATURES: Record<Preset, string[]> = {
  minimal:   [],
  api:       ['auth', 'cache', 'queue', 'mail'],
  fullstack: ['auth', 'cache', 'queue', 'mail', 'storage', 'i18n'],
  monolith:  ['auth', 'cache', 'queue', 'mail', 'storage', 'i18n', 'realtime', 'admin'],
};

// ── Disk Writer ───────────────────────────────────────────

/**
 * Write generated files to disk and create the project directory structure.
 *
 * @param projectDir - Absolute path to the project directory
 * @param files - Generated files from ProjectGenerator
 * @returns Number of files written
 */
export async function writeProject(
  projectDir: string,
  files: Array<{ path: string; content: string }>,
): Promise<number> {
  await fs.mkdir(projectDir, { recursive: true });

  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    await fs.mkdir(join(fullPath, '..'), { recursive: true });
    await fs.writeFile(fullPath, file.content, 'utf-8');
  }

  // Create standard empty directories
  const dirs = ['src/models', 'src/controllers', 'src/middleware', 'src/jobs', 'tests', 'storage/logs', 'storage/cache', 'storage/app'];
  for (const dir of dirs) {
    await fs.mkdir(join(projectDir, dir), { recursive: true });
  }

  return files.length;
}

// ── Post-Install Instructions ─────────────────────────────

export function getNextSteps(config: ProjectConfig): string {
  const pm = config.packageManager;
  const run = pm === 'npm' ? 'npm run' : pm;

  return `
🪚 ${config.name} created successfully!

  cd ${config.name}
  ${pm} install
  ${run} dev

Your app includes:
  Preset:   ${config.preset}
  Database: ${config.database}
  UI:       ${config.ui}
  Features: ${config.features.join(', ') || '(none)'}

Next steps:
  1. Edit .env with your database credentials
  2. Run \`${run} typecheck\` to verify the starter
  3. Run \`${run} dev\` to start the dev server
  4. Visit http://localhost:3000/health

Documentation: https://carpenterjs.dev/docs
`;
}

// ── Main Entry Point ──────────────────────────────────────

/**
 * Execute the scaffolder CLI without exiting the parent process.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseCliArgs(argv);

  if (args.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  const promptSession = await createPromptSession();
  let resolvedArgs: CliArgs;
  try {
    resolvedArgs = await promptForMissingArgs(args, promptSession);
  } catch (error) {
    await promptSession.close();
    if (error instanceof PromptCancelledError) {
      return 0;
    }
    throw error;
  }
  await promptSession.close();

  const preset = resolvedArgs.preset ?? 'api';
  const features = resolvedArgs.features ?? PRESET_FEATURES[preset];

  const config: Partial<ProjectConfig> = {
    name: resolvedArgs.name,
    preset,
    database: resolvedArgs.db ?? 'postgres',
    ui: resolvedArgs.ui ?? (preset === 'api' || preset === 'minimal' ? 'none' : 'react'),
    features,
    packageManager: resolvedArgs.packageManager ?? 'npm',
  };

  console.log(`\n🪚 Creating ${resolvedArgs.name} with ${preset} preset...\n`);

  // Generate project files
  const generator = new ProjectGenerator(config);
  const files = generator.generate();

  // Write to disk
  const projectDir = join(process.cwd(), resolvedArgs.name);
  const count = await writeProject(projectDir, files);
  console.log(`  ✅ ${count} files created`);

  // Install dependencies
  if (!resolvedArgs.skipInstall) {
    const pm = config.packageManager ?? 'npm';
    console.log(`  📦 Installing dependencies with ${pm}...`);
    try {
      execSync(`${pm} install`, { cwd: projectDir, stdio: 'inherit' });
    } catch {
      console.log('  ⚠️  Install failed — run it manually after fixing any issues.');
    }
  }

  // Print next steps
  console.log(getNextSteps(generator.getConfig()));
  return 0;
}

/**
 * Main CLI function — called when the user runs `npx create-carpenter-app`.
 */
export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const code = await runCli(argv);
  if (code !== 0) {
    process.exit(code);
  }
}

function isDirectExecution(): boolean {
  return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
