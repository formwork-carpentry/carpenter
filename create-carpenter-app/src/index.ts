/**
 * @module create-carpenter-app
 * @description Project scaffolder — generates a new Carpenter app with chosen preset
 *
 * Usage: npx create-carpenter-app my-app --preset api --ui react --db postgres
 *
 * @patterns Template Method (presets), Builder (project config), Factory (file generation)
 */

// ── Types ─────────────────────────────────────────────────

export type Preset = 'blank' | 'api' | 'fullstack' | 'minimal' | 'monolith' | 'saas';
export type UIFramework = 'react' | 'vue' | 'svelte' | 'solid' | 'none';
export type Database = 'postgres' | 'mysql' | 'sqlite' | 'mongodb';

export interface ProjectConfig {
  name: string;
  preset: Preset;
  ui: UIFramework;
  database: Database;
  features: string[];
  typescript: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
}

export interface GeneratedFile {
  path: string;
  content: string;
}

// ── Default Config ────────────────────────────────────────

export const DEFAULT_CONFIG: ProjectConfig = {
  name: 'my-carpenter-app',
  preset: 'fullstack',
  ui: 'react',
  database: 'postgres',
  features: ['auth', 'cache', 'queue', 'mail'],
  typescript: true,
  packageManager: 'npm',
};

// ── Template Generator ────────────────────────────────────

export class ProjectGenerator {
  private config: ProjectConfig;

  constructor(config: Partial<ProjectConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Generate all files for the project */
  generate(): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Core files
    files.push(this.packageJson());
    files.push(this.tsConfig());
    files.push(this.envFile());
    files.push(this.envExampleFile());
    files.push(this.gitignore());

    // App bootstrap
    files.push(this.appConfig());
    files.push(this.appEntry());
    files.push(this.serverEntry());
    files.push(this.routesFile());

    // Preset-specific files
    switch (this.config.preset) {
      case 'blank': files.push(...this.blankPreset()); break;
      case 'api': files.push(...this.apiPreset()); break;
      case 'fullstack': files.push(...this.fullstackPreset()); break;
      case 'minimal': files.push(...this.minimalPreset()); break;
      case 'monolith': files.push(...this.monolithPreset()); break;
      case 'saas': files.push(...this.saasPreset()); break;
    }

    // Database config
    files.push(this.databaseConfig());

    // Feature-specific files
    if (this.config.features.includes('auth')) files.push(...this.authFiles());
    if (this.config.features.includes('queue')) files.push(this.queueConfig());
    if (this.config.features.includes('mail')) files.push(this.mailConfig());

    return files;
  }

  /** Get the project config */
  getConfig(): ProjectConfig { return { ...this.config }; }

  // ── Core Templates ──────────────────────────────────────

