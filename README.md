# Tennis Reservation

Mobile-first tennis court reservation platform for the Ukrainian market. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture, database schema, and setup steps.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in the values as described in ARCHITECTURE.md §14.
2. `npm install`
3. `npx prisma migrate deploy` (once the Prisma schema/migrations exist)
4. `npm run dev` — open [http://localhost:3000](http://localhost:3000)
