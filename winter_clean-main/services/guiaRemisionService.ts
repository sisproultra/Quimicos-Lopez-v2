import { supabase } from './supabaseClient';

export type ModalidadTraslado = 'PUBLICA' | 'PRIVADA';

export interface GuiaDetalle {
  item: string;
  orderItem?: string;
  unidadMedida: string;
  cantidad: string;
  descripcion: string;
  codigo: string;
}

export interface DatosRepartidor {
  nroDoc: string;
  nombres: string;
  apellidos: string;
  licConducir: string;
  placa: string;
}

export interface DatosChofer {
  tipoDoc: string;
  nroDoc: string;
  nombres: string;
  apellidos: string;
  licConducir: string;
}

export interface DatosCliente {
  tipoDocumento: string;
  nroDocumento: string;
  razonSocial: string;
  ubigeo: string;
  direccion: string;
}

export interface GuiaRemisionInput {
  modalidad: ModalidadTraslado;
  nroComprobante: string; // T001-00000001
  nroComprobanteRef?: string; // boleta/factura vinculada
  fechaDocumento: string; // YYYY-MM-DD
  fechaInicio: string; // YYYY-MM-DD
  nota: string;
  pesoBruto: string;
  totalBultos: string;
  cliente: DatosCliente;
  repartidor?: DatosRepartidor; // solo PRIVADA
  placaVehiculo?: string;
  chofer?: DatosChofer;
  detalle: GuiaDetalle[];
}

export interface GuiaRemisionResponse {
  archivo: string;
  cod_sunat: string;
  msj_sunat: string;
  hash_cdr: string;
}

// Company interface matching the user specifications
export interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  ubigeo: string;
  sol_usuario: string;
  sol_password: string;
  pfx_password: string;
  visioner7_token: string;
  visioner7_clave: string;
}

