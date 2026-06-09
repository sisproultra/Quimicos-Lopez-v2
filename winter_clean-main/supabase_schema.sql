-- =====================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS RELACIONAL PARA FACTURACIÓN ELECTRÓNICA Y GUÍAS DE REMISIÓN
-- OPTIMIZADO PARA SUPABASE (POSTGRESQL) Y SISTEMAS MULTIUSUARIO (MULTI-TENANT)
-- CON DISPENSADOR ATÓMICO DE CORRELATIVOS Y POLÍTICAS RLS (ROW-LEVEL SECURITY)
-- =====================================================================

-- Habilitar la extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- 1. ESTRUCTURA MULTI-INQUILINO (TENANTS / SUCURSALES)
-- =====================================================================

-- Tabla de Empresas / Sucursales (Inquilinos/Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruc VARCHAR(11) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion TEXT NOT NULL,
    ubigeo VARCHAR(6) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    codigo_pais VARCHAR(2) DEFAULT 'PE',
    
    -- Credenciales SOL de SUNAT (Cifradas ideales en producción, representadas aquí para coincidir con la API)
    usuario_sol VARCHAR(100) NOT NULL DEFAULT 'MODDATOS',
    pass_sol VARCHAR(100) NOT NULL DEFAULT 'MODDATOS',
    firma_contra VARCHAR(100) NOT NULL DEFAULT 'MODDATOS',
    firma_pas VARCHAR(150) NOT NULL DEFAULT 'MODDATOS',
    tipo_proceso VARCHAR(1) NOT NULL DEFAULT '3', -- '3' = Demostración/Beta, '1' = Producción
    
    telefono VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Perfiles de Usuario (Vinculación con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'vendedor' NOT NULL, -- admin, supervisor, vendedor, almacen
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =====================================================================
-- 2. REGISTRO MASTER DE CLIENTES
-- =====================================================================

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    tipo_documento VARCHAR(2) NOT NULL, -- '1' = DNI, '6' = RUC, '4' = CARNET EXT., '7' = PASAPORTE
    nro_documento VARCHAR(15) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion TEXT,
    ubigeo VARCHAR(6),
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),
    ciudad VARCHAR(100),
    email VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Unicidad del cliente por inquilino y tipo/número de documento
    CONSTRAINT unique_cliente_tenant UNIQUE (tenant_id, tipo_documento, nro_documento)
);

-- =====================================================================
-- 3. DISPENSADOR ATÓMICO DE SECUENCIAS Y CORRELATIVOS
-- Para evitar saltos, duplicados e inconsistencias por concurrencia multiusuario.
-- =====================================================================

CREATE TABLE IF NOT EXISTS correlativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    tipo_comprobante VARCHAR(2) NOT NULL, -- '01' = Factura, '03' = Boleta, '09' = Guía Remisión, 'NV' = Nota Venta
    serie VARCHAR(4) NOT NULL, -- Ej: 'F001', 'B001', 'T001', 'NP01'
    ultimo_correlativo INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validaciones de longitud
    CONSTRAINT ck_serie_lenght CHECK (char_length(serie) = 4),
    CONSTRAINT unique_correlativo_serie UNIQUE (tenant_id, tipo_comprobante, serie)
);

