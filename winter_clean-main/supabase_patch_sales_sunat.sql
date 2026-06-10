-- CORRE EN SUPABASE: AGREGAR COLUMNAS PARA EL CONTROL DE CORRELATIVOS, SUNAT Y NOTA DE CRÉDITO
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS internal_correlative VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS sunat_status VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS sunat_response_code VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS sunat_document_number VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS sunat_response TEXT NULL,
  ADD COLUMN IF NOT EXISTS sunat_response_description TEXT NULL,
  ADD COLUMN IF NOT EXISTS sunat_pdf_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS sunat_xml_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS sunat_cdr_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS document_series VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) NULL,
  ADD COLUMN IF NOT EXISTS credit_days INTEGER NULL,
  ADD COLUMN IF NOT EXISTS due_date VARCHAR(100) NULL,
  -- NOTA DE CRÉDITO
  ADD COLUMN IF NOT EXISTS credit_note_document_number VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS credit_note_status VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS credit_note_response_description TEXT NULL,
  ADD COLUMN IF NOT EXISTS credit_note_pdf_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS credit_note_xml_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS credit_note_cdr_url TEXT NULL;

-- COMENTARIOS DE EXPLICACIÓN
COMMENT ON COLUMN public.sales.internal_correlative IS 'Correlativo interno autoincremental/ascendente (ej. INT1-00000045)';
COMMENT ON COLUMN public.sales.sunat_document_number IS 'Correlativo de Boleta/Factura/Nota de Pedido (ej. F001-00000123)';
COMMENT ON COLUMN public.sales.sunat_response IS 'Guarda "Aceptado" si cod_sunat/response_code es 0, de lo contrario la descripción del error';
COMMENT ON COLUMN public.sales.document_series IS 'Serie separada para búsquedas rápidas (ej. F001)';
COMMENT ON COLUMN public.sales.document_number IS 'Número serial separado correlativo (ej. 00000123)';
