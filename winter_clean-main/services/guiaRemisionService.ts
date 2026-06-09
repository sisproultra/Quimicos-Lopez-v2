import { supabase } from './supabaseClient';
import { GuiaRemisionInput, GuiaRemisionResponse, Company } from '../types/guiaRemision';

// Safe helper to read any potential keys from company
const getCompanyField = (company: any, keys: string[]): string => {
  if (!company) return '';
  for (const k of keys) {
    if (company[k] !== undefined && company[k] !== null) {
      return String(company[k]);
    }
  }
  return '';
};

/**
 * 1. buildGuiaPayload
 * Construye el payload completo de Guía de Remisión para la API de Visioner7
 */
export function buildGuiaPayload(input: GuiaRemisionInput, company: Company): Record<string, unknown> {
  const isPrivada = input.modalidad === 'PRIVADA';

  if (isPrivada) {
    if (!input.placaVehiculo) {
      throw new Error('La placa del vehículo es requerida para la modalidad PRIVADA (02).');
    }
    if (!input.chofer) {
      throw new Error('Los datos del chofer son requeridos para la modalidad PRIVADA (02).');
    }
    if (!input.chofer.nroDoc || !input.chofer.nombres || !input.chofer.apellidos || !input.chofer.licConducir) {
      throw new Error('Todos los campos del chofer (DNI, Nombres, Apellidos, Licencia) son requeridos para la modalidad PRIVADA (02).');
    }
  }

  // Resolver campos de la empresa con tolerancia de snake_case / camelCase
  const companyRuc = getCompanyField(company, ['ruc', 'RUC', 'empresa_nro_documento']);
  const companyRazonSocial = getCompanyField(company, ['razon_social', 'razonSocial', 'shopName', 'nombre_comercial']);
  const companySolUsuario = getCompanyField(company, ['sol_usuario', 'usuario_sol', 'solUsuario', 'usuarioSol']) || 'MODDATOS';
  const companySolPassword = getCompanyField(company, ['sol_password', 'pass_sol', 'solPassword', 'passSol']) || 'MODDATOS';
  const companyPfxPassword = getCompanyField(company, ['pfx_password', 'firma_pas', 'firma_contra', 'pfxPassword', 'firmaPas', 'firmaContra']) || 'MODDATOS';
  const companyIdToken = getCompanyField(company, ['visioner7_token', 'id_token', 'visioner7Token', 'idToken']) || 'sk_11867.t8kBVOUaeNsEQgur18EEGVWOKner1ces';
  const companyClaveToken = getCompanyField(company, ['visioner7_clave', 'clave_token', 'visioner7Clave', 'claveToken']) || 'MODDATOS';
  const companyUbigeo = getCompanyField(company, ['ubigeo', 'ubigeoOrigen', 'ubigeo_origen', 'distrito']) || '150101';
  const companyDireccion = getCompanyField(company, ['direccion', 'direccionOrigen', 'direccion_origen', 'address']) || 'AV. PRINCIPAL 123';

  const payload: Record<string, unknown> = {
    // Campos fijos
    "TIPO_PROCESO": "1",
    "COD_TIPO_DOCUMENTO": "09",
    "FLG_ANULADO": "0",
    "COD_UND_PESO_BRUTO": "KGM",
    "COD_MOTIVO_TRASLADO": "01",
    "DESCRIPCION_MOTIVO_TRASLADO": "TRASLADO DE PRENDAS",
    "NRO_DOCUMENTO_REFERENCIA": "",
    "COD_DOCUMENTO_RELACIODO": "",
    "DOCUMENTO_RELACIODO": "",
    "COD_DOCUMENTO_RELACIODO_EMPRESA": "",
    "NRO_DOCUMENTO_RELACIODO_EMPRESA": "",
    "DOC_REFERENCIA_ANU": "",
    "COD_TIPO_DOC_REFANU": "",

    // Campos dende Empresa
    "NRO_DOCUMENTO_EMPRESA": companyRuc,
    "TIPO_DOCUMENTO_EMPRESA": "6",
    "RAZON_SOCIAL_EMPRESA": companyRazonSocial,
    "USUARIO_SOL_EMPRESA": companySolUsuario,
    "PASS_SOL_EMPRESA": companySolPassword,
    "PAS_FIRMA": companyPfxPassword,
    "ID_TOKEN": companyIdToken,
    "CLAVE_TOKEN": companyClaveToken,
    "COD_UBIGEO_ORIGEN": companyUbigeo,
    "DIRECCION_ORIGEN": companyDireccion,

    // Campos de formulario
    "NRO_COMPROBANTE": input.nroComprobante,
    "FECHA_DOCUMENTO": input.fechaDocumento,
    "FECHA_INICIO": input.fechaInicio,
    "NOTA": input.nota || "Recojo/Entrega de prendas",
    "PESO_BRUTO": parseFloat(input.pesoBruto).toFixed(2),
    "TOTAL_BULTOS": String(parseInt(input.totalBultos, 10) || 1),
    "ITEM_ENVIO": String(input.detalle.length),

    // Campos del cliente
    "TIPO_DOCUMENTO_CLIENTE": input.cliente.tipoDocumento === 'DNI' ? '1' : input.cliente.tipoDocumento === 'RUC' ? '6' : input.cliente.tipoDocumento,
    "NRO_DOCUMENTO_CLIENTE": input.cliente.nroDocumento,
    "RAZON_SOCIAL_CLIENTE": input.cliente.razonSocial,
    "COD_UBIGEO_DESTINO": input.cliente.ubigeo || "150101",
    "DIRECCION_DESTINO": input.cliente.direccion,

    // Detalle de ítems
    "detalle": input.detalle.map((d, index) => ({
      "ITEM": String(index + 1),
      "ORDER_ITEM": String(index + 1),
      "UNIDAD_MEDIDA": "NIU",
      "CANTIDAD": String(parseFloat(d.cantidad) || 1),
      "DESCRIPCION": d.descripcion.toUpperCase(),
      "CODIGO": d.codigo || `PRENDA-${index + 1}`
    }))
  };

  if (isPrivada) {
    payload["COD_MODALIDAD_TRASLADO"] = "02";
    payload["PLACA_VEHICULO"] = input.placaVehiculo?.trim().toUpperCase();
    payload["TIPO_DOCUMENTO_TRANSPORTISTA"] = "6";
    payload["NRO_DOCUMENTO_TRANSPORTISTA"] = companyRuc;
    payload["RAZON_SOCIAL_TRANSPORTISTA"] = companyRazonSocial;
    payload["COD_TIPO_DOC_CHOFER"] = input.chofer?.tipoDoc || "1";
    payload["NRO_DOC_CHOFER"] = input.chofer?.nroDoc?.trim();
    payload["NOMBRES_CHOFER"] = input.chofer?.nombres?.trim().toUpperCase();
    payload["APELLIDOS_CHOFER"] = input.chofer?.apellidos?.trim().toUpperCase();
    payload["LIC_CONDUCIR_CHOFER"] = input.chofer?.licConducir?.trim().toUpperCase();
  } else {
    payload["COD_MODALIDAD_TRASLADO"] = "01";
    payload["PLACA_VEHICULO"] = "";
    payload["TIPO_DOCUMENTO_TRANSPORTISTA"] = "";
    payload["NRO_DOCUMENTO_TRANSPORTISTA"] = "";
    payload["RAZON_SOCIAL_TRANSPORTISTA"] = "";
    payload["COD_TIPO_DOC_CHOFER"] = "";
    payload["NRO_DOC_CHOFER"] = "";
    payload["NOMBRES_CHOFER"] = "";
    payload["APELLIDOS_CHOFER"] = "";
    payload["LIC_CONDUCIR_CHOFER"] = "";
  }

  return payload;
}