-- Función SQL Atómica para Reservar/Obtener el Próximo Correlativo
-- Bloquea la fila con pesimismo absoluto (FOR UPDATE) para alta concurrencia
CREATE OR REPLACE FUNCTION reservar_siguiente_correlativo(
    p_tenant_id UUID,
    p_tipo_comprobante VARCHAR,
    p_serie VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_correlativo_id UUID;
    v_siguiente_num INTEGER;
    v_resultado VARCHAR(13); -- Ej: F001-00000123
BEGIN
    -- Validar formato de la serie
    IF char_length(p_serie) != 4 THEN
        RAISE EXCEPTION 'La serie debe tener exactamente 4 caracteres';
    END IF;

    -- Obtener la serie bloqueando la fila para actualización
    SELECT id, ultimo_correlativo 
    INTO v_correlativo_id, v_siguiente_num
    FROM correlativos
    WHERE tenant_id = p_tenant_id 
      AND tipo_comprobante = p_tipo_comprobante 
      AND serie = upper(p_serie)
    FOR UPDATE;

    -- Si no existe la configuración de la serie, la inicializamos automáticamente en 0
    IF NOT FOUND THEN
        INSERT INTO correlativos (tenant_id, tipo_comprobante, serie, ultimo_correlativo)
        VALUES (p_tenant_id, p_tipo_comprobante, upper(p_serie), 0)
        RETURNING id, ultimo_correlativo INTO v_correlativo_id, v_siguiente_num;
        
        -- Volver a bloquear para seguridad
        SELECT ultimo_correlativo 
        INTO v_siguiente_num
        FROM correlativos
        WHERE id = v_correlativo_id
        FOR UPDATE;
    END IF;

    -- Incrementar el correlativo secuencial
    v_siguiente_num := v_siguiente_num + 1;

    -- Actualizar el valor en la base de datos
    UPDATE correlativos
    SET ultimo_correlativo = v_siguiente_num
    WHERE id = v_correlativo_id;

    -- Formatear con ceros a la izquierda (8 dígitos según estandares SUNAT)
    v_resultado := upper(p_serie) || '-' || lpad(v_siguiente_num::text, 8, '0');

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================================
-- 4. CABECERA Y DETALLE DE COMPROBANTES DE PAGO (CPE)
-- Soporta Facturas (01), Boletas (03), Notas de Crédito/Débito y Notas de Venta (NV)
-- =====================================================================

CREATE TABLE IF NOT EXISTS comprobantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    usuario_id UUID REFERENCES profiles(id),
    
    -- Datos del Comprobante
    tipo_operacion VARCHAR(4) DEFAULT '0101' NOT NULL, -- '0101' = Venta Interna
    tipo_comprobante VARCHAR(2) NOT NULL, -- '01' = Factura, '03' = Boleta, 'NV' = Nota de Venta
    serie_documento VARCHAR(4) NOT NULL,
    numero_documento VARCHAR(8) NOT NULL,
    nro_comprobante_completo VARCHAR(13) NOT NULL, -- Formato indexable 'F001-00000001'
    
    fecha_documento DATE DEFAULT CURRENT_DATE NOT NULL,
    fecha_vencimiento DATE,
    moneda VARCHAR(3) DEFAULT 'PEN' NOT NULL,
    tipo_cambio DECIMAL(12, 4) DEFAULT 1.0000 NOT NULL,
    
    -- Datos de Cliente desnormalizados para consistencia histórica de la transacción
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_tipo_documento VARCHAR(2) NOT NULL,
    cliente_nro_documento VARCHAR(15) NOT NULL,
    cliente_razon_social VARCHAR(255) NOT NULL,
    cliente_direccion TEXT,
    cliente_ubigeo VARCHAR(6),
    cliente_departamento VARCHAR(100),
    cliente_provincia VARCHAR(100),
    cliente_distrito VARCHAR(100),
    cliente_ciudad VARCHAR(100),
    
    -- Totales e Impuestos (Precisión decimal estándar)
    total_gravadas DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_inafectas DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_exoneradas DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_gratuitas DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_descuento DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    porcentaje_igv DECIMAL(5, 2) DEFAULT 18.00 NOT NULL,
    total_igv DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_isc DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_otros_impuestos DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    icbp_bolsa DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_pagar DECIMAL(12, 2) NOT NULL,
    total_letras TEXT NOT NULL,
    
    -- Detracciones / Percepciones / Retenciones
    has_detraccion BOOLEAN DEFAULT FALSE NOT NULL,
    codigo_detraccion VARCHAR(10),
    porcentaje_detraccion DECIMAL(5, 2) DEFAULT 0.00,
    total_detraccion DECIMAL(12, 2) DEFAULT 0.00,
    has_percepcion BOOLEAN DEFAULT FALSE NOT NULL,
    porcentaje_percepcion DECIMAL(5, 2) DEFAULT 0.00,
    total_percepcion DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Guías / Ordenes de Compra Asociadas
    nro_guia_remision_asociada VARCHAR(50),
    nro_orden_compra_asociada VARCHAR(50),
    
    -- Documento Modificado (Para Notas de Crédito / Débito)
    tipo_comprobante_modificado VARCHAR(2),
    nro_comprobante_modificado VARCHAR(20),
    cod_tipo_motivo_modificacion VARCHAR(2),
    descripcion_motivo_modificacion TEXT,
    
    observaciones TEXT,
    
    -- Integración API SUNAT / Proveedor
    estado_comprobante VARCHAR(50) DEFAULT 'BORRADOR' NOT NULL, -- BORRADOR, PENDIENTE_ENVIO, ENVIADO_API, RECHAZADO_SUNAT, ACEPTADO_SUNAT, ANULADO
    api_endpoint VARCHAR(255) DEFAULT 'https://service1.visioner7-api.com/api/v1/sunat/generar-cpe',
    sunat_codigo_respuesta VARCHAR(10),
    sunat_descripcion_respuesta TEXT,
    sunat_xml_zip_url TEXT,
    sunat_cdr_zip_url TEXT,
    sunat_pdf_url TEXT,
    sunat_hash_cpe TEXT,
    payload_envio JSONB, -- Almacenar el JSON exacto para auditoría y reenvíos
    payload_respuesta JSONB, -- Respuesta de Visioner7 API
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    CONSTRAINT unique_comprobante_fiscal UNIQUE (tenant_id, tipo_comprobante, serie_documento, numero_documento)
);

