-- SQL PARA COPIAR Y EJECUTAR EN EL EDITOR SQL DE SUPABASE --
-- --------------------------------------------------------

-- 1. Crear tabla guias_remision si no existe (con soporte híbrido para ambos diseños de esquema)
CREATE TABLE IF NOT EXISTS guias_remision (
    -- Identificadores Primarios e Inquilino
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Soporte Híbrido: Permite asociarlo a 'tenants' (de SISLAV) o 'empresas' (según la especificación de la tarea)
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES profiles(id),
    comprobante_asociado_id UUID REFERENCES comprobantes(id) ON DELETE SET NULL,
    
    -- Configuración General y Códigos
    tipo_proceso_guia VARCHAR(1) DEFAULT '1' NOT NULL, -- '1' = Producción, '3' = Demostración
    codigo_tipo_documento VARCHAR(2) DEFAULT '09' NOT NULL, -- '09' = Guía de Remitente
    serie_documento VARCHAR(4) NOT NULL DEFAULT 'T001', -- Ej: T001
    numero_documento VARCHAR(8) NOT NULL, -- Ej: 00000004
    nro_guia_completo VARCHAR(13), -- Ej: T001-00000004
    
    -- Campo solicitado explícitamente en la especificación
    nro_comprobante VARCHAR(50) NOT NULL UNIQUE, -- Ej: T001-00000004
    modalidad VARCHAR(20) NOT NULL DEFAULT 'PRIVADA', -- 'PUBLICA' | 'PRIVADA'
    
    -- Fechas
    fecha_documento DATE DEFAULT CURRENT_DATE NOT NULL, -- Fecha emisión
    fecha_inicio DATE NOT NULL, -- Fecha inicio traslado
    fecha_inicio_traslado DATE, -- Mapeo redundante para soporte de esquemas SISLAV
    observacion TEXT,
    observaciones TEXT,
    nota TEXT,
    
    -- Información de la Empresa Emisora
    empresa_tipo_documento VARCHAR(1) DEFAULT '6' NOT NULL, -- 6 = RUC
    empresa_nro_documento VARCHAR(11),
    empresa_razon_social VARCHAR(255),
    
    -- Información del Cliente / Destinatario / Remitente
    cliente_tipo_documento VARCHAR(2) NOT NULL DEFAULT '6', -- 1=DNI, 6=RUC
    cliente_nro_documento VARCHAR(15),
    cliente_razon_social VARCHAR(255),
    cliente_nombre VARCHAR(255),
    cliente_documento VARCHAR(15),
    
    -- Datos de Carga
    unidad_medida_peso VARCHAR(3) DEFAULT 'KGM' NOT NULL, -- KGM, TNE
    peso_bruto DECIMAL(12, 2) NOT NULL DEFAULT 5.0,
    peso_bruto_total DECIMAL(12, 2),
    total_bultos INTEGER DEFAULT 1 NOT NULL,
    placa_vehiculo VARCHAR(20),
    placa_carreta VARCHAR(20),
    
    -- Datos del Origen (Punto Partida)
    ubigeo_origen VARCHAR(6) DEFAULT '150101' NOT NULL,
    direccion_origen TEXT DEFAULT 'AV. PRINCIPAL 123' NOT NULL,
    
    -- Datos del Destino (Punto Llegada)
    ubigeo_destino VARCHAR(6) NOT NULL DEFAULT '150101',
    direccion_destino TEXT NOT NULL,
    
    -- Anexos Transportistas (Courier)
    transportista_tipo_documento VARCHAR(2),
    transportista_nro_documento VARCHAR(15),
    transportista_razon_social VARCHAR(255),
    mtc_inscripcion_vehiculo VARCHAR(100),
    mtc_inscripcion_carreta VARCHAR(100),
    mtc_nro_registro_empresa VARCHAR(50),
    
    -- Datos de Choferes / Conductores
    chofer_tipo_documento VARCHAR(2), -- '1' = DNI, etc.
    chofer_nro_documento VARCHAR(15),
    chofer_nombres VARCHAR(100),
    chofer_apellidos VARCHAR(100),
    chofer_licencia_conducir VARCHAR(50),
    
    -- Integración y Estado
    estado_guia VARCHAR(50) DEFAULT 'BORRADOR' NOT NULL, -- BORRADOR, ENVIADO, ACEPTADO, ANULADO
    flg_anulado VARCHAR(1) DEFAULT '0' NOT NULL, -- '1' = Sí, '0' = No
    doc_referencia_anulacion VARCHAR(50),
    cod_tipo_doc_referencia_anulacion VARCHAR(2),
    
    -- Respuestas API Sunat
    api_endpoint VARCHAR(255) DEFAULT 'https://service1.visioner7-api.com/api/v1/sunat/guia-remision',
    cod_sunat VARCHAR(10),
    sunat_codigo_respuesta VARCHAR(10),
    msj_sunat TEXT,
    sunat_descripcion_respuesta TEXT,
    archivo TEXT,
    sunat_pdf_url TEXT,
    hash_cdr TEXT,
    sunat_hash_guia TEXT,
    
    -- Detalle de Prendas (Array de Items del formulario)
    detalle JSONB NOT NULL DEFAULT '[]'::jsonb,
    payload_envio JSONB,
    payload_respuesta JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexación de velocidad de búsqueda
CREATE INDEX IF NOT EXISTS idx_guias_remision_tenant ON guias_remision(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guias_remision_company ON guias_remision(company_id);
CREATE INDEX IF NOT EXISTS idx_guias_remision_nro_comprobante ON guias_remision(nro_comprobante);

-- 2. HABILITAR SEGURIDAD POR FILAS (RLS)
ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;

-- 3. CREAR POLÍTICAS DE ACCESO SEGURO (Mapeo por tenant del usuario conectado)
CREATE POLICY "Permitir lectura de guias de remision por inquilino"
ON guias_remision FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) OR 
    company_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Permitir insercion de guias de remision por inquilino"
ON guias_remision FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) OR 
    company_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Permitir actualizacion de guias de remision por inquilino"
ON guias_remision FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) OR 
    company_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) OR 
    company_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
);
