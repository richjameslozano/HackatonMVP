/**
 * Post-deploy smoke checks for the Render deployment (deployment-vercel spec).
 *
 * Given a backend base URL and a frontend base URL (via env vars or CLI args)
 * this script asserts the live deployment behaves correctly:
 *
 *   1. The backend `/health` endpoint returns healthy over HTTPS.
 *      (Requirements 4.4, 7.1 — backend reachable over HTTPS at a stable host)
 *   2. A deep-link client route returns `index.html` with HTTP 200 (frontend).
 *      (Requirement 2.1 — SPA rewrite serves index.html for unmatched paths)
 *   3. An existing static asset is served directly (frontend).
 *      (Requirement 2.2 — real files in dist are served without the rewrite)
 *   4. The Lark webhook URL answers a `url_verification` challenge.
 *      (Requirement 7.1 — webhook endpoint echoes the challenge back)
 *
 * This check is OPT-IN: when the target URLs are not provided it skips
 * gracefully and exits 0, so the suite stays green pre-deploy.
 *
 * Usage (any of):
 *   tsx scripts/smokeCheck.ts --backend=https://api.example.com --frontend=https://app.example.com
 *   SMOKE_BACKEND_URL=https://api.example.com SMOKE_FRONTEND_URL=https://app.example.com tsx scripts/smokeCheck.ts
 *
 * Optional overrides:
 *   --deep-link=/admin/projects/42   (frontend client route to probe; default: /admin/projects/42)
 *   --asset=/favicon.svg             (existing static asset to probe; default: /favicon.svg)
 *   SMOKE_DEEP_LINK_PATH / SMOKE_STATIC_ASSET_PATH
 *
 * Requirements: 2.1, 2.2, 2.3, 4.4, 7.1
 */

import { pathToFileURL } from 'node:url';

interface SmokeConfig {
  backendUrl?: string;
  frontendUrl?: string;
  deepLinkPath: string;
  staticAssetPath: string;
}

const DEFAULT_DEEP_LINK_PATH = '/admin/projects/42';
const DEFAULT_STATIC_ASSET_PATH = '/favicon.svg';

/** Parse `--key=value` style CLI args into a plain map. */
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) {
      out[match[1]] = match[2];
    }
  }
  return out;
}

/** Resolve config from CLI args first, then environment variables. */
export function resolveConfig(
  argv: string[],
  env: Record<string, string | undefined>,
): SmokeConfig {
  const args = parseArgs(argv);

  const backendUrl = (args['backend'] ?? env.SMOKE_BACKEND_URL ?? '').trim() || undefined;
  const frontendUrl = (args['frontend'] ?? env.SMOKE_FRONTEND_URL ?? '').trim() || undefined;

  const deepLinkPath =
    (args['deep-link'] ?? env.SMOKE_DEEP_LINK_PATH ?? '').trim() || DEFAULT_DEEP_LINK_PATH;
  const staticAssetPath =
    (args['asset'] ?? env.SMOKE_STATIC_ASSET_PATH ?? '').trim() || DEFAULT_STATIC_ASSET_PATH;

  return { backendUrl, frontendUrl, deepLinkPath, staticAssetPath };
}

/** Join a base URL with a path, avoiding duplicate slashes. */
function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

class SmokeCheckError extends Error {}

/** Assert the given URL is served over HTTPS. */
function assertHttps(url: string, label: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SmokeCheckError(`${label}: "${url}" is not a valid URL`);
  }
  if (parsed.protocol !== 'https:') {
    throw new SmokeCheckError(
      `${label}: expected HTTPS but got "${parsed.protocol}" for ${url}`,
    );
  }
}

/** Check 1: backend /health returns healthy over HTTPS. */
async function checkBackendHealth(backendUrl: string): Promise<void> {
  const url = joinUrl(backendUrl, '/health');
  assertHttps(url, 'backend /health');

  const res = await fetch(url, { method: 'GET' });
  if (res.status !== 200) {
    throw new SmokeCheckError(`backend /health: expected HTTP 200, got ${res.status}`);
  }

  const text = await res.text();
  // Health bodies vary; accept any explicit "healthy"/"ok"/status:true signal.
  const healthy = /healthy|"status"\s*:\s*"?(ok|up|healthy|true)"?|\bok\b/i.test(text);
  if (!healthy) {
    throw new SmokeCheckError(
      `backend /health: HTTP 200 but body did not look healthy: ${text.slice(0, 200)}`,
    );
  }
  console.log(`  ✓ backend /health returned healthy over HTTPS (${url})`);
}