-- Detalle de Líneas de Comprobantes
CREATE TABLE IF NOT EXISTS comprobante_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comprobante_id UUID REFERENCES comprobantes(id) ON DELETE CASCADE NOT NULL,
    item_index INTEGER NOT NULL, -- Correlativo de línea (1, 2, 3...)
    codigo_producto VARCHAR(50),
    descripcion TEXT NOT NULL,
    unidad_medida VARCHAR(3) DEFAULT 'NIU' NOT NULL, -- NIU, ZZ, KGM, GLN, etc.
    cantidad DECIMAL(12, 4) NOT NULL,
    
    -- Cálculos de Precios
    precio_unitario decimal(15, 6) NOT NULL, -- Con IGV
    precio_sin_igv decimal(15, 6) NOT NULL, -- Base imponible por unidad
    importe_det decimal(12, 2) NOT NULL, -- Base imponible total de la línea (cantidad * precio_sin_igv)
    igv decimal(12, 2) NOT NULL, -- IGV Total de la línea
    porcentaje_igv decimal(5, 2) DEFAULT 18.00 NOT NULL,
    is_gratuito BOOLEAN DEFAULT FALSE NOT NULL,
    tipo_afectacion_igv VARCHAR(2) DEFAULT '10' NOT NULL, -- '10' = Gravado Operación Onerosa
    
    -- Impuestos Adicionales
    isc decimal(12, 2) DEFAULT 0.00,
    flg_icbper INTEGER DEFAULT 0 NOT NULL, -- 1 o 0
    impuesto_bp decimal(12, 2) DEFAULT 0.00, -- valor por bolsa
    importe_bp decimal(12, 2) DEFAULT 0.00 -- total bolsas (icbper) de la línea
);

-- Detalle Calendario/Formas de Pago vinculadas
CREATE TABLE IF NOT EXISTS comprobante_formas_pago (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comprobante_id UUID REFERENCES comprobantes(id) ON DELETE CASCADE NOT NULL,
    codigo_forma_pago VARCHAR(50) DEFAULT 'Contado' NOT NULL, -- 'Contado', 'Credito'
    monto_forma_pago DECIMAL(12, 2) NOT NULL,
    fecha_vto_cuota DATE, -- NULL si es al contado, o fecha de cuota
    numero_cuota INTEGER -- Orden de cuota (1, 2...)
);

-- =====================================================================
-- 5. CABECERA Y DETALLE DE GUÍAS DE REMISIÓN DE REMITENTE / TRANSPORTISTA (GR)
-- API Compatible con endpoints SUNAT de Visioner7
-- =====================================================================

