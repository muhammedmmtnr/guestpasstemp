# GuestPass

Responsive restaurant queue and guest check-in app built with React and Vite. The existing GuestPass REST API currently supports account authentication and profile management only. Restaurant and queue operations are not connected to this API.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `.env` to the current backend base URL. `.env.example` contains the supplied URL; restart Vite after changing it. In development, Vite proxies `/api` requests to that URL. In production, the public client sends requests directly to `VITE_API_URL`.

The admin console is mounted at `/admin`. Its API client reads `VITE_API_BASE_URL`, which should include the API prefix (for example, `https://your-service.onrender.com/api`). If unset, it uses the same-origin `/api` path. The admin setup and login screens call `POST /admin/auth/bootstrap` and `POST /admin/auth/login`; authenticated admin requests send the returned bearer token. The super-admin token is kept in tab-scoped `sessionStorage`, consistent with the existing auth session behavior.

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

The super-admin UI expects the backend to configure `SUPER_ADMIN_SETUP_KEY`, `JWT_SECRET`, and `CORS_ORIGIN` and to implement the corresponding protected admin API routes. The backend source is not part of this workspace, so server setup, database migration, seeding, and production bootstrap instructions must be completed alongside that API implementation.

### First super-admin setup (after the backend routes are deployed)

1. On Render, set `SUPER_ADMIN_SETUP_KEY` to a unique, high-entropy secret and `JWT_SECRET` to a separate signing secret. Set `CORS_ORIGIN` to the exact local and deployed frontend origins, comma-separated (for example, `http://localhost:5173,https://your-app.vercel.app`). Do not put secret values in Git or Vercel.
2. On Vercel, set `VITE_API_BASE_URL` to the Render API root, including `/api`, such as `https://your-service.onrender.com/api`.
3. Locally, run the backend with the same environment variables and set `VITE_API_BASE_URL=http://localhost:<backend-port>/api` in the frontend `.env.local`. Start Vite, open `http://localhost:5173/admin/setup`, and submit the name, email, password, and setup key once. Use `/admin/login` for subsequent logins.
4. For production, deploy the backend and frontend with the correct environment values, then visit `https://your-app.vercel.app/admin/setup` once. The endpoint must reject bootstrap after the first super admin has been created. Use the backend repository's `npm run create-super-admin -- --email=... --password=...` command only as its documented recovery/seed path.

These steps are not usable until the backend endpoints and seed script exist. They are described here as the frontend contract only; this repository contains no backend application, migration, or seed-script source.
