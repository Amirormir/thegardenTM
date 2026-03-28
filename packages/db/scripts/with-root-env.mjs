import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(currentDirectory, '..');
const workspaceRoot = resolve(packageDirectory, '../..');

for (const envFileName of ['.env', '.env.local']) {
  const envFilePath = resolve(workspaceRoot, envFileName);

  if (existsSync(envFilePath)) {
    loadEnvFile(envFilePath);
  }
}

const [commandName, ...commandArgs] = process.argv.slice(2);

if (!commandName) {
  console.error('Missing command. Use "prisma" or "tsx".');
  process.exit(1);
}

if (!['prisma', 'tsx'].includes(commandName)) {
  console.error(`Unsupported command "${commandName}". Use "prisma" or "tsx".`);
  process.exit(1);
}

const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commandEnv = { ...process.env };

const isPrismaGenerateCommand =
  commandName === 'prisma' && commandArgs[0] === 'generate';

if (
  isPrismaGenerateCommand &&
  !commandArgs.includes('--no-engine') &&
  !commandArgs.includes('--accelerate') &&
  !commandArgs.includes('--data-proxy')
) {
  // This workspace uses direct Postgres URLs. If a global env var forces
  // `prisma generate --no-engine`, Prisma silently generates a Data Proxy
  // client that later rejects `postgresql://...` at runtime.
  delete commandEnv.PRISMA_GENERATE_NO_ENGINE;
  delete commandEnv.PRISMA_GENERATE_ACCELERATE;
  delete commandEnv.PRISMA_GENERATE_DATAPROXY;
}

const result = spawnSync(pnpmExecutable, ['exec', commandName, ...commandArgs], {
  cwd: packageDirectory,
  env: commandEnv,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
