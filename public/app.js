const states = {
  loading: document.querySelector('#loading-state'),
  awaiting: document.querySelector('#awaiting-state'),
  ready: document.querySelector('#ready-state'),
  error: document.querySelector('#error-state'),
};

function show(name) {
  for (const [key, node] of Object.entries(states)) node.hidden = key !== name;
  document.querySelector('#mail-window').setAttribute('aria-busy', name === 'loading' ? 'true' : 'false');
  document.querySelector('#artifact-status').textContent = {
    loading: 'Verifying', awaiting: 'Awaiting delivery', ready: 'Verified', error: 'Unavailable',
  }[name];
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function renderArtifact(artifact) {
  setText('#recipient', artifact.recipient);
  setText('#artifact-title', artifact.title);
  setText('#speaker', artifact.provenance.speaker);
  setText('#receipt-id', artifact.provenance.expression_receipt_id);
  setText('#snapshot-receipt-id', artifact.provenance.snapshot_receipt_id);
  setText('#verification-receipt-id', artifact.provenance.verification_receipt_id);
  setText('#session-receipt-id', artifact.provenance.session_receipt_id);
  setText('#session-readback-receipt-id', artifact.provenance.session_readback_receipt_id);
  setText('#relationship-receipt-id', artifact.provenance.relationship_authority_receipt_id);
  setText('#scope-digest', artifact.provenance.scope_digest);
  setText('#issued-at', new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(artifact.issued_at)));

  const sections = document.querySelector('#artifact-sections');
  sections.replaceChildren();
  for (const item of artifact.sections) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const body = document.createElement('p');
    heading.textContent = item.heading;
    body.textContent = item.body;
    section.append(heading, body);
    sections.append(section);
  }
  show('ready');
}

function updateClock() {
  document.querySelector('#local-time').textContent = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit',
  }).format(new Date());
}

updateClock();
setInterval(updateClock, 30_000);

try {
  const response = await fetch('/api/artifact', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('unavailable');
  const payload = await response.json();
  if (payload?.ok !== true || !payload.artifact) throw new Error('invalid');
  if (payload.artifact.state === 'awaiting_authorized_artifact') show('awaiting');
  else if (payload.artifact.state === 'ready') renderArtifact(payload.artifact);
  else show('error');
} catch {
  show('error');
}
