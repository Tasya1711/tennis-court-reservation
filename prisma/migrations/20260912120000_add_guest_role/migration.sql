-- Adds a GUEST value to the existing Role enum so the guest-access flow
-- can be distinguished from CUSTOMER/ADMIN using the existing role column
-- (no new table/column). Kept in its own migration: Postgres won't let a
-- newly-added enum value be referenced in the same transaction that added
-- it, so the trigger update that uses 'GUEST' lives in the next migration.
ALTER TYPE "Role" ADD VALUE 'GUEST';