CREATE TABLE IF NOT EXISTS guias_remision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    usuario_id UUID REFERENCES profiles(id),
    comprobante_asociado_id UUID REFERENCES comprobantes(id) ON DELETE SET NULL, -- Referencia ágil
    
    -- Configuración General y Token
    tipo_proceso_guia VARCHAR(1) DEFAULT '1' NOT NULL, -- '1' = Producción, '3' = Demostración
    codigo_tipo_documento VARCHAR(2) DEFAULT '09' NOT NULL, -- '09' = Guía de Remitente, '31' = Guía Transportista
    serie_documento VARCHAR(4) NOT NULL, -- Ej: T001
    numero_documento VARCHAR(8) NOT NULL, -- Ej: 00000004
    nro_guia_completo VARCHAR(13) NOT NULL, -- Ej: T001-00000004
    id_token VARCHAR(255), -- UUID del token provisto por la API
    clave_token VARCHAR(255), -- Clave token de la API
    
    fecha_documento DATE DEFAULT CURRENT_DATE NOT NULL, -- Fecha emisión
    fecha_inicio_traslado DATE NOT NULL,
    observacion TEXT,
    
    -- Información de la Empresa Emisora (Para Guía)
    empresa_tipo_documento VARCHAR(1) DEFAULT '6' NOT NULL, -- 6 = RUC
    empresa_nro_documento VARCHAR(11) NOT NULL,
    empresa_razon_social VARCHAR(255) NOT NULL,
    
    -- Información del Cliente / Destinatario / Remitente
    cliente_tipo_documento VARCHAR(2) NOT NULL, -- 1=DNI, 6=RUC
    cliente_nro_documento VARCHAR(15) NOT NULL,
    cliente_razon_social VARCHAR(255) NOT NULL,
    
    -- Datos Específicos del Traslado
    motivo_traslado_codigo VARCHAR(2) DEFAULT '01' NOT NULL, -- '01' = Venta, '02' = Compra, etc.
    motivo_traslado_descripcion VARCHAR(100) DEFAULT 'VENTA' NOT NULL,
    modalidad_traslado_codigo VARCHAR(2) DEFAULT '01' NOT NULL, -- '01' = Público, '02' = Privado
    
    -- Datos de Carga
    unidad_medida_peso VARCHAR(3) DEFAULT 'KGM' NOT NULL, -- KGM, TNE
    peso_bruto_total DECIMAL(12, 2) NOT NULL,
    total_bultos INTEGER DEFAULT 1 NOT NULL,
    placa_vehiculo VARCHAR(20),
    placa_carreta VARCHAR(20),
    
    -- Datos del Origen (Punto Partida)
    ubigeo_origen VARCHAR(6) NOT NULL,
    direccion_origen TEXT NOT NULL,
    
    -- Datos del Destino (Punto Llegada)
    ubigeo_destino VARCHAR(6) NOT NULL,
    direccion_destino TEXT NOT NULL,
    
    -- Documentos Relacionados
    nro_documento_referencia VARCHAR(50),
    cod_documento_relacionado VARCHAR(2),
    descripcion_documento_relacionado VARCHAR(100),
    cod_documento_relacionado_empresa VARCHAR(2),
    nro_documento_relacionado_empresa VARCHAR(50),
    
    -- Anexos Transportistas
    transportista_tipo_documento VARCHAR(2),
    transportista_nro_documento VARCHAR(15),
    transportista_razon_social VARCHAR(255),
    mtc_inscripcion_vehiculo VARCHAR(100), -- MTC ID Vehículo
    mtc_inscripcion_carreta VARCHAR(100), -- MTC ID Acoplado
    mtc_nro_registro_empresa VARCHAR(50), -- Nro Registro MTC
    
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
    sunat_codigo_respuesta VARCHAR(10),
    sunat_descripcion_respuesta TEXT,
    sunat_pdf_url TEXT,
    sunat_hash_guia TEXT,
    payload_envio JSONB,
    payload_respuesta JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    CONSTRAINT unique_guia_fiscal UNIQUE (tenant_id, codigo_tipo_documento, serie_documento, numero_documento)
);

-- Tabla de Detalle de Guía de Remisión
CREATE TABLE IF NOT EXISTS guia_remision_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guia_id UUID REFERENCES guias_remision(id) ON DELETE CASCADE NOT NULL,
    item_index INTEGER NOT NULL,
    codigo_producto VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    unidad_medida VARCHAR(3) DEFAULT 'NIU' NOT NULL,
    cantidad DECIMAL(12, 4) NOT NULL,
    order_item INTEGER DEFAULT 1 -- Índice de item en orden original
);


-- =====================================================================
-- 6. POLÍTICAS DE AISLAMIENTO Y SEGURIDAD RLS (ROW LEVEL SECURITY)
-- Para blindar la seguridad del sistema multi-tenant
-- =====================================================================