export function buildGuiaPayload(input: GuiaRemisionInput, company: Company): Record<string, any> {
  const isPrivada = input.modalidad === 'PRIVADA';

  let placa = '';
  let choferDocVal = '';
  let choferNombresVal = '';
  let choferApellidosVal = '';
  let choferLicenciaVal = '';
  let choferTipoDoc = '1'; // DNI por defecto

  if (isPrivada) {
    if (input.repartidor) {
      placa = input.repartidor.placa;
      choferDocVal = input.repartidor.nroDoc;
      choferNombresVal = input.repartidor.nombres;
      choferApellidosVal = input.repartidor.apellidos;
      choferLicenciaVal = input.repartidor.licConducir;
      choferTipoDoc = '1';
    } else if (input.chofer) {
      placa = input.placaVehiculo || '';
      choferDocVal = input.chofer.nroDoc;
      choferNombresVal = input.chofer.nombres;
      choferApellidosVal = input.chofer.apellidos;
      choferLicenciaVal = input.chofer.licConducir;
      choferTipoDoc = input.chofer.tipoDoc || '1';
    } else {
      throw new Error("Datos del repartidor o chofer requeridos para modalidad PRIVADA.");
    }

    if (!placa) {
      throw new Error("La placa del vehículo es requerida para la modalidad PRIVADA.");
    }
    if (!choferDocVal || !choferNombresVal || !choferApellidosVal || !choferLicenciaVal) {
      throw new Error("Todos los campos del repartidor/chofer son requeridos para la modalidad PRIVADA.");
    }
  }

  const payload: Record<string, any> = {
    "TIPO_PROCESO": "1",
    "COD_TIPO_DOCUMENTO": "09",
    "FLG_ANULADO": "0",
    "COD_UND_PESO_BRUTO": "KGM",
    "COD_MOTIVO_TRASLADO": "01",
    "DESCRIPCION_MOTIVO_TRASLADO": "VENTA",
    "ITEM_ENVIO": String(input.detalle.length),
    "NRO_DOCUMENTO_REFERENCIA": input.nroComprobanteRef || "",
    "COD_DOCUMENTO_RELACIODO": "",
    "DOCUMENTO_RELACIODO": "",
    "COD_DOCUMENTO_RELACIODO_EMPRESA": "",
    "NRO_DOCUMENTO_RELACIODO_EMPRESA": "",
    "DOC_REFERENCIA_ANU": "",
    "COD_TIPO_DOC_REFANU": "",

    // Empresa
    "NRO_DOCUMENTO_EMPRESA": company.ruc,
    "TIPO_DOCUMENTO_EMPRESA": "6",
    "RAZON_SOCIAL_EMPRESA": company.razon_social,
    "USUARIO_SOL_EMPRESA": company.sol_usuario || "",
    "PASS_SOL_EMPRESA": company.sol_password || "",
    "PAS_FIRMA": company.pfx_password || "",
    "ID_TOKEN": company.visioner7_token || "",
    "CLAVE_TOKEN": company.visioner7_clave || "",
    "COD_UBIGEO_ORIGEN": company.ubigeo || "150101",
    "DIRECCION_ORIGEN": company.direccion || "AV. PRINCIPAL",

    // Documento
    "NRO_COMPROBANTE": input.nroComprobante,
    "FECHA_DOCUMENTO": input.fechaDocumento,
    "FECHA_INICIO": input.fechaInicio,
    "NOTA": input.nota || "VENTA",
    "PESO_BRUTO": parseFloat(input.pesoBruto).toFixed(2),
    "TOTAL_BULTOS": String(parseInt(input.totalBultos, 10) || 1),

    // Cliente
    "TIPO_DOCUMENTO_CLIENTE": input.cliente.tipoDocumento === 'DNI' ? '1' : input.cliente.tipoDocumento === 'RUC' ? '6' : input.cliente.tipoDocumento,
    "NRO_DOCUMENTO_CLIENTE": input.cliente.nroDocumento,
    "RAZON_SOCIAL_CLIENTE": input.cliente.razonSocial,
    "COD_UBIGEO_DESTINO": input.cliente.ubigeo || "150101",
    "DIRECCION_DESTINO": input.cliente.direccion,

    // Detalle
    "detalle": input.detalle.map((d, index) => ({
      "ITEM": String(index + 1),
      "ORDER_ITEM": String(index + 1),
      "UNIDAD_MEDIDA": d.unidadMedida || "NIU",
      "CANTIDAD": String(parseFloat(d.cantidad)),
      "DESCRIPCION": d.descripcion.toUpperCase(),
      "CODIGO": d.codigo || `ITEM-${index + 1}`
    }))
  };

  if (isPrivada) {
    payload["COD_MODALIDAD_TRASLADO"] = "02";
    payload["PLACA_VEHICULO"] = placa.trim().toUpperCase();
    payload["TIPO_DOCUMENTO_TRANSPORTISTA"] = "6";
    payload["NRO_DOCUMENTO_TRANSPORTISTA"] = company.ruc;
    payload["RAZON_SOCIAL_TRANSPORTISTA"] = company.razon_social;
    payload["COD_TIPO_DOC_CHOFER"] = choferTipoDoc;
    payload["NRO_DOC_CHOFER"] = choferDocVal.trim();
    payload["NOMBRES_CHOFER"] = choferNombresVal.trim().toUpperCase();
    payload["APELLIDOS_CHOFER"] = choferApellidosVal.trim().toUpperCase();
    payload["LIC_CONDUCIR_CHOFER"] = choferLicenciaVal.trim().toUpperCase();
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

export async function sendGuiaRemision(input: GuiaRemisionInput, company: any): Promise<GuiaRemisionResponse> {
  const payload = buildGuiaPayload(input, company);

  console.log("🚚 [Guia Remision] Payload:", JSON.stringify(payload, null, 2));

  const proxyUrl = `/api/sunat-proxy?url=${encodeURIComponent('https://service1.visioner7-api.com/api/v1/sunat/guia-remision')}`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const rawText = await response.text();
    console.log("📦 [Guia Remision] Respuesta raw recibida:", rawText);

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Respuesta inválida del proxy de guías (No es JSON): ${rawText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.details || `Error del proxy de guías (HTTP ${response.status})`);
    }

    const finalRes = data.data || data.result || data;

    const codSunat = String(finalRes.cod_sunat ?? finalRes.codSunat ?? '');
    const msjSunat = String(finalRes.msj_sunat ?? finalRes.msjSunat ?? finalRes.mensaje ?? 'Error desconocido');

    if (codSunat !== "0" && codSunat !== "") {
      throw new Error(`SUNAT rechazó la guía: [Código ${codSunat}] ${msjSunat}`);
    }

    return {
      archivo: finalRes.archivo || finalRes.pdf || finalRes.url_pdf || '',
      cod_sunat: codSunat || "0",
      msj_sunat: msjSunat || 'Aceptada por SUNAT',
      hash_cdr: finalRes.hash_cdr || finalRes.hashCdr || finalRes.hash || ''
    };
  } catch (error: any) {
    console.error("❌ [Guia Remision error] Detalle:", error);
    throw error;
  }
}

