// ⬡B:scripts.checks.no_open_secrets:GUARD:no_tracked_env_no_secret_literal_no_open_relay:20260726⬡
// THE ESTATE GATE. Founder law: identity and credentials are env-only, never a literal, and an
// endpoint that spends a real key is never open to the whole internet. anew has carried
// no-founder-pii and rogue-scan since 20260722; ccwa, aba-portals and aba-portal carried NOTHING,
// which is exactly why a git-tracked .env with 29 secrets and a config.js full of live service-role
// credentials survived in them. This guard is the same idea, scoped to the three holes that
// actually happened here, and it EXITS NON-ZERO. A gate that only logs is not a gate.
//
// It fails the build on:
//   (a) a git-TRACKED .env (a real secrets file inside the repo, .env.example excepted)
//   (b) an obvious secret literal (provider key prefixes, a full JWT, a private key block)
//   (c) wildcard CORS in the same file as a process.env secret read (an open spend relay)
//   (d) the forbidden fallback shape, process.env.SOMETHING_KEY || 'literal'
//
// The guard never carries a key value: every pattern is a public issuer PREFIX plus a length bound,
// and every report is masked. It also skips its own source and any *.example file, so documenting a
// bad shape is always allowed and only a live one fails.
//
// Usage: node scripts/checks/no-open-secrets.cjs [rootDir]
// Exit 0 = clean. Exit 1 = at least one finding. Wired into CI on every push and pull request.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(process.argv[2] || '.');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.vercel', 'coverage', 'tmp', 'scratchpad', '.venv'
]);

const SCAN_EXT = /\.(js|cjs|mjs|jsx|ts|tsx|json|yml|yaml|html|py|sh|md|txt|env)$/i;

// A real secrets file, as opposed to the shape-only template every repo should ship.
const ENV_TRACKED_RE = /(^|\/)\.env($|\.(?!example$|sample$|template$)[A-Za-z0-9_.-]+$)/;

function isGuardItself(rel) {
  return rel.indexOf('scripts/checks/no-open-secrets.cjs') !== -1;
}

function isTemplateFile(rel) {
  const base = rel.split('/').pop();
  if (/\.(example|sample|template)$/i.test(base)) return true;
  if (/^\.env\.(example|sample|template)$/i.test(base)) return true;
  return false;
}

function isSkippedForLiterals(rel) {
  if (isGuardItself(rel)) return true;
  if (isTemplateFile(rel)) return true;
  if (/(^|\/)package-lock\.json$/.test(rel)) return true;
  if (/(^|\/)yarn\.lock$/.test(rel)) return true;
  if (/(^|\/)pnpm-lock\.yaml$/.test(rel)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// (b) obvious secret literals. Prefix plus length, so an env var NAME never matches
// and a random word never matches. Each entry names the issuer so a hit is actionable.
// ---------------------------------------------------------------------------
const SECRET_PATTERNS = [
  { id: 'openai_key',        re: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g },
  { id: 'anthropic_key',     re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { id: 'groq_key',          re: /\bgsk_[A-Za-z0-9]{30,}/g },
  { id: 'perplexity_key',    re: /\bpplx-[A-Za-z0-9]{30,}/g },
  { id: 'google_api_key',    re: /\bAIza[A-Za-z0-9_-]{30,}/g },
  { id: 'github_token',      re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g },
  { id: 'github_pat',        re: /\bgithub_pat_[A-Za-z0-9_]{40,}/g },
  { id: 'nylas_key',         re: /\bnyk_v\d+_[A-Za-z0-9]{30,}/g },
  { id: 'render_key',        re: /\brnd_[A-Za-z0-9]{20,}/g },
  { id: 'slack_token',       re: /\bxox[abprs]-[A-Za-z0-9-]{20,}/g },
  { id: 'aws_access_key_id', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: 'stripe_key',        re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}/g },
  { id: 'webhook_signing',   re: /\bwhsec_[A-Za-z0-9+/=_-]{20,}/g },
  { id: 'deepgram_or_hex40', re: /\bToken\s+[a-f0-9]{40}\b/g },
  // A complete three-part JWT literal. Supabase anon and SERVICE_ROLE keys are exactly this.
  { id: 'jwt_literal',       re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}/g },
  { id: 'private_key_block', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g }
];

// ---------------------------------------------------------------------------
// (c) open relay: wildcard CORS sharing a file with a process.env secret read.
// ---------------------------------------------------------------------------
const WILDCARD_CORS_RE = /Access-Control-Allow-Origin['"\s,:]+['"]\*['"]/;
const SECRETISH_ENV_RE = /process\.env\.([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Za-z0-9_]*)/g;

// ---------------------------------------------------------------------------
// (d) the forbidden fallback shape: a live credential as a source default.
// ---------------------------------------------------------------------------
const ENV_OR_LITERAL_RE =
  /process\.env\.([A-Za-z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Za-z0-9_]*)\s*\|\|\s*(['"`])([^'"`\n]{8,})\2/g;

// Report a hit without ever reproducing it. Issuer-prefixed keys keep their PUBLIC prefix so a
// reader knows which vendor to rotate; anything unrecognised is reduced to a length only, because
// the leading characters of a bare token are real secret material and CI logs are not a safe place.
function mask(s, prefix) {
  const v = String(s);
  if (!prefix) return '***(' + v.length + ' chars)';
  return v.slice(0, prefix) + '***(' + v.length + ' chars)';
}

// The start index of a line comment, so the guard does not fire on code that DOCUMENTS a bad
// pattern. A comment cannot be a live credential. Returns -1 when the line has no comment.
function commentAt(line) {
  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === '/' && line[i + 1] === '/' && line[i - 1] !== ':') return i;
    if (line[i] === '#' && line[i + 1] === ' ') return i;
  }
  return -1;
}

function walk(dir, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(full, acc);
      continue;
    }
    if (!ent.isFile()) continue;
    if (!SCAN_EXT.test(ent.name) && !/^\.env/.test(ent.name)) continue;
    acc.push(full);
  }
  return acc;
}

