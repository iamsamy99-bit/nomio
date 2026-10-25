-- Security fix (daily review 2026-06-02, ALTA): get_empresa_members is
-- SECURITY DEFINER and previously trusted the p_empresa_id argument without
-- verifying the caller belongs to that empresa. Any authenticated user could
-- enumerate members and emails of any company by passing an arbitrary empresa_id.
--
-- This migration also serves as the missing repro for the function itself, which
-- had been applied to production directly via MCP without a tracked migration.
--
-- Fix: gate the result on p_empresa_id = get_user_empresa_id() so the function
-- returns rows only when the caller is a member of the requested empresa.

CREATE OR REPLACE FUNCTION public.get_empresa_members(p_empresa_id uuid)
RETURNS TABLE(id uuid, user_id uuid, rol text, activo boolean, email text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    eu.id,
    eu.user_id,
    eu.rol::text,
    eu.activo,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name
  FROM empresa_users eu
  JOIN auth.users u ON u.id = eu.user_id
  WHERE eu.empresa_id = p_empresa_id
    AND eu.activo = true
    AND p_empresa_id = public.get_user_empresa_id()
  ORDER BY eu.rol;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_empresa_members(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_empresa_members(uuid) TO authenticated;
