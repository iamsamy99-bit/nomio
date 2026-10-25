-- Recordatorios ampliados: contactos, cotizaciones, categoria

ALTER TABLE proyecto_recordatorios ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE proyecto_recordatorios ADD COLUMN IF NOT EXISTS cotizacion_id uuid REFERENCES cotizaciones(id) ON DELETE SET NULL;
ALTER TABLE proyecto_recordatorios ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'obra';

ALTER TABLE proyecto_recordatorios DROP CONSTRAINT IF EXISTS proyecto_recordatorios_categoria_check;
ALTER TABLE proyecto_recordatorios ADD CONSTRAINT proyecto_recordatorios_categoria_check
  CHECK (categoria IN ('obra', 'contacto', 'cotizacion', 'general'));

CREATE INDEX IF NOT EXISTS proyecto_recordatorios_cliente_idx ON proyecto_recordatorios(cliente_id);
CREATE INDEX IF NOT EXISTS proyecto_recordatorios_cotizacion_idx ON proyecto_recordatorios(cotizacion_id);
