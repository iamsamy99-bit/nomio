-- Gestión de miembros del equipo: editar rol y eliminar miembro (owner/admin).
-- Complementa agregar_miembro_empresa (que solo daba de alta). Mismas guardas
-- de seguridad: SECURITY DEFINER, validación de rol del llamante y del objetivo,
-- protección del propietario y de auto-eliminación.

-- 1) Cambiar el rol de un miembro
CREATE OR REPLACE FUNCTION public.actualizar_rol_miembro(p_user_id uuid, p_rol text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_caller_rol text;
  v_target_rol text;
  v_rol text;
BEGIN
  SELECT eu.empresa_id, eu.rol INTO v_empresa_id, v_caller_rol
  FROM empresa_users eu
  WHERE eu.user_id = auth.uid() AND eu.activo = true
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_empresa');
  END IF;
  IF v_caller_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;

  v_rol := lower(trim(p_rol));
  IF v_rol NOT IN ('admin', 'operador', 'capataz') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rol_invalido');
  END IF;

  SELECT eu.rol INTO v_target_rol FROM empresa_users eu
  WHERE eu.empresa_id = v_empresa_id AND eu.user_id = p_user_id
  LIMIT 1;

  IF v_target_rol IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_encontrado');
  END IF;
  IF v_target_rol = 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_owner', 'message', 'No se puede cambiar el rol del propietario.');
  END IF;

  UPDATE empresa_users SET rol = v_rol
  WHERE empresa_id = v_empresa_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'rol', v_rol);
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_rol_miembro(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_rol_miembro(uuid, text) TO authenticated;

-- 2) Eliminar un miembro de la empresa (quita su acceso por completo)
CREATE OR REPLACE FUNCTION public.eliminar_miembro_empresa(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_caller_rol text;
  v_target_rol text;
BEGIN
  SELECT eu.empresa_id, eu.rol INTO v_empresa_id, v_caller_rol
  FROM empresa_users eu
  WHERE eu.user_id = auth.uid() AND eu.activo = true
  LIMIT 1;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_empresa');
  END IF;
  IF v_caller_rol NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_permiso');
  END IF;
  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_self', 'message', 'No puedes eliminarte a ti mismo.');
  END IF;

  SELECT eu.rol INTO v_target_rol FROM empresa_users eu
  WHERE eu.empresa_id = v_empresa_id AND eu.user_id = p_user_id
  LIMIT 1;

  IF v_target_rol IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_encontrado');
  END IF;
  IF v_target_rol = 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_owner', 'message', 'No se puede eliminar al propietario.');
  END IF;

  DELETE FROM empresa_users
  WHERE empresa_id = v_empresa_id AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_miembro_empresa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eliminar_miembro_empresa(uuid) TO authenticated;