-- Activación General de RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobante_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobante_formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias_remision ENABLE ROW LEVEL SECURITY;
ALTER TABLE guia_remision_detalles ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para obtener el tenant_id del usuario logeado en Supabase
-- Recupera el tenant_id desde los metadatos del JWT para máxima velocidad y seguridad,
-- con fallback de consulta a la base de datos de perfiles si es necesario.
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Intentar leer directamente de los claims JWT del usuario (Supabase Auth Metadata)
    v_tenant_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NOT NULL THEN
        RETURN v_tenant_id;
    END IF;
    
    -- Fallback de consulta a la tabla Profiles
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- POLÍTICAS PARA: tenants
-- Un usuario solo puede ver los datos de los tenants correspondientes a su perfil
CREATE POLICY tenant_isolation_view ON tenants
    FOR SELECT
    USING (id = current_tenant_id());

CREATE POLICY tenant_isolation_all_admin ON tenants
    FOR ALL
    USING (id = current_tenant_id())
    WITH CHECK (id = current_tenant_id());


-- POLÍTICAS PARA: profiles
CREATE POLICY profile_isolation ON profiles
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());


-- POLÍTICAS PARA: clientes
CREATE POLICY cliente_isolation ON clientes
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());


-- POLÍTICAS PARA: correlativos
CREATE POLICY correlativo_isolation ON correlativos
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());


-- POLÍTICAS PARA: comprobantes
CREATE POLICY comprobante_isolation ON comprobantes
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());


-- POLÍTICAS PARA: comprobante_detalles
-- Aislados mediante la relación heredada y la seguridad del comprobante principal
CREATE POLICY comprobante_det_isolation ON comprobante_detalles
    FOR ALL
    USING (comprobante_id IN (SELECT id FROM comprobantes WHERE tenant_id = current_tenant_id()))
    WITH CHECK (comprobante_id IN (SELECT id FROM comprobantes WHERE tenant_id = current_tenant_id()));


-- POLÍTICAS PARA: comprobante_formas_pago
CREATE POLICY comprobante_pagos_isolation ON comprobante_formas_pago
    FOR ALL
    USING (comprobante_id IN (SELECT id FROM comprobantes WHERE tenant_id = current_tenant_id()))
    WITH CHECK (comprobante_id IN (SELECT id FROM comprobantes WHERE tenant_id = current_tenant_id()));


-- POLÍTICAS PARA: guias_remision
CREATE POLICY guias_remision_isolation ON guias_remision
    FOR ALL
    USING (tenant_id = current_tenant_id())
    WITH CHECK (tenant_id = current_tenant_id());


-- POLÍTICAS PARA: guia_remision_detalles
CREATE POLICY guias_remision_det_isolation ON guia_remision_detalles
    FOR ALL
    USING (guia_id IN (SELECT id FROM guias_remision WHERE tenant_id = current_tenant_id()))
    WITH CHECK (guia_id IN (SELECT id FROM guias_remision WHERE tenant_id = current_tenant_id()));


-- =====================================================================
-- 7. AUDITORÍA E ÍNDICES DE RENDIMIENTO (INDEXES)
-- =====================================================================

-- Índices eficientes para búsquedas rápidas fiscales y filtrados multiusuario
CREATE INDEX IF NOT EXISTS idx_comprobantes_tenant_completo ON comprobantes (tenant_id, nro_comprobante_completo);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON comprobantes (tenant_id, fecha_documento);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes (tenant_id, estado_comprobante);

CREATE INDEX IF NOT EXISTS idx_guias_tenant_completo ON guias_remision (tenant_id, nro_guia_completo);
CREATE INDEX IF NOT EXISTS idx_guias_fecha ON guias_remision (tenant_id, fecha_documento);
CREATE INDEX IF NOT EXISTS idx_guias_estado ON guias_remision (tenant_id, estado_guia);

CREATE INDEX IF NOT EXISTS idx_clientes_doc ON clientes (tenant_id, tipo_documento, nro_documento);
CREATE INDEX IF NOT EXISTS idx_correlativos_tipo_serie ON correlativos (tenant_id, tipo_comprobante, serie);


-- =====================================================================
-- 8. TABLAS ADICIONALES DE CONTROL DE NEGOCIO, POS Y MANUFACTURA
-- =====================================================================

