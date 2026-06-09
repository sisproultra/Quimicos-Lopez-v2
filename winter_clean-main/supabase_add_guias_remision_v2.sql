-- Tabla para guías de remisión (Eliminamos la previa para evitar conflictos con esquemas previos)
DROP TABLE IF EXISTS guias_remision CASCADE;

CREATE TABLE guias_remision (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Alias por compatibilidad
  nro_comprobante TEXT NOT NULL UNIQUE,
  nro_comprobante_ref TEXT,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('PUBLICA','PRIVADA')),
  fecha_documento DATE NOT NULL,
  fecha_inicio DATE NOT NULL,
  cod_sunat TEXT,
  msj_sunat TEXT,
  hash_cdr TEXT,
  archivo TEXT,
  cliente_nombre TEXT,
  cliente_documento TEXT,
  direccion_destino TEXT,
  ubigeo_destino TEXT,
  peso_bruto NUMERIC,
  total_bultos INTEGER,
  repartidor_nombre TEXT,
  repartidor_doc TEXT,
  placa_vehiculo TEXT,
  detalle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_guias_company ON guias_remision(company_id);
CREATE INDEX IF NOT EXISTS idx_guias_tenant  ON guias_remision(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guias_fecha    ON guias_remision(fecha_documento);
CREATE INDEX IF NOT EXISTS idx_guias_ref      ON guias_remision(nro_comprobante_ref);

-- RLS (Segmentación Segura Multi-Inquilino)
ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;

-- Nota: current_tenant_id() extrae el tenant del JWT de sesión de forma ultrarrápida
CREATE POLICY "empresa ve sus guias" ON guias_remision
  FOR ALL USING (
    company_id = current_tenant_id() OR 
    tenant_id = current_tenant_id()
  );

-- Campo de Credenciales en la tabla tenants (en lugar de empresas)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS pfx_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sol_usuario TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sol_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visioner7_token TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visioner7_clave TEXT DEFAULT '';

