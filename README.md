# GuestPass

Responsive restaurant queue and guest check-in app built with React, Vite, and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase credentials, GuestPass opens in **browser demo mode**. Demo workspace and queue changes persist in this browser's local storage and are not shared across devices.

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project's public URL and anon/publishable key. Never put a service-role key in a Vite environment variable.
3. Apply the SQL migrations in `supabase/migrations/` in filename order, using the Supabase CLI or SQL editor.
4. Enable email OTP and/or phone OTP in Supabase Authentication and configure the email/SMS provider.
5. Restart Vite after changing environment variables.

The migrations create profiles, restaurants, bookings, idempotent queue-join RPCs, public restaurant and queue-summary RPCs, queue activity and in-app notification records, Row Level Security policies, realtime publication for restaurant booking updates, and the public restaurant image bucket. Public visitors can read only the restaurant fields and aggregate queue count returned by the public RPCs; guest booking details are accessed only through the booking's private access token.

## Queue and notification behavior

Guest bookings are created through the `join_queue` database function, which validates the restaurant state and capacity, serializes capacity checks, and uses a request id to prevent duplicate submissions when a request is retried. Restaurant queue updates use Supabase Realtime. Public queue counts and each guest's token-scoped booking status are refreshed periodically, so calling or seating a guest is reflected without exposing other guest records.

The guest status page shows the queue token, parties ahead, estimated wait, booking details, and a live status timeline. When the restaurant calls or seats a guest, polling automatically updates the page to the table-ready or seated view, including the assigned table, status time, directions, and available contact actions. The seated view lets the guest submit a 1–5 star rating tied to their booking token. Migrations `202610260003_restaurant_menu_url.sql` and `202610260004_guest_reviews.sql` add an optional public HTTPS menu link and token-authorized restaurant ratings. Apply all migrations in filename order. Guest booking status is polled every 10 seconds; the page does not imitate phone hardware or include device status bars. A configured restaurant WhatsApp number enables a guest-initiated click-to-chat link; automated SMS, email, or WhatsApp notifications still require a separately configured provider and server-side function.

## Production checks

```bash
npm run build
```

Before launch, configure Supabase OTP delivery, review the SQL policies for your project, add a production domain and monitoring, and test the complete auth and guest flows against your own Supabase project.
