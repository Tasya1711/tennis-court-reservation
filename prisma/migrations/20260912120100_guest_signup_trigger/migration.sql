-- Extends the existing on_auth_user_created trigger so a guest user
-- (created server-side via supabase.auth.admin.generateLink({ type:
-- 'signup', options: { data: { is_guest: true, username } } }) — see
-- app/api/auth/guest/route.ts) gets role = 'GUEST' instead of the default
-- CUSTOMER. Everything else about the trigger (username fallback,
-- updated_at) is unchanged from the previous version.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'username',
      split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
    ),
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'is_guest')::boolean IS TRUE THEN 'GUEST'::"Role"
      ELSE 'CUSTOMER'::"Role"
    END,
    now()
  );
  RETURN NEW;
END;
$$;
