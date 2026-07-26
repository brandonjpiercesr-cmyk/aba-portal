// ⬡B:tests.config_env_only:TEST:no_credential_survives_as_a_source_default:20260726⬡
// CLAIR FIX01 HOLE-3. lib/config.js shipped a live Supabase service-role key, a live Nylas key, a
// live Render key and a live Vercel token as literal fallbacks, in the exact forbidden shape
// process.env.X || '<the real credential>'. This test is the receipt that none of them can come
// back, and that a missing variable now fails loudly by name instead of silently running against
// the founder's own production project.
//
// It evaluates the REAL shipped bytes of lib/config.js and lib/firebase.js in a clean child
// process, so it cannot pass against a copy or a mock. It fails against the pre-fix files, which
// resolved every value with no environment set at all.
//
// Run: node --test tests/config.env_only.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

const PUBLIC_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_ABACIA_URL'
];

// Evaluate a real source file in a child node process with a chosen environment.
// Returns { ok, stderr }. Nothing is mocked and nothing is copied.
function evaluate(relPath, env) {
  const source = readFileSync(path.join(REPO, relPath), 'utf8');
  try {
    execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
      env: Object.assign({ PATH: process.env.PATH }, env || {}),
      cwd: REPO,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, stderr: '' };
  } catch (e) {
    return { ok: false, stderr: String(e.stderr || e.message) };
  }
}

test('lib/config.js refuses to resolve with no environment, and names the variable', () => {
  const result = evaluate('lib/config.js', {});
  assert.equal(result.ok, false, 'an unconfigured deploy must NOT quietly resolve to working credentials');
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_URL is not set/,
    'the error must name the missing variable so it is actionable');
  assert.match(result.stderr, /never a literal and never a fallback default/);
});

test('lib/config.js resolves once the public environment is provided', () => {
  const env = {};
  for (const name of PUBLIC_VARS) env[name] = 'set-for-this-test';
  const result = evaluate('lib/config.js', env);
  assert.equal(result.ok, true, 'a configured deploy must work: ' + result.stderr);
});

test('a server-only secret is never evaluated by merely importing the module', () => {
  // The service key, Nylas key, Render key and Vercel token are functions, not constants,
  // precisely so that a client component importing this module cannot pull them into a bundle.
  const env = {};
  for (const name of PUBLIC_VARS) env[name] = 'set-for-this-test';
  const result = evaluate('lib/config.js', env);
  assert.equal(result.ok, true);
  assert.doesNotMatch(result.stderr, /SUPABASE_SERVICE_KEY/);
  assert.doesNotMatch(result.stderr, /NYLAS_API_KEY/);
});

test('a server-only secret throws by name when it is actually used', () => {
  const source = readFileSync(path.join(REPO, 'lib/config.js'), 'utf8')
    + '\ntry { supabaseServiceKey(); process.exit(9); } catch (e) { console.error(e.message); process.exit(3); }\n';
  const env = {};
  for (const name of PUBLIC_VARS) env[name] = 'set-for-this-test';
  let code = 0;
  let stderr = '';
  try {
    execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
      env: Object.assign({ PATH: process.env.PATH }, env), cwd: REPO, stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (e) {
    code = e.status;
    stderr = String(e.stderr || '');
  }
  assert.equal(code, 3, 'using an unset server secret must throw, not return a baked-in default');
  assert.match(stderr, /SUPABASE_SERVICE_KEY is not set/);
});

test('no credential literal remains anywhere in the two files', () => {
  const patterns = [
    { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
    { id: 'nylas', re: /\bnyk_v\d+_[A-Za-z0-9]{30,}/ },
    { id: 'render', re: /\brnd_[A-Za-z0-9]{20,}/ },
    { id: 'google', re: /\bAIza[A-Za-z0-9_-]{30,}/ },
    { id: 'env-or-literal', re: /process\.env\.[A-Za-z0-9_]*(KEY|TOKEN|SECRET)[A-Za-z0-9_]*\s*\|\|\s*['"][^'"]{8,}['"]/ }
  ];
  for (const rel of ['lib/config.js', 'lib/firebase.js']) {
    const text = readFileSync(path.join(REPO, rel), 'utf8');
    for (const p of patterns) {
      assert.equal(p.re.test(text), false, rel + ' still contains a ' + p.id + ' literal');
    }
  }
});

test('the admin allowlist is env driven and empty by default, it never falls back to real people', () => {
  const source = readFileSync(path.join(REPO, 'lib/firebase.js'), 'utf8');
  // Firebase itself is not importable in this bare child process, so assert on the shipped bytes:
  // no email literal survives, and the list is built from NEXT_PUBLIC_ADMIN_EMAILS.
  const emails = source.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  assert.deepEqual(emails, [], 'no real email address may remain in shippable source, found: ' + emails.length);
  assert.match(source, /process\.env\.NEXT_PUBLIC_ADMIN_EMAILS/);
});
