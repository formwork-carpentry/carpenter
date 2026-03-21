import { describe, it, expect } from 'vitest';
import { ProjectGenerator, DEFAULT_CONFIG } from '../src/index.js';

describe('create-carpenter-app: ProjectGenerator', () => {
  it('generates files with default config', () => {
    const gen = new ProjectGenerator();
    const files = gen.generate();

    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => f.path === 'package.json')).toBe(true);
    expect(files.some((f) => f.path === 'tsconfig.json')).toBe(true);
    expect(files.some((f) => f.path === '.env')).toBe(true);
    expect(files.some((f) => f.path === '.gitignore')).toBe(true);
    expect(files.some((f) => f.path === 'src/index.ts')).toBe(true);
    expect(files.some((f) => f.path === 'src/server.ts')).toBe(true);
    expect(files.some((f) => f.path === 'src/routes/web.ts')).toBe(true);
  });

  it('package.json includes correct dependencies', () => {
    const gen = new ProjectGenerator({ name: 'test-app', database: 'postgres' });
    const files = gen.generate();
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);

    expect(pkg.name).toBe('test-app');
    expect(pkg.dependencies['@formwork/core']).toBeDefined();
    expect(pkg.dependencies['@formwork/foundation']).toBeDefined();
    expect(pkg.dependencies['@formwork/http']).toBeDefined();
    expect(pkg.dependencies['reflect-metadata']).toBeDefined();
    expect(pkg.dependencies['pg']).toBeDefined();
    expect(pkg.devDependencies['tsx']).toBeDefined();
    expect(pkg.scripts.dev).toBe('tsx --watch src/server.ts');
    expect(pkg.scripts.start).toBe('tsx src/server.ts');
  });

  it('api preset generates API routes and controller', () => {
    const gen = new ProjectGenerator({ preset: 'api' });
    const files = gen.generate();

    expect(files.some((f) => f.path === 'src/routes/api.ts')).toBe(true);
    expect(files.some((f) => f.path === 'src/controllers/UserController.ts')).toBe(true);
  });

  it('fullstack preset includes pages', () => {
    const gen = new ProjectGenerator({ preset: 'fullstack', ui: 'react' });
    const files = gen.generate();

    expect(files.some((f) => f.path === 'src/pages/Home.tsx')).toBe(true);
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);
    expect(pkg.dependencies['@formwork/ui']).toBeDefined();
  });

  it('minimal preset generates fewest files', () => {
    const gen = new ProjectGenerator({ preset: 'minimal', features: [] });
    const files = gen.generate();
    const fullGen = new ProjectGenerator({ preset: 'fullstack' });
    const fullFiles = fullGen.generate();

    expect(files.length).toBeLessThan(fullFiles.length);
  });

  it('monolith preset includes jobs and notifications', () => {
    const gen = new ProjectGenerator({ preset: 'monolith' });
    const files = gen.generate();

    expect(files.some((f) => f.path === 'src/jobs/ProcessOrder.ts')).toBe(true);
    expect(files.some((f) => f.path === 'src/notifications/OrderShipped.ts')).toBe(true);
  });

  it('.env uses correct database config', () => {
    const gen = new ProjectGenerator({ name: 'my-app', database: 'mysql' });
    const files = gen.generate();
    const env = files.find((f) => f.path === '.env')!.content;

    expect(env).toContain('DB_CONNECTION=mysql');
    expect(env).toContain('DB_PORT=3306');
  });

  it('auth feature generates User model + config', () => {
    const gen = new ProjectGenerator({ features: ['auth'] });
    const files = gen.generate();

    expect(files.some((f) => f.path === 'src/config/auth.ts')).toBe(true);
    expect(files.some((f) => f.path === 'src/models/User.ts')).toBe(true);

    const userModel = files.find((f) => f.path === 'src/models/User.ts')!.content;
    expect(userModel).toContain('BaseModel');
    expect(userModel).toContain('userstamps = true');
  });

  it('no-ui preset excludes @formwork/ui dependency', () => {
    const gen = new ProjectGenerator({ ui: 'none' });
    const files = gen.generate();
    const pkg = JSON.parse(files.find((f) => f.path === 'package.json')!.content);

    expect(pkg.dependencies['@formwork/ui']).toBeUndefined();
  });

  it('database config matches selected driver', () => {
    const gen = new ProjectGenerator({ database: 'sqlite' });
    const files = gen.generate();
    const dbConfig = files.find((f) => f.path === 'src/config/database.ts')!.content;

    expect(dbConfig).toContain("'sqlite'");
  });

  it('.env.example has empty values', () => {
    const gen = new ProjectGenerator();
    const files = gen.generate();
    const envExample = files.find((f) => f.path === '.env.example')!.content;

    // All values should be empty (just key=)
    const lines = envExample.split('\n').filter((l) => l.includes('='));
    for (const line of lines) {
      expect(line.endsWith('=')).toBe(true);
    }
  });

  it('getConfig() returns resolved config', () => {
    const gen = new ProjectGenerator({ name: 'custom' });
    const config = gen.getConfig();
    expect(config.name).toBe('custom');
    expect(config.preset).toBe(DEFAULT_CONFIG.preset);
  });

  it('routes file references app name', () => {
    const gen = new ProjectGenerator({ name: 'my-api' });
    const files = gen.generate();
    const routes = files.find((f) => f.path === 'src/routes/web.ts')!.content;
    expect(routes).toContain('my-api');
  });
});
