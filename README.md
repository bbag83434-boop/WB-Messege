# My Messenger authentication

The frontend is served by Vite and the authentication API is an Express app. In Vercel, `api/index.js` exposes the same Express app as a serverless function.

## Production setup

1. Create a Neon PostgreSQL database and add `DATABASE_URL` and a random 32+ character `JWT_SECRET` to the Vercel project environment variables.
2. Run [`db/migrations/001_create_users.sql`](db/migrations/001_create_users.sql), then [`db/migrations/002_add_otp_auth.sql`](db/migrations/002_add_otp_auth.sql), once in the Neon SQL editor.
3. Redeploy. Vercel serves the API at `/api/auth/*` and the PWA uses that same origin.

For local development, copy `.env.example` to `.env`, set real values, set `AUTH_MODE=personal`, then run `npm run dev:server` and `npm run dev` in separate terminals. Personal mode returns the generated OTP only in the `/api/auth/send-otp` response so no SMS provider is required.
