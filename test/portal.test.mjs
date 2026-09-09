import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, test } from 'node:test';

import { createPortalServer, readArtifact, validateArtifact } from '../server.mjs';

const TOKEN = 'test-only-access-token-1234567890';
const servers = [];
const SCOPE_DIGEST = 'a'.repeat(64);

function provenance(overrides = {}) {
  return {
    speaker: 'wonder.anu',
    source_kind: 'anu-authored',
    expression_receipt_id: 'expression.receipt.test',
    snapshot_receipt_id: 'snapshot.receipt.test',
    verification_receipt_id: 'verification.receipt.test',
    scope_digest: SCOPE_DIGEST,
    session_receipt_id: 'session.receipt.test',
    session_readback_receipt_id: 'session.readback.receipt.test',
    relationship_authority_receipt_id: 'relationship.authority.receipt.test',
    ...overrides,
  };
}

function authorizedEnvironment(artifact) {
  const wire = JSON.stringify(artifact);
  return {
    PORTAL_ARTIFACT_JSON: wire,
    PORTAL_ARTIFACT_SHA256: createHash('sha256').update(wire).digest('hex'),
    PORTAL_SCOPE_DIGEST: SCOPE_DIGEST,
    PORTAL_RELATIONSHIP_AUTHORITY_RECEIPT_ID: artifact.provenance.relationship_authority_receipt_id,
  };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

async function start(environment = {}, clock = Date.now) {
  const server = createPortalServer({ PORTAL_ACCESS_TOKEN: TOKEN, PORTAL_EXPECTED_RECIPIENT: 'Dr. Eric', ...environment }, clock);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

test('private routes conceal themselves without an authenticated session', async () => {
  const origin = await start();
  for (const path of ['/', '/mail', '/assets/app.js', '/api/artifact', '/enter/wrong']) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    assert.equal(response.status, 404, path);
  }
  for (const path of ['/enter', '/assets/entry.css', '/assets/entry.js']) {
    assert.equal((await fetch(origin + path)).status, 200, path);
  }
});

test('the fragment gate exchanges a bearer header for a short secure session', async () => {
  const origin = await start();
  const entry = await fetch(`${origin}/session`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(entry.status, 204);
  const cookie = entry.headers.get('set-cookie');
  assert.match(cookie, /^__Host-tryaba_private_delivery=/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=1800/);

  const page = await fetch(origin + '/mail', { headers: { cookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Nothing is waiting here yet/);
  assert.equal(page.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
});

test('an empty artifact source reports an honest waiting state', () => {
  assert.deepEqual(readArtifact({ PORTAL_EXPECTED_RECIPIENT: 'Dr. Eric' }), {
    ok: true,
    artifact: {
      schema: 'tryaba.private-delivery.v1',
      state: 'awaiting_authorized_artifact',
      recipient: 'Dr. Eric',
    },
  });
});

test('the artifact contract preserves supplied wording and order', () => {
  const artifact = {
    schema: 'tryaba.private-delivery.v1',
    state: 'ready',
    recipient: 'Dr. Eric',
    byline: "A'nu A'new",
    title: 'A letter that arrived from its actual author',
    issued_at: '2026-09-09T22:10:00.000Z',
    provenance: provenance(),
    sections: [
      { heading: 'First', body: 'Exact first body.' },
      { heading: 'Second', body: 'Exact second body.' },
    ],
  };
  assert.deepEqual(validateArtifact(artifact, 'Dr. Eric'), artifact);
});

test('the artifact contract rejects another recipient and extra fields', () => {
  const base = {
    schema: 'tryaba.private-delivery.v1', state: 'ready', recipient: 'Someone else',
    byline: "A'nu A'new", title: 'Title', issued_at: '2026-09-09T22:10:00.000Z',
    provenance: provenance(),
    sections: [{ heading: 'Heading', body: 'Body' }],
  };
  assert.equal(validateArtifact(base, 'Dr. Eric'), undefined);
  assert.equal(validateArtifact({ ...base, recipient: 'Dr. Eric', invented: true }, 'Dr. Eric'), undefined);
});

test('a syntactically valid configured artifact remains unavailable without real authority', async () => {
  const artifact = {
    schema: 'tryaba.private-delivery.v1', state: 'ready', recipient: 'Dr. Eric',
    byline: "A'nu A'new", title: '<strong>Exact title</strong>', issued_at: '2026-09-09T22:10:00.000Z',
    provenance: provenance({ expression_receipt_id: 'expression.receipt.123' }),
    sections: [{ heading: '<em>Heading</em>', body: '<script>not executed</script>' }],
  };
  const origin = await start(authorizedEnvironment(artifact));
  const entry = await fetch(`${origin}/session`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
  const response = await fetch(origin + '/api/artifact', { headers: { cookie: entry.headers.get('set-cookie') } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, state: 'unavailable' });
  assert.equal(readArtifact(authorizedEnvironment(artifact)).code, 'ARTIFACT_AUTHORITY_NOT_CONNECTED');
});

test('health distinguishes an invalid configured artifact from a waiting portal', async () => {
  const waiting = await start();
  assert.equal((await fetch(waiting + '/healthz')).status, 200);

  const invalid = await start({ PORTAL_ARTIFACT_JSON: '{bad json' });
  const response = await fetch(invalid + '/healthz');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).artifact_state, 'invalid');
});

test('artifact authority refuses a modified payload or mismatched trusted scope', () => {
  const artifact = {
    schema: 'tryaba.private-delivery.v1', state: 'ready', recipient: 'Dr. Eric',
    byline: "A'nu A'new", title: 'Bound artifact', issued_at: '2026-09-09T22:10:00.000Z',
    provenance: provenance(), sections: [{ heading: 'Heading', body: 'Exact body.' }],
  };
  const environment = authorizedEnvironment(artifact);
  assert.equal(readArtifact({ ...environment, PORTAL_ARTIFACT_JSON: environment.PORTAL_ARTIFACT_JSON + ' ' }).code, 'ARTIFACT_AUTHORITY_REFUSED');
  assert.equal(readArtifact({ ...environment, PORTAL_SCOPE_DIGEST: 'b'.repeat(64) }).code, 'ARTIFACT_AUTHORITY_REFUSED');
});

test('the preflight validator preserves long wording and any section count', () => {
  const sections = Array.from({ length: 30 }, (_, index) => ({ heading: `Section ${index + 1}`, body: 'x'.repeat(25_000) }));
  const artifact = {
    schema: 'tryaba.private-delivery.v1', state: 'ready', recipient: 'Dr. Eric', byline: "A'nu A'new",
    title: 'No invented cap', issued_at: '2026-09-09T22:10:00.000Z', provenance: provenance(), sections,
  };
  assert.deepEqual(validateArtifact(artifact, 'Dr. Eric'), artifact);
});

test('the public entry page contains no static recipient or machine identity claim', async () => {
  const origin = await start();
  const html = await (await fetch(origin + '/enter')).text();
  const entry = await fetch(origin + '/session', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
  const privatePage = await (await fetch(origin + '/mail', { headers: { cookie: entry.headers.get('set-cookie') } })).text();
  assert.doesNotMatch(html + privatePage, /Eric|wonder\.anu|receipt|one recipient|artifact|shell|server|fragment|authenticated session/i);
});

test('the server refuses a captured session after 30 minutes', async () => {
  let now = Date.parse('2026-09-09T22:10:00.000Z');
  const origin = await start({}, () => now);
  const entry = await fetch(origin + '/session', { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
  const cookie = entry.headers.get('set-cookie');
  assert.equal((await fetch(origin + '/mail', { headers: { cookie } })).status, 200);
  now += 30 * 60 * 1000 + 1000;
  assert.equal((await fetch(origin + '/mail', { headers: { cookie } })).status, 404);
});