/**
 * 2. sendGuiaRemision
 * Envía el JSON codificado a través del proxy local de la aplicación
 */
export async function sendGuiaRemision(input: GuiaRemisionInput, company: Company): Promise<GuiaRemisionResponse> {
  const payload = buildGuiaPayload(input, company);
  
  console.log("🚚 [Guia Remision] Payload:", JSON.stringify(payload, null, 2));

  const companyIdToken = getCompanyField(company, ['visioner7_token', 'id_token', 'visioner7Token', 'idToken']) || 'sk_11867.t8kBVOUaeNsEQgur18EEGVWOKner1ces';
  
  // Usar el endpoint proxy local tal como lo pre-define server.ts
  const url = `/api/v1/sunat/guia-remision?apiToken=${encodeURIComponent(companyIdToken)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor proxy SUNAT (HTTP ${response.status})`);
    }

    const res = await response.json();
    console.log("📦 [Guia Remision] Respuesta recibida:", JSON.stringify(res, null, 2));

    const finalRes = res.data || res.result || res;

    // Verificar si hay errores reportados por SUNAT
    const codSunat = String(finalRes.cod_sunat || finalRes.codSunat || '');
    const msjSunat = String(finalRes.msj_sunat || finalRes.msjSunat || finalRes.mensaje || 'Error desconocido al emitir guía.');

    if (codSunat !== "0" && codSunat !== "") {
      throw new Error(`SUNAT Rechazó la Guía de Remisión (Código ${codSunat}): ${msjSunat}`);
    }

    // Adaptar campos para cumplir con GuiaRemisionResponse
    return {
      archivo: finalRes.archivo || finalRes.pdf || finalRes.url_pdf || '',
      cod_sunat: codSunat || "0",
      msj_sunat: msjSunat || 'Aceptada con Éxito',
      hash_cdr: finalRes.hash_cdr || finalRes.hashCdr || finalRes.hash || ''
    };
  } catch (error: any) {
    console.error("❌ [Guia Remision Error] Detalle:", error);
    throw error;
  }
}

