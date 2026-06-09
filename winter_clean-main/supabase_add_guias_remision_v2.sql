-- Tabla para guías de remisión
CREATE TABLE IF NOT EXISTS guias_remision (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nro_comprobante TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_guias_company
  ON guias_remision(company_id);
CREATE INDEX IF NOT EXISTS idx_guias_fecha
  ON guias_remision(fecha_documento);
CREATE INDEX IF NOT EXISTS idx_guias_ref
  ON guias_remision(nro_comprobante_ref);

-- RLS
ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa ve sus guias" ON guias_remision
  FOR ALL USING (company_id = auth.uid());

-- Campo pfx_password en tabla empresas (si no existe)
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS pfx_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sol_usuario TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sol_password TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visioner7_token TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS visioner7_clave TEXT DEFAULT '';
