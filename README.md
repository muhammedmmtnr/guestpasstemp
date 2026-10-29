# GuestPass

Responsive restaurant queue and guest check-in app built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

The browser calls the API through relative `/api` paths. Set `VITE_API_URL` in `.env.local` to the backend origin for the Vite development proxy. Production uses the rewrite in `vercel.json`; no backend URL is embedded in the frontend API client.

## Admin console

The admin console is mounted at `/admin`. Admin sign-in uses `POST /api/auth/sign-in` and requires an access token plus an admin role/account type in the response. The session is stored in tab-scoped `sessionStorage`. Requests that receive 401 clear the admin session and redirect to sign-in; 403 responses remain permission errors.

The authenticated admin profile uses `POST /api/users/me/profile` to load and update profile fields. Profile images use `POST /api/users/me/profile-image` as multipart form data. The frontend accepts JPEG, PNG, and WebP files up to 5 MB and reports upload progress.

The authenticated create-admin screen is at `/admin/users/new`. Account creation uses `POST /api/auth/sign-up` with the current admin token, but submission is disabled until the backend confirms the exact account-type field and value. Public sign-up does not expose an admin option.

## API contract status

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/sign-in` | Admin and user authentication |
| POST | `/api/auth/sign-up` | Account creation; admin account marker is awaiting backend confirmation |
| POST | `/api/users/me/profile` | Load with an empty object or update profile fields |
| POST | `/api/users/me/profile-image` | Multipart profile image upload |

The admin account marker in auth responses and the backend's admin-sign-up authorization rule are not confirmed. Restaurant and queue operations are unavailable until their REST API routes and request/response contracts are provided; the frontend does not substitute local demo data or Supabase for those operations.

## Validation

```bash
node --test
npm run build
```

Never commit `.env` or `.env.local`, passwords, tokens, or service credentials. `.env.example` contains variable names only.