/**
 * 3. getNextCorrelativoGuia
 * Obtener correlativo autoincremental de la base de datos
 */
export async function getNextCorrelativoGuia(companyId: string): Promise<string> {
  try {
    // Tolerancia ante esquemas: consulta por company_id o tenant_id
    const { data, error } = await supabase
      .from('guias_remision')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Falla al consultar correlativo de guías, usando default:", error.message);
      return 'T001-00000001';
    }

    // Filtrar los que correspondan al tenant
    const matches = (data || []).filter(item => 
      String(item.tenant_id) === String(companyId) || 
      String(item.company_id) === String(companyId)
    );

    if (matches.length === 0) {
      return 'T001-00000001';
    }

    const lastItem = matches[0];
    const lastStr = lastItem.nro_comprobante || lastItem.nro_guia_completo || '';
    
    let lastNum = 0;
    let lastSerie = 'T001';

    if (lastStr) {
      const parts = lastStr.split('-');
      if (parts.length === 2) {
        lastSerie = parts[0].toUpperCase();
        lastNum = parseInt(parts[1], 10);
      }
    } else if (lastItem.numero_documento) {
      lastSerie = (lastItem.serie_documento || 'T001').toUpperCase();
      lastNum = parseInt(lastItem.numero_documento, 10);
    }

    if (isNaN(lastNum)) {
      lastNum = 0;
    }

    const nextNum = String(lastNum + 1).padStart(8, '0');
    return `${lastSerie}-${nextNum}`;
  } catch (err) {
    console.error("Error obteniendo correlativo:", err);
    return 'T001-00000001';
  }
}

/**
 * 4. saveGuiaToSupabase
 * Mapeo inteligente con soporte para ambos esquemas de base de datos
 */