/** Check 2: a deep-link client route returns index.html with HTTP 200. */
async function checkDeepLinkRewrite(frontendUrl: string, deepLinkPath: string): Promise<void> {
  const url = joinUrl(frontendUrl, deepLinkPath);
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'text/html' } });
  if (res.status !== 200) {
    throw new SmokeCheckError(
      `frontend deep link ${deepLinkPath}: expected HTTP 200, got ${res.status}`,
    );
  }
  const text = await res.text();
  const looksLikeIndexHtml = /<!doctype html/i.test(text) || /<div id="root"/i.test(text);
  if (!looksLikeIndexHtml) {
    throw new SmokeCheckError(
      `frontend deep link ${deepLinkPath}: HTTP 200 but body did not look like index.html`,
    );
  }
  console.log(`  ✓ deep link ${deepLinkPath} served index.html with HTTP 200 (${url})`);
}

/** Check 3: an existing static asset is served directly. */
async function checkStaticAsset(frontendUrl: string, assetPath: string): Promise<void> {
  const url = joinUrl(frontendUrl, assetPath);
  const res = await fetch(url, { method: 'GET' });
  if (res.status !== 200) {
    throw new SmokeCheckError(
      `frontend static asset ${assetPath}: expected HTTP 200, got ${res.status}`,
    );
  }
  // A real asset should not be the SPA fallback HTML document.
  const contentType = res.headers.get('content-type') ?? '';
  if (/text\/html/i.test(contentType)) {
    const text = await res.text();
    if (/<!doctype html/i.test(text) || /<div id="root"/i.test(text)) {
      throw new SmokeCheckError(
        `frontend static asset ${assetPath}: was served the SPA fallback index.html instead of the asset`,
      );
    }
  }
  console.log(`  ✓ static asset ${assetPath} served directly with HTTP 200 (${url})`);
}

/** Check 4: the Lark webhook URL echoes a url_verification challenge. */
async function checkWebhookChallenge(backendUrl: string): Promise<void> {
  const url = joinUrl(backendUrl, '/webhook/lark');
  assertHttps(url, 'lark webhook');

  const challenge = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'url_verification', challenge }),
  });
  if (res.status !== 200) {
    throw new SmokeCheckError(`lark webhook: expected HTTP 200, got ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new SmokeCheckError('lark webhook: response was not valid JSON');
  }
  const echoed = (data as { challenge?: unknown })?.challenge;
  if (echoed !== challenge) {
    throw new SmokeCheckError(
      `lark webhook: expected challenge "${challenge}" echoed back, got "${String(echoed)}"`,
    );
  }
  console.log(`  ✓ lark webhook echoed the url_verification challenge (${url})`);
}

export async function runSmokeChecks(config: SmokeConfig): Promise<void> {
  const { backendUrl, frontendUrl, deepLinkPath, staticAssetPath } = config;

  if (backendUrl) {
    assertHttps(backendUrl, 'backend base URL');
    console.log(`Backend checks against ${backendUrl}`);
    await checkBackendHealth(backendUrl);
    await checkWebhookChallenge(backendUrl);
  } else {
    console.log('Backend base URL not provided — skipping backend checks.');
  }

  if (frontendUrl) {
    console.log(`Frontend checks against ${frontendUrl}`);
    await checkDeepLinkRewrite(frontendUrl, deepLinkPath);
    await checkStaticAsset(frontendUrl, staticAssetPath);
  } else {
    console.log('Frontend base URL not provided — skipping frontend checks.');
  }
}

async function main(): Promise<void> {
  const config = resolveConfig(process.argv.slice(2), process.env);

  if (!config.backendUrl && !config.frontendUrl) {
    console.log(
      'Smoke check skipped: no target URLs provided. ' +
        'Set --backend / --frontend (or SMOKE_BACKEND_URL / SMOKE_FRONTEND_URL) to run against a deployment.',
    );
    process.exit(0);
  }

  try {
    await runSmokeChecks(config);
    console.log('\n✅ Smoke checks passed.');
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Smoke check failed: ${message}`);
    process.exit(1);
  }
}

// Run only when executed directly (via tsx), not when imported by tests.
const invokedPath = process.argv[1];
const isDirectRun =
  typeof invokedPath === 'string' &&
  import.meta.url === pathToFileURL(invokedPath).href;

if (isDirectRun) {
  void main();
}
