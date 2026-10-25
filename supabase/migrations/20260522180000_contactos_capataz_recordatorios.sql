-- Contactos (clientes), recordatorios de proyecto, rol capataz, RPC para invitar miembros
-- Ejecutar en Supabase SQL Editor antes de usar las pantallas nuevas en produccion.

-- 1) Rol capataz (solo asistencias)
ALTER TABLE empresa_users DROP CONSTRAINT IF EXISTS empresa_users_rol_check;
ALTER TABLE empresa_users ADD CONSTRAINT empresa_users_rol_check
  CHECK (rol IN ('owner', 'admin', 'operador', 'capataz'));

-- 2) Catalogo de contactos / clientes
CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text,
  telefono text,
  direccion text,
  empresa_cliente text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_empresa_id_idx ON clientes(empresa_id);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_empresa ON clientes;
CREATE POLICY clientes_empresa ON clientes
  FOR ALL
  USING (empresa_id = auth_empresa_id())
  WITH CHECK (empresa_id = auth_empresa_id());

-- 3) Recordatorios de proyecto
CREATE TABLE IF NOT EXISTS proyecto_recordatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES proyectos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  fecha_recordatorio date NOT NULL,
  notas text,
  completado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyecto_recordatorios_empresa_idx ON proyecto_recordatorios(empresa_id);
CREATE INDEX IF NOT EXISTS proyecto_recordatorios_fecha_idx ON proyecto_recordatorios(fecha_recordatorio);

ALTER TABLE proyecto_recordatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proyecto_recordatorios_empresa ON proyecto_recordatorios;
CREATE POLICY proyecto_recordatorios_empresa ON proyecto_recordatorios
  FOR ALL
  USING (empresa_id = auth_empresa_id())
  WITH CHECK (empresa_id = auth_empresa_id());

-- 4) Fechas de proyecto (si faltan en tu esquema)
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_inicio date;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS fecha_fin_estimada date;

-- 5) Invitar usuario existente por correo (owner/admin)
CREATE OR REPLACE FUNCTION public.agregar_miembro_empresa(p_email text, p_rol text DEFAULT 'capataz')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_caller_rol text;
  v_user_id uuid;
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
    v_rol := 'capataz';
  END IF;

  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found',
      'message', 'Ese correo no tiene cuenta. Pide que se registre en Nomio primero.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM empresa_users eu
    WHERE eu.empresa_id = v_empresa_id AND eu.user_id = v_user_id
  ) THEN
    UPDATE empresa_users SET rol = v_rol, activo = true
    WHERE empresa_id = v_empresa_id AND user_id = v_user_id;
  ELSE
    INSERT INTO empresa_users (empresa_id, user_id, rol, activo)
    VALUES (v_empresa_id, v_user_id, v_rol, true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'rol', v_rol);
END;
$$;

REVOKE ALL ON FUNCTION public.agregar_miembro_empresa(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agregar_miembro_empresa(text, text) TO authenticated;