export async function saveGuiaToSupabase(input: GuiaRemisionInput, response: GuiaRemisionResponse, tenantId: string): Promise<boolean> {
  const isPrivada = input.modalidad === 'PRIVADA';
  const serie = input.nroComprobante.split('-')[0] || 'T001';
  const numero = input.nroComprobante.split('-')[1] || '00000001';

  // Objeto con llaves redundantes para calzar con cualquier opción del SQL (el del usuario o el de SISLAV)
  const payload: Record<string, any> = {
    tenant_id: tenantId,
    company_id: tenantId,

    nro_comprobante: input.nroComprobante,
    nro_guia_completo: input.nroComprobante,
    serie_documento: serie,
    numero_documento: numero,
    codigo_tipo_documento: '09',

    modalidad: input.modalidad,
    modalidad_traslado_codigo: isPrivada ? '02' : '01',

    fecha_documento: input.fechaDocumento,
    fecha_inicio: input.fechaInicio,
    fecha_inicio_traslado: input.fechaInicio,

    observacion: input.nota || 'Recojo/Entrega de prendas',
    observaciones: input.nota || 'Recojo/Entrega de prendas',
    nota: input.nota || 'Recojo/Entrega de prendas',

    cliente_nombre: input.cliente.razonSocial,
    cliente_razon_social: input.cliente.razonSocial,
    cliente_documento: input.cliente.nroDocumento,
    cliente_nro_documento: input.cliente.nroDocumento,
    cliente_tipo_documento: input.cliente.tipoDocumento === 'DNI' ? '1' : input.cliente.tipoDocumento === 'RUC' ? '6' : '1',
    direccion_destino: input.cliente.direccion,
    ubigeo_destino: input.cliente.ubigeo,

    peso_bruto: parseFloat(input.pesoBruto),
    peso_bruto_total: parseFloat(input.pesoBruto),
    total_bultos: parseInt(input.totalBultos, 10) || 1,

    cod_sunat: response.cod_sunat,
    sunat_codigo_respuesta: response.cod_sunat,
    msj_sunat: response.msj_sunat,
    sunat_descripcion_respuesta: response.msj_sunat,
    hash_cdr: response.hash_cdr,
    sunat_hash_guia: response.hash_cdr,
    archivo: response.archivo,
    sunat_pdf_url: response.archivo,

    detalle: input.detalle,

    placa_vehiculo: isPrivada ? input.placaVehiculo?.toUpperCase() : '',
    chofer_tipo_documento: isPrivada ? (input.chofer?.tipoDoc || '1') : '',
    chofer_nro_documento: isPrivada ? input.chofer?.nroDoc : '',
    chofer_nombres: isPrivada ? input.chofer?.nombres?.toUpperCase() : '',
    chofer_apellidos: isPrivada ? input.chofer?.apellidos?.toUpperCase() : '',
    chofer_licencia_conducir: isPrivada ? input.chofer?.licConducir?.toUpperCase() : ''
  };

  try {
    const { error } = await supabase.from('guias_remision').insert([payload]);
    if (error) {
      console.warn("Falla al guardar guía usando mapeo completo, intentando inserción simplificada:", error.message);
      
      const minimalPayload = {
        company_id: tenantId,
        nro_comprobante: input.nroComprobante,
        modalidad: input.modalidad,
        fecha_documento: input.fechaDocumento,
        fecha_inicio: input.fechaInicio,
        cod_sunat: response.cod_sunat,
        msj_sunat: response.msj_sunat,
        hash_cdr: response.hash_cdr,
        archivo: response.archivo,
        cliente_nombre: input.cliente.razonSocial,
        cliente_documento: input.cliente.nroDocumento,
        direccion_destino: input.cliente.direccion,
        peso_bruto: parseFloat(input.pesoBruto),
        total_bultos: parseInt(input.totalBultos, 10),
        detalle: input.detalle
      };
      
      const { error: minErr } = await supabase.from('guias_remision').insert([minimalPayload]);
      if (minErr) {
        console.error("Inserción falló por completo:", minErr.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error("Error al guardar guía en base de datos:", err);
    return false;
  }
}
