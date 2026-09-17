-- M15 security review: two gaps flagged by Supabase's own advisor that
-- weren't part of the original RLS/trigger design.
--
-- 1. _prisma_migrations is Prisma's own internal migration-history table,
--    not app data, but it lives in the public schema and was exposed to
--    PostgREST with RLS disabled (flagged CRITICAL). Safe to enable with
--    no policies (default-deny for anon/authenticated, same posture as
--    Payment/AuthAttempt): the table is owned by the same `postgres` role
--    every other RLS-enabled table already uses via Prisma's connection,
--    and Postgres table owners bypass RLS by default — confirmed
--    empirically (profiles/reservations/etc. already have RLS enabled and
--    Prisma has read/written them throughout M1-M14) before applying this,
--    and re-verified after: app + `prisma migrate` both unaffected.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. handle_new_user() (the on_auth_user_created trigger body) is
--    SECURITY DEFINER and was directly callable by anon/authenticated via
--    the REST RPC endpoint (/rest/v1/rpc/handle_new_user), not just
--    invoked internally as a trigger. Confirmed empirically that trigger
--    firing doesn't depend on this grant: supabase_auth_admin (the role
--    that actually performs the auth.users insert that fires the trigger)
--    had no explicit EXECUTE grant here at all, yet signup already worked
--    before this change — so revoking public RPC access can't affect the
--    trigger. service_role keeps EXECUTE (server-only, trusted); postgres
--    (owner) is unaffected by REVOKE regardless.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
