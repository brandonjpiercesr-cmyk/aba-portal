// ⬡B:lib.config:GUARD:credentials_are_env_only_never_a_source_default:20260726⬡
// CLAIR FIX01 HOLE-3.
//
// What was here until 20260726, committed and shipped, on lines 1 to 6:
//   a live Supabase SERVICE ROLE key, the Supabase anon key, a live Nylas API key, a live Render
//   API key and a live Vercel token, each of them written as
//       export const X = process.env.X || '<the real credential>';
//   plus, below, a map of six real personal email addresses and their Nylas grant ids, including
//   family members.
//
// That shape is forbidden by the founder's standing law of 20260722: identity and credentials are
// env-only, never a literal, NOT EVEN AS A FALLBACK DEFAULT. `process.env.X || 'literal'` is still
// a leak, and it is worse than no default at all, because it fails SILENTLY: a deploy with no env
// set does not stop, it quietly runs against the founder's own production project with a
// service-role key, in a stranger's world.
//
// It is replaced by a required read that THROWS BY NAME. A missing variable is now a loud, obvious
// error at the moment of use instead of a silent cross-tenant write.
//
// Every value that was in this file is BURNED. It sat in a public-shaped repository and it remains
// in git history. Rotation is the founder's decision, set for Thursday.
//
// Two kinds of value live here and they are not interchangeable:
//   PUBLIC, NEXT_PUBLIC_ prefixed. Next.js inlines these into the browser bundle. Only values that
//     are safe in a browser may ever be one: the Supabase URL, the Supabase ANON key (which is
//     RLS-scoped by design), the Abacia base URL.
//   SERVER ONLY, no prefix, exposed as functions rather than constants so that importing this
//     module from a client component can never evaluate them and can never drag them into a bundle.
//     The service-role key, the Nylas key, the Render key and the Vercel token are all of these.

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      '[aba-portal] Required environment variable ' + name + ' is not set. Credentials and identity '
      + 'are env-only in this codebase, never a literal and never a fallback default. Set it in the '
      + 'deployment environment (see render.yaml) or in .env.local for development.'
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Public. Safe in a browser bundle, and required all the same.
// ---------------------------------------------------------------------------
export const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const ABACIA_URL = requireEnv('NEXT_PUBLIC_ABACIA_URL');

// ---------------------------------------------------------------------------
// Server only. Functions, not constants, so a client import can never evaluate them.
// Call these inside a route handler or other server code. Never at module top level of a
// component, and never in anything that ships to a browser.
// ---------------------------------------------------------------------------
export function supabaseServiceKey() { return requireEnv('SUPABASE_SERVICE_KEY'); }
export function nylasKey() { return requireEnv('NYLAS_API_KEY'); }
export function renderKey() { return requireEnv('RENDER_API_KEY'); }
export function vercelToken() { return requireEnv('VERCEL_TOKEN'); }

// ---------------------------------------------------------------------------
// Nylas grants. These are REAL PEOPLE: names, addresses and account ids. Six of them were
// hardcoded here, family included. Under the same founder law a person is never a literal in
// shippable code, so the map now comes from one env var holding JSON of the same shape:
//
//   NYLAS_GRANTS_JSON={"label_key":{"id":"...","email":"...","label":"..."}}
//
// An unset or unparseable value yields an EMPTY map rather than a guessed one. A caller that finds
// no grants must report that honestly; it must never fall back to somebody else's mailbox.
// ---------------------------------------------------------------------------
let _grants = null;
export function nylasGrants() {
  if (_grants) return _grants;
  const raw = process.env.NYLAS_GRANTS_JSON;
  if (!raw) {
    console.error('[aba-portal] NYLAS_GRANTS_JSON is not set. No mail grants are configured, so no '
      + 'mailbox will be read. This is env-only by law; it is never filled in from source.');
    _grants = {};
    return _grants;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('NYLAS_GRANTS_JSON must be a JSON object of grantKey to { id, email, label }');
    }
    _grants = parsed;
  } catch (e) {
    console.error('[aba-portal] NYLAS_GRANTS_JSON could not be parsed: ' + e.message
      + '. No mail grants are configured.');
    _grants = {};
  }
  return _grants;
}