-- Tabla de Empleados
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(100) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '[]'::jsonb,
    photo_url TEXT,
    phone VARCHAR(50),
    address TEXT,
    gender VARCHAR(20),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    wash_type_id VARCHAR(100),
    unit_id VARCHAR(100),
    delivery_time_hours INTEGER,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Servicios / Productos (Insumos)
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    category VARCHAR(255) NOT NULL,
    category_id VARCHAR(100),
    description TEXT,
    track_stock BOOLEAN DEFAULT FALSE,
    stock DECIMAL(12, 2) DEFAULT 0,
    image_url TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'INSUMO',
    internal_code VARCHAR(100),
    ean VARCHAR(100),
    min_stock DECIMAL(12, 2),
    max_stock DECIMAL(12, 2),
    alert_low DECIMAL(12, 2),
    alert_high DECIMAL(12, 2),
    recipe JSONB DEFAULT '[]'::jsonb,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Categorías de Gasto (Gasto Categorías)
CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'VARIABLE' o 'FIJO'
    is_staff_related BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Gastos (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category_id VARCHAR(100),
    category VARCHAR(255),
    type VARCHAR(50) NOT NULL, -- 'VARIABLE' o 'FIJO'
    date VARCHAR(100) NOT NULL, -- cadena ISO de fecha
    payment_method_id VARCHAR(100),
    staff_id VARCHAR(100),
    staff_name VARCHAR(255),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Registros de Producción (Production Logs)
CREATE TABLE IF NOT EXISTS production_logs (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity_produced DECIMAL(12, 2) NOT NULL,
    packaged_volume DECIMAL(12, 2) DEFAULT 0,
    batch_number VARCHAR(100),
    expiration_date VARCHAR(100),
    produced_by VARCHAR(255),
    ingredients_deducted BOOLEAN DEFAULT FALSE,
    packaging JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'open',
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Mermas (Waste Logs)
CREATE TABLE IF NOT EXISTS waste_logs (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    reported_by VARCHAR(255),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Solicitudes de Recojo (Pickup Requests)
CREATE TABLE IF NOT EXISTS pickup_requests (
    id VARCHAR(100) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    country_code VARCHAR(10),
    phone VARCHAR(50),
    address TEXT NOT NULL,
    google_maps_url TEXT,
    scheduled_date VARCHAR(100) NOT NULL,
    notes TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    is_special_client BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at VARCHAR(100) NOT NULL,
    deleted BOOLEAN DEFAULT FALSE
);

-- Tabla de Turnos de Caja (Shifts)
CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(100) PRIMARY KEY,
    opened_at VARCHAR(100) NOT NULL,
    closed_at VARCHAR(100),
    opened_by VARCHAR(255) NOT NULL,
    closed_by VARCHAR(255),
    initial_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2),
    expected_amount DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'open',
    notes TEXT,
    total_cash_sales DECIMAL(10, 2) DEFAULT 0,
    total_non_cash_sales DECIMAL(10, 2) DEFAULT 0,
    total_cash_expenses DECIMAL(10, 2) DEFAULT 0,
    total_non_cash_expenses DECIMAL(10, 2) DEFAULT 0,
    total_other_income DECIMAL(10, 2) DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Unidades de Medida
CREATE TABLE IF NOT EXISTS measurement_units (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Tipos de Lavado (Wash Types)
CREATE TABLE IF NOT EXISTS wash_types (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Métodos de Pago
CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    image_icon TEXT,
    color VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    fixed_value DECIMAL(10, 2),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Otros Ingresos (Incomes)
CREATE TABLE IF NOT EXISTS incomes (
    id VARCHAR(100) PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date VARCHAR(100) NOT NULL,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Configuraciones Básicas (Settings)
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Ventas (Sales)
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(100) PRIMARY KEY,
    customer_id VARCHAR(100),
    customer_name VARCHAR(255),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    date VARCHAR(100) NOT NULL,
    scheduled_delivery_date VARCHAR(100),
    notes TEXT,
    total_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) DEFAULT 0,
    change DECIMAL(10, 2) DEFAULT 0,
    delivery_proof_photo TEXT,
    dispatched_at VARCHAR(100),
    delivered_at VARCHAR(100),
    delivered_by VARCHAR(255),
    document_type VARCHAR(50),
    client_doc_number VARCHAR(100),
    net_amount DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Ítems / Detalles de Venta
CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id VARCHAR(100) REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    service_id VARCHAR(100) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    batch_number VARCHAR(100),
    image_url TEXT,
    delivery_date VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de Pagos de Ventas (Sale Payments)
CREATE TABLE IF NOT EXISTS sale_payments (
    id BIGSERIAL PRIMARY KEY,
    sale_id VARCHAR(100) REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
    method_id VARCHAR(100) NOT NULL,
    method_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

