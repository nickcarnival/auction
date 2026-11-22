#!/usr/bin/env node
/**
 * Forwards Stripe webhook events to the local API. Requires Stripe CLI (`stripe login`).
 *
 * Uses PORT from repo root `.env`, or override with STRIPE_WEBHOOK_FORWARD_PORT.
 * After this starts, copy the printed `whsec_…` into STRIPE_WEBHOOK_SECRET and restart the API,
 * or run `npm run stripe:sync-webhook-secret` (see Stripe CLI notes — use the secret that matches
 * your active `listen` session).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function readPortFromEnvFile() {
  if (!fs.existsSync(envPath)) {
    console.error(`Missing .env at ${envPath}`);
    process.exit(1);
  }
  const text = fs.readFileSync(envPath, 'utf8');
  const m = text.match(/^PORT=(.+)$/m);
  if (!m) {
    console.error('PORT not found in .env (required to build webhook URL).');
    process.exit(1);
  }
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const port = process.env.STRIPE_WEBHOOK_FORWARD_PORT?.trim() || readPortFromEnvFile();
const forwardTo = `http://127.0.0.1:${port}/api/stripe/webhook`;

console.error(`[stripe] forwarding to ${forwardTo}`);
console.error('[stripe] ensure STRIPE_WEBHOOK_SECRET matches the whsec_ shown below, then restart the API\n');

const child = spawn('stripe', ['listen', '--forward-to', forwardTo], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', code => process.exit(code ?? 0));
