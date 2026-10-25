-- Security fix (daily review 2026-06-02, ALTA): proyectos visibility for the
-- capataz role was enforced only client-side (app/dashboard/proyectos/page.tsx
-- filtered in JS over the full empresa list). RLS had a single permissive policy
-- (proyectos_all) scoped only by empresa_id, so a capataz could read every project
-- of their empresa via a direct Supabase call. Additionally, an empty display name
-- or a project with no encargado defaulted to "visible to all capataz".
--
-- Fix: enforce the restriction in RLS. Capataz users may SELECT only projects whose
-- encargado text matches their display name; projects with no encargado are NOT
-- visible to capataz. Write access (INSERT/UPDATE/DELETE) is denied to capataz.
-- Non-capataz roles keep full access to their empresa, unchanged.

-- Caller's rol within their own empresa (SECURITY DEFINER to avoid RLS recursion).
CREATE OR REPLACE FUNCTION public.current_user_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT rol::text
  FROM empresa_users
  WHERE user_id = auth.uid() AND activo = true
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION public.current_user_rol() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_user_rol() TO authenticated;

-- Caller's display name, mirroring the client fallback chain.
CREATE OR REPLACE FUNCTION public.current_user_display_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  )
  FROM auth.users u
  WHERE u.id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.current_user_display_name() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_user_display_name() TO authenticated;

-- Replace the blanket policy with role-aware policies.
DROP POLICY IF EXISTS proyectos_all ON public.proyectos;

-- SELECT: non-capataz see all empresa projects; capataz see only their assigned ones.
CREATE POLICY proyectos_select ON public.proyectos
  FOR SELECT
  USING (
    empresa_id = get_user_empresa_id()
    AND (
      current_user_rol() IS DISTINCT FROM 'capataz'
      OR (
        encargado IS NOT NULL
        AND current_user_display_name() <> ''
        AND lower(encargado) LIKE '%' || lower(current_user_display_name()) || '%'
      )
    )
  );

-- INSERT/UPDATE/DELETE: empresa-scoped, denied to capataz.
CREATE POLICY proyectos_write ON public.proyectos
  FOR ALL
  USING (
    empresa_id = get_user_empresa_id()
    AND current_user_rol() IS DISTINCT FROM 'capataz'
  )
  WITH CHECK (
    empresa_id = get_user_empresa_id()
    AND current_user_rol() IS DISTINCT FROM 'capataz'
  );
