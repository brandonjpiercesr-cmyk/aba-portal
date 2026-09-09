# Eric private delivery portal

This is the bounded TEMP frontend requested by Brandon at 2:16:55 in the September 9, 2026 raw transcript. It borrows the existing CIB's one-frame, five-zone visual shell and provides one protected delivery window.

The server exchanges an opaque path token for a secure, HTTP-only, same-site session cookie. Every page, asset, and artifact response requires that session. Public routes are limited to `/healthz` and `/releasez`.

The portal contains no authored message from A'nu. With no `PORTAL_ARTIFACT_JSON`, it states that the authorized final artifact has not arrived. A future host supplies one exact JSON artifact under `tryaba.private-delivery.v1`; the server accepts only `wonder.anu` as speaker, only `anu-authored` as source kind, and a complete expression/snapshot/verification/session/readback/relationship receipt chain. It also requires provider-side artifact, scope, and relationship values to match before the artifact can render. The browser inserts all wording through `textContent` and preserves section order.

## Required environment

- `PORTAL_ACCESS_TOKEN`: at least 24 characters; never place it in source or a user-facing receipt.
- `PORTAL_EXPECTED_RECIPIENT`: defaults to `Dr. Eric`.
- `PORTAL_ARTIFACT_JSON`: optional until the actual authorized artifact exists.
- `PORTAL_ARTIFACT_SHA256`: lowercase SHA-256 of the exact configured JSON string; required when an artifact exists.
- `PORTAL_SCOPE_DIGEST`: the trusted 64-character scope digest; required when an artifact exists.
- `PORTAL_RELATIONSHIP_AUTHORITY_RECEIPT_ID`: the trusted relationship-authority receipt; required when an artifact exists.
- `PORT`: defaults to `10000`.

The intended deployment is a new, isolated Render service and a new subdomain beneath the existing `tryaba.org` zone. The existing `tryaba.org` service and the suspended `new-world-meeting-room` service are unrelated and must remain unchanged.
