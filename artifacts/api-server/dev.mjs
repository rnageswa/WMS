import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });

process.env.NODE_ENV = 'development';
process.env.PORT = '3001';

console.log('Building...');
execSync('pnpm run build', { cwd: __dirname, stdio: 'inherit' });

console.log('Starting...');
execSync('pnpm run start', { cwd: __dirname, stdio: 'inherit', env: { ...process.env } });