# Eric private delivery portal

This is the bounded TEMP frontend requested by Brandon at 2:16:55 in the September 9, 2026 raw transcript. It borrows the existing CIB's one-frame, five-zone visual shell and provides one protected delivery window.

The entry link carries its bearer value in the URL fragment (`/enter#…`). Browser fragments are not sent in HTTP requests, so the server does not receive the bearer in the request URL. Entry JavaScript immediately removes the fragment from the current history entry and posts it in the authorization header for a secure, HTTP-only, same-site session cookie that lasts 30 minutes. The bearer remains reusable until it is rotated and may still exist in the sender's records or the recipient's earlier browser history. The portal therefore makes no one-time or one-recipient claim.

Every letter page, letter asset, and artifact response requires that session. Public routes are limited to the neutral entry page and its two assets, `/healthz`, and `/releasez`.

The portal contains no authored message from A'nu. With no `PORTAL_ARTIFACT_JSON`, it states that no authorized artifact is available. The current code can preflight the proposed `tryaba.private-delivery.v1` shape, exact recipient, `wonder.anu` token, and complete expression/snapshot/verification/session/readback/relationship receipt fields. Matching strings and hashes do not establish A'nu authorship or real authority. Because no real verification authority is connected yet, every configured artifact is refused with `ARTIFACT_AUTHORITY_NOT_CONNECTED` and cannot render. The protected API retains machine receipt data for a future verified readback; the human letter surface does not display internal tokens or digests.

The validator does not invent a word, character, or section cap. Any real transport limit must be established at the authority/provider boundary and must refuse oversized input without clipping or silently rewriting it.

## Required environment

- `PORTAL_ACCESS_TOKEN`: 24–512 characters; never place it in source or a user-facing receipt. Rotate it to revoke previously issued entry links.
- `PORTAL_EXPECTED_RECIPIENT`: defaults to `Dr. Eric`.
- `PORTAL_ARTIFACT_JSON`: optional until the actual authorized artifact exists.
- `PORTAL_ARTIFACT_SHA256`: lowercase SHA-256 of the exact configured JSON string; preflight only and not proof of authorship.
- `PORTAL_SCOPE_DIGEST`: the expected 64-character scope digest; preflight only and not proof of authority.
- `PORTAL_RELATIONSHIP_AUTHORITY_RECEIPT_ID`: the expected relationship-authority receipt; preflight only and not proof of authority.
- `PORT`: defaults to `10000`.

The deployed shell runs as the separate Render service `tryaba-private-delivery`. Render knows about the pending custom domain `mail.tryaba.org`; DNS is not complete until the domain-owning Cloudflare account adds the record and Render verifies it. The existing `tryaba.org` service and the suspended `new-world-meeting-room` service remain unchanged.
