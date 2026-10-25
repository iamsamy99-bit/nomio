-- CRM obra: tipos de contacto, vinculo con cotizaciones, seguimiento

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cliente';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS puesto text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_contacto_at timestamptz;

ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_check;
ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_check
  CHECK (tipo IN ('cliente', 'proveedor', 'subcontratista', 'arquitecto', 'otro'));

CREATE INDEX IF NOT EXISTS clientes_tipo_idx ON clientes(empresa_id, tipo);

ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cotizaciones_cliente_id_idx ON cotizaciones(cliente_id);
