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

const result = spawnSync(pnpmExecutable, ['exec', commandName, ...commandArgs], {
  cwd: packageDirectory,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