function trackedFiles() {
  try {
    const out = execFileSync('git', ['-C', ROOT, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter(Boolean);
  } catch (e) {
    return null;
  }
}

function checkTrackedEnv(findings) {
  const tracked = trackedFiles();
  if (tracked === null) {
    console.error('[no-open-secrets] cannot run git ls-files in ' + ROOT + '; the tracked-.env check needs a git repo.');
    process.exitCode = 1;
    return;
  }
  for (const rel of tracked) {
    const base = rel.split('/').pop();
    if (isTemplateFile(rel)) continue;
    if (base === '.env' || ENV_TRACKED_RE.test('/' + rel)) {
      findings.push({
        rel: rel,
        line: 0,
        type: 'tracked_env_file',
        detail: 'a real .env is committed to this repository'
      });
    }
  }
}

function scanFile(full, findings) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  if (isSkippedForLiterals(rel)) return;
  let text;
  try { text = fs.readFileSync(full, 'utf8'); } catch (e) { return; }
  if (text.indexOf('\0') !== -1) return;
  const lines = text.split('\n');

  const hasWildcardCors = WILDCARD_CORS_RE.test(text);
  let corsEnvNames = [];
  if (hasWildcardCors) {
    let m;
    SECRETISH_ENV_RE.lastIndex = 0;
    while ((m = SECRETISH_ENV_RE.exec(text))) {
      if (corsEnvNames.indexOf(m[1]) === -1) corsEnvNames.push(m[1]);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const comment = commentAt(line);

    for (const p of SECRET_PATTERNS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(line))) {
        if (comment !== -1 && m.index > comment) continue;
        findings.push({ rel: rel, line: i + 1, type: 'secret_literal:' + p.id, detail: mask(m[0], 4) });
      }
    }

    ENV_OR_LITERAL_RE.lastIndex = 0;
    let d;
    while ((d = ENV_OR_LITERAL_RE.exec(line))) {
      if (comment !== -1 && d.index > comment) continue;
      findings.push({
        rel: rel,
        line: i + 1,
        type: 'credential_as_source_default',
        detail: 'process.env.' + d[1] + ' || a ' + mask(d[3]) + ' literal'
      });
    }

    if (hasWildcardCors && corsEnvNames.length && WILDCARD_CORS_RE.test(line)) {
      findings.push({
        rel: rel,
        line: i + 1,
        type: 'open_relay_wildcard_cors',
        detail: "Access-Control-Allow-Origin '*' in a file that spends " + corsEnvNames.join(', ')
      });
    }
  }
}

function main() {
  const findings = [];
  checkTrackedEnv(findings);
  const files = walk(ROOT, []);
  for (const f of files) scanFile(f, findings);

  if (!findings.length) {
    console.log('[no-open-secrets] clean: no tracked .env, no secret literal, no open relay, no credential default (' + files.length + ' files scanned in ' + ROOT + ').');
    process.exit(process.exitCode || 0);
  }

  console.error('[no-open-secrets] BUILD FAILED. Credentials are env-only and an endpoint that spends a real key is never open to the internet.\n');
  for (const f of findings) {
    console.error('  ' + f.rel + (f.line ? ':' + f.line : '') + '  [' + f.type + ']  ' + f.detail);
  }
  console.error('\n[no-open-secrets] ' + findings.length + ' finding(s).');
  console.error('  tracked_env_file            : git rm --cached the file, add it to .gitignore, commit a .env.example with key names only.');
  console.error('  secret_literal              : move the value to an env var and ROTATE it, a committed key is a burned key.');
  console.error('  open_relay_wildcard_cors    : replace the wildcard with an env origin allowlist and require a shared secret, failing closed.');
  console.error('  credential_as_source_default: read the env var and throw when it is missing, never process.env.X || literal.');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { scanFile: scanFile, SECRET_PATTERNS: SECRET_PATTERNS };
