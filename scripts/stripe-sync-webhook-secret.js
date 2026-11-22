#!/usr/bin/env node
/**
 * Writes the Stripe CLI webhook signing secret into repo root `.env`.
 * Run after `stripe login`. Usage: `node scripts/stripe-sync-webhook-secret.js`
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

let raw;
try {
  raw = execSync('stripe listen --print-secret', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
} catch {
  console.error(
    'Could not run `stripe listen --print-secret`. Install Stripe CLI and run `stripe login`.'
  );
  process.exit(1);
}

const secret = raw
  .split(/\r?\n/)
  .map(l => l.trim())
  .find(l => l.startsWith('whsec_'));

if (!secret) {
  console.error('Unexpected Stripe CLI output (expected a line starting with whsec_):');
  console.error(raw);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error('Missing .env at', envPath);
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
const newLine = `STRIPE_WEBHOOK_SECRET=${secret}`;

envContent = /^STRIPE_WEBHOOK_SECRET=/m.test(envContent)
  ? envContent.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, newLine)
  : `${envContent.replace(/\s*$/, '')}\n${newLine}\n`;

fs.writeFileSync(envPath, envContent, 'utf8');
console.log('Updated STRIPE_WEBHOOK_SECRET in .env (restart the API server).');
