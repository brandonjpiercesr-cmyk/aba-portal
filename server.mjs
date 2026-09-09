import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const COOKIE = '__Host-tryaba_private_delivery';
const MAX_TOKEN_LENGTH = 512;

const SECURITY_HEADERS = Object.freeze({
  'cache-control': 'private, no-store, max-age=0',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
});

const STATIC_FILES = Object.freeze({
  '/mail': ['index.html', 'text/html; charset=utf-8'],
  '/assets/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/assets/app.js': ['app.js', 'text/javascript; charset=utf-8'],
});

function text(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 20_000;
}

function receipt(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u.test(value);
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactKeys(record, keys) {
  return record !== null
    && typeof record === 'object'
    && !Array.isArray(record)
    && Object.keys(record).length === keys.length
    && keys.every((key) => Object.hasOwn(record, key));
}

export function validateArtifact(candidate, expectedRecipient = 'Dr. Eric') {
  if (!exactKeys(candidate, ['schema', 'state', 'recipient', 'title', 'issued_at', 'provenance', 'sections'])) {
    return undefined;
  }
  if (candidate.schema !== 'tryaba.private-delivery.v1' || candidate.state !== 'ready'
    || candidate.recipient !== expectedRecipient || !text(candidate.title)
    || Number.isNaN(Date.parse(candidate.issued_at))) return undefined;

  if (!exactKeys(candidate.provenance, [
    'speaker', 'source_kind', 'expression_receipt_id', 'snapshot_receipt_id',
    'verification_receipt_id', 'scope_digest', 'session_receipt_id',
    'session_readback_receipt_id', 'relationship_authority_receipt_id',
  ])
    || candidate.provenance.speaker !== 'wonder.anu'
    || candidate.provenance.source_kind !== 'anu-authored'
    || !receipt(candidate.provenance.expression_receipt_id)
    || !receipt(candidate.provenance.snapshot_receipt_id)
    || !receipt(candidate.provenance.verification_receipt_id)
    || !/^[a-f0-9]{64}$/u.test(candidate.provenance.scope_digest)
    || !receipt(candidate.provenance.session_receipt_id)
    || !receipt(candidate.provenance.session_readback_receipt_id)
    || !receipt(candidate.provenance.relationship_authority_receipt_id)) {
    return undefined;
  }

  if (!Array.isArray(candidate.sections) || candidate.sections.length < 1 || candidate.sections.length > 24) {
    return undefined;
  }
  const sections = [];
  for (const section of candidate.sections) {
    if (!exactKeys(section, ['heading', 'body']) || !text(section.heading) || !text(section.body)) return undefined;
    sections.push(Object.freeze({ heading: section.heading, body: section.body }));
  }

  return Object.freeze({
    schema: candidate.schema,
    state: candidate.state,
    recipient: candidate.recipient,
    title: candidate.title,
    issued_at: new Date(candidate.issued_at).toISOString(),
    provenance: Object.freeze({ ...candidate.provenance }),
    sections: Object.freeze(sections),
  });
}

export function readArtifact(environment = process.env) {
  const wire = environment.PORTAL_ARTIFACT_JSON;
  if (wire === undefined || wire === '') {
    return Object.freeze({
      ok: true,
      artifact: Object.freeze({
        schema: 'tryaba.private-delivery.v1',
        state: 'awaiting_authorized_artifact',
        recipient: environment.PORTAL_EXPECTED_RECIPIENT || 'Dr. Eric',
      }),
    });
  }
  let candidate;
  try {
    candidate = JSON.parse(wire);
  } catch {
    return Object.freeze({ ok: false, code: 'ARTIFACT_JSON_INVALID' });
  }
  const artifact = validateArtifact(candidate, environment.PORTAL_EXPECTED_RECIPIENT || 'Dr. Eric');
  if (!artifact) return Object.freeze({ ok: false, code: 'ARTIFACT_CONTRACT_REFUSED' });

  const configuredDigest = environment.PORTAL_ARTIFACT_SHA256;
  const configuredScope = environment.PORTAL_SCOPE_DIGEST;
  const configuredRelationshipReceipt = environment.PORTAL_RELATIONSHIP_AUTHORITY_RECEIPT_ID;
  if (!/^[a-f0-9]{64}$/u.test(configuredDigest || '')
    || !safeEqual(sha256Hex(wire), configuredDigest)
    || !/^[a-f0-9]{64}$/u.test(configuredScope || '')
    || !safeEqual(artifact.provenance.scope_digest, configuredScope)
    || !receipt(configuredRelationshipReceipt)
    || !safeEqual(artifact.provenance.relationship_authority_receipt_id, configuredRelationshipReceipt)) {
    return Object.freeze({ ok: false, code: 'ARTIFACT_AUTHORITY_REFUSED' });
  }

  return Object.freeze({ ok: true, artifact });
}

function digest(value) {
  return createHash('sha256').update(value).digest();
}

function sessionValue(accessToken) {
  return digest(`tryaba-private-delivery\u0000${accessToken}`).toString('base64url');
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(request) {
  const raw = request.headers.cookie || '';
  if (raw.length > 4096) return undefined;
  const matches = raw.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${COOKIE}=`));
  return matches.length === 1 ? matches[0].slice(COOKIE.length + 1) : undefined;
}

function authorized(request, accessToken) {
  return safeEqual(cookieValue(request), sessionValue(accessToken));
}

function respond(response, status, headers = {}, body = '') {
  response.writeHead(status, { ...SECURITY_HEADERS, ...headers, 'content-length': Buffer.byteLength(body) });
  response.end(body);
}

function json(response, status, payload) {
  respond(response, status, { 'content-type': 'application/json; charset=utf-8' }, JSON.stringify(payload));
}

function notFound(response) {
  respond(response, 404, { 'content-type': 'text/plain; charset=utf-8' }, 'Not found');
}

function serveStatic(response, file, mime) {
  const fullPath = join(PUBLIC, file);
  const length = readFileSync(fullPath).length;
  response.writeHead(200, { ...SECURITY_HEADERS, 'content-type': mime, 'content-length': length });
  createReadStream(fullPath).pipe(response);
}

export function createPortalServer(environment = process.env) {
  const accessToken = environment.PORTAL_ACCESS_TOKEN;
  if (!text(accessToken) || accessToken.length < 24 || accessToken.length > MAX_TOKEN_LENGTH) {
    throw new TypeError('PORTAL_ACCESS_TOKEN must contain at least 24 characters');
  }

  return createServer((request, response) => {
    let url;
    try {
      url = new URL(request.url, 'https://portal.invalid');
    } catch {
      notFound(response);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      notFound(response);
      return;
    }

    if (url.pathname === '/healthz') {
      const current = readArtifact(environment);
      json(response, current.ok ? 200 : 503, {
        service: 'tryaba-private-delivery',
        ready: current.ok,
        artifact_state: current.ok ? current.artifact.state : 'invalid',
      });
      return;
    }

    if (url.pathname === '/releasez') {
      json(response, 200, {
        service: 'tryaba-private-delivery',
        commit: environment.RENDER_GIT_COMMIT || null,
      });
      return;
    }

    const entry = url.pathname.match(/^\/enter\/([^/]+)$/u);
    if (entry) {
      let supplied;
      try { supplied = decodeURIComponent(entry[1]); } catch { supplied = ''; }
      if (!safeEqual(supplied, accessToken)) {
        notFound(response);
        return;
      }
      response.writeHead(303, {
        ...SECURITY_HEADERS,
        location: '/mail',
        'set-cookie': `${COOKIE}=${sessionValue(accessToken)}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800`,
        'content-length': 0,
      });
      response.end();
      return;
    }

    if (!authorized(request, accessToken)) {
      notFound(response);
      return;
    }

    if (url.pathname === '/api/artifact') {
      const current = readArtifact(environment);
      if (!current.ok) {
        json(response, 503, { ok: false, state: 'unavailable' });
        return;
      }
      json(response, 200, { ok: true, artifact: current.artifact });
      return;
    }

    const selected = STATIC_FILES[url.pathname];
    if (selected) {
      serveStatic(response, selected[0], selected[1]);
      return;
    }

    notFound(response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createPortalServer();
  const port = Number(process.env.PORT || 10000);
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ service: 'tryaba-private-delivery', listening: true, port }));
  });
}