  private packageJson(): GeneratedFile {
    const deps: Record<string, string> = {
      '@carpentry/formwork': '^1.0.0-alpha.0',
      'reflect-metadata': '^0.2.2',
    };

    // Database driver
    const dbPkg: Record<Database, string> = {
      postgres: 'pg', mysql: 'mysql2', sqlite: 'better-sqlite3', mongodb: 'mongodb',
    };
    deps[dbPkg[this.config.database]] = 'latest';

    if (this.config.ui === 'react') {
      deps['react'] = '^19.2.0';
      deps['react-dom'] = '^19.2.0';
    }

    return {
      path: 'package.json',
      content: JSON.stringify({
        name: this.config.name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          dev: 'tsx --watch src/server.ts',
          start: 'tsx src/server.ts',
          test: 'vitest run',
          typecheck: 'tsc --noEmit',
        },
        dependencies: deps,
        devDependencies: {
          typescript: '^5.9.3',
          vitest: '^4.1.0',
          tsx: '^4.21.0',
          '@types/node': '^22.0.0',
          ...(this.config.ui === 'react'
            ? {
                '@types/react': '^19.2.2',
                '@types/react-dom': '^19.2.2',
              }
            : {}),
        },
      }, null, 2),
    };
  }

  private tsConfig(): GeneratedFile {
    const compilerOptions: Record<string, unknown> = {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      outDir: './dist',
      rootDir: './src',
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    };

    if (this.config.ui === 'react') {
      compilerOptions.jsx = 'react-jsx';
    }

    return {
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions,
        include: ['src/**/*.ts', 'src/**/*.tsx'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
    };
  }

  private envFile(): GeneratedFile {
    return {
      path: '.env',
      content: [
        `APP_NAME=${this.config.name}`,
        'APP_ENV=development',
        'APP_DEBUG=true',
        'APP_PORT=3000',
        'APP_URL=http://localhost:3000',
        '',
        `DB_CONNECTION=${this.config.database}`,
        `DB_HOST=localhost`,
        `DB_PORT=${this.config.database === 'postgres' ? 5432 : this.config.database === 'mysql' ? 3306 : this.config.database === 'mongodb' ? 27017 : ''}`,
        `DB_DATABASE=${this.config.name.replace(/-/g, '_')}`,
        'DB_USERNAME=root',
        'DB_PASSWORD=',
        '',
        'CACHE_DRIVER=memory',
        'QUEUE_CONNECTION=sync',
        'MAIL_MAILER=log',
      ].join('\n'),
    };
  }

  private envExampleFile(): GeneratedFile {
    return { path: '.env.example', content: this.envFile().content.replace(/=.*/g, '=') };
  }

  private gitignore(): GeneratedFile {
    return {
      path: '.gitignore',
      content: ['node_modules/', 'dist/', '.env', '*.log', '.turbo/', 'coverage/'].join('\n'),
    };
  }

  private appConfig(): GeneratedFile {
    return {
      path: 'src/config/app.ts',
      content: `import { env } from '@carpentry/core';

export default {
  name: env('APP_NAME', '${this.config.name}'),
  env: env('APP_ENV', 'development'),
  debug: env('APP_DEBUG', true),
  port: env('APP_PORT', 3000),
};
`,
    };
  }

  private appEntry(): GeneratedFile {
    const imports = [`import 'reflect-metadata';`, `import { bootstrap } from '@carpentry/foundation';`, `import { Router, HttpKernel, CarpenterResponse } from '@carpentry/http';`, `import { registerRoutes } from './routes/web.js';`];
    const routeRegistrations = ['  registerRoutes(router);'];

    if (this.config.preset !== 'minimal') {
      imports.push(`import { registerApiRoutes } from './routes/api.js';`);
      routeRegistrations.push('  registerApiRoutes(router);');
    }

    return {
      path: 'src/index.ts',
      content: `${imports.join('\n')}

export async function createApp() {
  const { container, config } = await bootstrap({
    skipEnv: true,
    configOverrides: {
      app: {
        name: '${this.config.name}',
        debug: true,
        url: 'http://localhost:3000',
      },
    },
  });

  const router = new Router();
${routeRegistrations.join('\n')}

  router.get('/health', async () => CarpenterResponse.json({
    status: 'ok',
    app: config.get('app.name'),
    timestamp: new Date().toISOString(),
  }));

  const kernel = new HttpKernel(container, router, { debug: true });
  return { container, config, router, kernel };
}
`,
    };
  }

  private serverEntry(): GeneratedFile {
    return {
      path: 'src/server.ts',
      content: `import { serve } from '@carpentry/http';
import { createApp } from './index.js';

async function main() {
  const { kernel } = await createApp();
  serve(kernel, {
    port: parseInt(process.env['APP_PORT'] ?? '3000', 10),
    onReady: ({ port }) => {
      console.log('  ${this.config.name} on http://localhost:' + port);
      console.log('  Try: curl http://localhost:' + port + '/health');
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`,
    };
  }

  private routesFile(): GeneratedFile {
    return {
      path: 'src/routes/web.ts',
      content: `import { CarpenterResponse, type Router } from '@carpentry/http';

export function registerRoutes(router: Router): void {
  router.get('/', async () => CarpenterResponse.json({
    message: 'Welcome to ${this.config.name}!',
  }));
}
`,
    };
  }

  private databaseConfig(): GeneratedFile {
    return {
      path: 'src/config/database.ts',
      content: `import { env } from '@carpentry/core';

export default {
  default: env('DB_CONNECTION', '${this.config.database}'),
  connections: {
    ${this.config.database}: {
      driver: '${this.config.database}',
      host: env('DB_HOST', 'localhost'),
      port: env('DB_PORT', ${this.config.database === 'postgres' ? 5432 : this.config.database === 'mysql' ? 3306 : this.config.database === 'mongodb' ? 27017 : 0}),
      database: env('DB_DATABASE', '${this.config.name.replace(/-/g, '_')}'),
      username: env('DB_USERNAME', 'root'),
      password: env('DB_PASSWORD', ''),
    },
  },
};
`,
    };
  }

  // ── Preset Templates ────────────────────────────────────

  private apiPreset(): GeneratedFile[] {
    return [
      {
        path: 'src/routes/api.ts',
        content: `import { CarpenterResponse, type Router } from '@carpentry/http';

export function registerApiRoutes(router: Router): void {
  router.group({ prefix: '/api/v1' }, () => {
    router.get('/users', async () => CarpenterResponse.json({ data: [] }));
    router.post('/users', async () => CarpenterResponse.json({ data: { created: true } }, 201));
  });
}
`,
      },
      {
        path: 'src/controllers/UserController.ts',
        content: `import { BaseController } from '@carpentry/http';

export class UserController extends BaseController {
  async index() { return this.json({ data: [], meta: { total: 0 } }); }
  async show() { return this.json({ data: null }); }
  async store() { return this.created({ data: {} }); }
  async update() { return this.json({ data: {} }); }
  async destroy() { return this.noContent(); }
}
`,
      },
    ];
  }

  private fullstackPreset(): GeneratedFile[] {
    const isReact = this.config.ui === 'react';
    return [
      ...this.apiPreset(),
      {
        path: isReact ? 'src/pages/Home.tsx' : 'src/pages/Home.ts',
        content: isReact
          ? `export default function Home({ greeting }: { greeting: string }) {
  return <div><h1>{greeting}</h1></div>;
}
`
          : `export const homePage = {
  framework: '${this.config.ui}',
  component: 'Home',
};
`,
      },
    ];
  }

  private blankPreset(): GeneratedFile[] { return []; }

  private minimalPreset(): GeneratedFile[] { return []; }

  private saasPreset(): GeneratedFile[] {
    return [
      ...this.fullstackPreset(),
      { path: 'src/jobs/ProcessOrder.ts', content: `import { BaseJob } from '@carpentry/queue';\n\nexport class ProcessOrder extends BaseJob<{ orderId: number }> {\n  static queue = 'orders';\n  async handle(payload: { orderId: number }) {\n    // Process order\n  }\n}\n` },
      { path: 'src/notifications/OrderShipped.ts', content: `import { BaseNotification } from '@carpentry/notifications';\n\nexport class OrderShipped extends BaseNotification<{ orderId: number }> {\n  via() { return ['mail', 'database']; }\n}\n` },
      { path: 'src/config/tenancy.ts', content: `export default {\n  defaultTenant: 'default',\n  identifyBy: 'subdomain',\n  tenantModel: 'Tenant',\n};\n` },
      { path: 'src/config/billing.ts', content: `import { env } from '@carpentry/core';\n\nexport default {\n  provider: env('BILLING_PROVIDER', 'stripe'),\n  currency: 'usd',\n  plans: {\n    free: { price: 0, features: ['basic'] },\n    pro: { price: 29, features: ['basic', 'advanced'] },\n    enterprise: { price: 99, features: ['basic', 'advanced', 'enterprise'] },\n  },\n};\n` },
      { path: 'src/models/Tenant.ts', content: `import { BaseModel } from '@carpentry/orm';\n\nexport class Tenant extends BaseModel {\n  static table = 'tenants';\n  static fillable = ['name', 'slug', 'plan', 'owner_id'];\n}\n` },
    ];
  }

  private monolithPreset(): GeneratedFile[] {
    return [
      ...this.fullstackPreset(),
      { path: 'src/jobs/ProcessOrder.ts', content: `import { BaseJob } from '@carpentry/queue';\n\nexport class ProcessOrder extends BaseJob<{ orderId: number }> {\n  static queue = 'orders';\n  async handle(payload: { orderId: number }) {\n    // Process order\n  }\n}\n` },
      { path: 'src/notifications/OrderShipped.ts', content: `import { BaseNotification } from '@carpentry/notifications';\n\nexport class OrderShipped extends BaseNotification<{ orderId: number }> {\n  via() { return ['mail', 'database']; }\n}\n` },
    ];
  }

  // ── Feature Templates ───────────────────────────────────

  private authFiles(): GeneratedFile[] {
    return [
      {
        path: 'src/config/auth.ts',
        content: `export default {\n  defaultGuard: 'session',\n  guards: {\n    session: { driver: 'session', provider: 'users' },\n    api: { driver: 'token', provider: 'users' },\n  },\n  providers: {\n    users: { driver: 'orm', model: 'User' },\n  },\n};\n`,
      },
      {
        path: 'src/models/User.ts',
        content: `import { BaseModel } from '@carpentry/orm';\n\nexport class User extends BaseModel {\n  static table = 'users';\n  static fillable = ['name', 'email', 'password'];\n  static hidden = ['password'];\n  static userstamps = true;\n}\n`,
      },
    ];
  }

  private queueConfig(): GeneratedFile {
    return { path: 'src/config/queue.ts', content: `import { env } from '@carpentry/core';\n\nexport default {\n  default: env('QUEUE_CONNECTION', 'sync'),\n  connections: {\n    sync: { driver: 'sync' },\n    redis: { driver: 'redis', host: env('REDIS_HOST', 'localhost') },\n  },\n};\n` };
  }

  private mailConfig(): GeneratedFile {
    return { path: 'src/config/mail.ts', content: `import { env } from '@carpentry/core';\n\nexport default {\n  default: env('MAIL_MAILER', 'log'),\n  mailers: {\n    log: { driver: 'log' },\n    smtp: { driver: 'smtp', host: env('MAIL_HOST', 'localhost'), port: env('MAIL_PORT', 587) },\n  },\n  from: { email: 'noreply@example.com', name: env('APP_NAME', 'Carpenter') },\n};\n` };
  }
}
