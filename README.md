# GuestPass

Responsive restaurant queue and guest check-in app built with React and Vite. The existing GuestPass REST API currently supports account authentication and profile management only. Restaurant and queue operations are not connected to this API.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `.env` to the current backend base URL. `.env.example` contains the supplied URL; restart Vite after changing it. In development, Vite proxies `/api` requests to that URL. In production, the client sends requests directly to `VITE_API_URL`.

Every request includes `ngrok-skip-browser-warning: true`. The shared API client adds JSON headers, injects a stored bearer token, parses JSON responses, normalizes errors, and times out requests after 15 seconds. A 401/403 clears the client session and redirects to sign-in. Sessions are held in tab-scoped `sessionStorage`; no refresh-token or server-side logout endpoint is documented.

## Known API routes

These are the routes currently provided by the backend, based on the workspace integration and the route list supplied by the backend owner. The tunnel was offline during the latest verification attempt (`ERR_NGROK_3200`), so current response details could not be re-confirmed.

| Method | Path | Auth | Request |
|---|---|---|---|
| GET | `/api/health` | None | No body |
| POST | `/api/auth/sign-up` | None | `email`, `password`, `fullName`, `phone`, `receiveWhatsAppUpdates` |
| POST | `/api/auth/sign-in` | None | `email`, `password` |
| POST | `/api/users/me/profile` | Bearer token | `{}` to load; `fullName`, `phone`, `receiveWhatsAppUpdates` to update |
| POST | `/api/users/me/profile-image` | Bearer token | Multipart `file` |

Sign-up/sign-in responses are expected to contain a user and, when authenticated, a session/access token. Profile requests are expected to return `data.user`. Profile image uploads accept JPEG, PNG, WebP, or GIF; the frontend enforces a 4 MB limit. Exact response schemas and the backend's upload-size limit still need live confirmation.

## Features awaiting backend routes

No routes are currently provided or confirmed for restaurant lookup/workspace/settings/media, queue summaries, booking lists or creation, booking status/cancellation, queue activity, or guest reviews. Those screens/actions do not fall back to local demo data or Supabase; they report that the feature is unavailable until the API exposes the needed routes.

No WebSocket or SSE endpoint has been confirmed. Queue live updates therefore cannot be enabled yet. The existing `postman/GuestPass-Supabase-Auth.postman_collection.json` and SQL migrations are legacy Supabase assets and do not describe the current REST API.

## Production checks

```bash
npm run build
```

Never put passwords, tokens, or service credentials in source control. The `.env` file is ignored by Git.
