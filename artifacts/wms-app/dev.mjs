import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });

process.env.PORT = process.env.PORT || '3000';
process.env.BASE_PATH = process.env.BASE_PATH || '/';

const { spawn } = await import('child_process');

const vite = spawn('vite', ['--config', 'vite.config.ts', '--host', '0.0.0.0'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

vite.on('close', (code) => process.exit(code));