export async function getNextCorrelativoGuia(companyId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('guias_remision')
      .select('nro_comprobante')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 'T001-00000001';
    }

    const lastStr = data[0].nro_comprobante || '';
    if (!lastStr) return 'T001-00000001';

    const parts = lastStr.split('-');
    if (parts.length !== 2) return 'T001-00000001';

    const lastSerie = parts[0];
    const lastNum = parseInt(parts[1], 10);
    if (isNaN(lastNum)) return 'T001-00000001';

    const nextNum = String(lastNum + 1).padStart(8, '0');
    return `${lastSerie}-${nextNum}`;
  } catch (err) {
    console.error("Error obteniendo correlativo:", err);
    return 'T001-00000001';
  }
}

export async function saveGuiaToSupabase(input: GuiaRemisionInput, response: GuiaRemisionResponse, tenantId: string): Promise<boolean> {
  const isPrivada = input.modalidad === 'PRIVADA';
  const serie = input.nroComprobante.split('-')[0] || 'T001';
  const numero = input.nroComprobante.split('-')[1] || '00000001';

  let placa = '';
  let choferDocVal = '';
  let choferNombresVal = '';
  let choferApellidosVal = '';
  let choferLicenciaVal = '';

  if (isPrivada) {
    if (input.repartidor) {
      placa = input.repartidor.placa;
      choferDocVal = input.repartidor.nroDoc;
      choferNombresVal = input.repartidor.nombres;
      choferApellidosVal = input.repartidor.apellidos;
      choferLicenciaVal = input.repartidor.licConducir;
    } else if (input.chofer) {
      placa = input.placaVehiculo || '';
      choferDocVal = input.chofer.nroDoc;
      choferNombresVal = input.chofer.nombres;
      choferApellidosVal = input.chofer.apellidos;
      choferLicenciaVal = input.chofer.licConducir;
    }
  }

  const payload: Record<string, any> = {
    company_id: tenantId,
    nro_comprobante: input.nroComprobante,
    nro_comprobante_ref: input.nroComprobanteRef || null,
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
    ubigeo_destino: input.cliente.ubigeo || "150101",
    peso_bruto: parseFloat(input.pesoBruto),
    total_bultos: parseInt(input.totalBultos, 10) || 1,
    repartidor_nombre: isPrivada ? `${choferNombresVal} ${choferApellidosVal}`.trim() : null,
    repartidor_doc: isPrivada ? choferDocVal : null,
    placa_vehiculo: isPrivada ? placa : null,
    detalle: input.detalle
  };

  try {
    const { error } = await supabase.from('guias_remision').insert([payload]);
    if (error) {
      console.error("Falla al insertar guía de remisión en Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error al guardar guía de remisión en base de datos:", err);
    return false;
  }
}
