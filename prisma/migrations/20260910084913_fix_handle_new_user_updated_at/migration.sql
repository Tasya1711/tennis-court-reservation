-- Fix: the original handle_new_user() trigger didn't set updated_at, which
-- has no DB-level default (Prisma's @updatedAt is applied by Prisma Client,
-- not as a Postgres column DEFAULT) — every real signup would have failed
-- with a NOT NULL violation. Found by M1's own verification script.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
    ),
    now()
  );
  RETURN NEW;
END;
$$;
