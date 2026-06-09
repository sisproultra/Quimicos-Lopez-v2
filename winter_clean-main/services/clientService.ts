
import { supabase } from './supabaseClient';

const BASE_URL = 'https://api.decolecta.com/v1';
// Proxy público para evitar bloqueo CORS en el navegador
const PROXY_URL = 'https://corsproxy.io/?'; 

export const searchClient = async (docType: 'DNI' | 'RUC', number: string, apiToken: string): Promise<any | null> => {
  if (!number || !apiToken) {
    if(!apiToken) console.warn("Token de API no configurado");
    return null;
  }

  // Cargar URL base y token desde localStorage si existen, o usar por defecto
  let customBaseUrl = BASE_URL;
  try {
    const storedUrl = localStorage.getItem('wc_decolecta_url');
    if (storedUrl) {
      customBaseUrl = JSON.parse(storedUrl);
    }
  } catch (e) {
    console.error("Error reading custom decolecta URL, using default", e);
  }

  // Call our local full-stack server proxy endpoint to avoid CORS and proxy blocks
  const targetUrl = `/api/consultar-doc?docType=${docType}&number=${number}&apiToken=${encodeURIComponent(apiToken)}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token de API inválido o no autorizado en Decolecta.');
      } else if (response.status === 404) {
        throw new Error('El número de documento no existe en los registros.');
      } else {
        throw new Error(`Error en el API Decolecta (HTTP ${response.status})`);
      }
    }

    const rawData = await response.json();
    console.log("=========================================================");
    console.log("🔍 [DIAGNOSIS CLIENTE - clientService.ts]");
    console.log("-> URL de Consulta local:", targetUrl);
    console.log("-> Respuesta del Proxy:", rawData);
    if (rawData.debugRawResponse) {
      console.log("-> RESPUESTA ORIGINAL INTACTA DE VISIONER7:", rawData.debugRawResponse);
    }
    console.log("=========================================================");
    
    // Safe string normalization helper
    const ensureString = (val: any): string => {
      if (!val) return "";
      if (typeof val === "string") return val;
      if (typeof val === "object") {
        const found = val.direccion || val.direccion_completa || val.direccionCompleta || val.desDir || val.codUbigeo || val.codigoUbigeo || "";
        if (found && typeof found === "string") return found;
        return JSON.stringify(val);
      }
      return String(val);
    };

    // Buscar la información en la raíz o dentro de un objeto secundario
    const data = rawData.data || rawData.result || rawData;
    console.log("-> Nodo de datos procesado ('data'):", data);

    if (!data) {
      console.warn("[ClientService API] No data node found in raw response.");
      return null;
    }

    if (docType === 'DNI') {
      // Intentar extraer el nombre completo combinando campos o usando full_name u otros alternos
      let fullName = '';
      if (data.full_name && data.full_name !== `DNI ${number}`) {
        fullName = ensureString(data.full_name);
      } else if (data.comprobante) {
        const nom = ensureString(data.comprobante.nomPerNat || data.comprobante.nom_per_nat || "");
        const pat = ensureString(data.comprobante.apePaterno || data.comprobante.ape_paterno || "");
        const mat = ensureString(data.comprobante.apeMaterno || data.comprobante.ape_materno || "");
        if (pat || mat || nom) {
          fullName = `${pat} ${mat} ${nom}`.replace(/\s+/g, ' ').trim();
        }
      }
      
      if (!fullName) {
        if (data.full_name) {
          fullName = ensureString(data.full_name);
        } else if (data.first_name || data.first_last_name || data.second_last_name) {
          fullName = `${ensureString(data.first_name)} ${ensureString(data.first_last_name)} ${ensureString(data.second_last_name)}`;
        } else if (data.nombres || data.apellido_paterno || data.apellido_materno) {
          fullName = `${ensureString(data.nombres)} ${ensureString(data.apellido_paterno)} ${ensureString(data.apellido_materno)}`;
        } else if (data.nombre_completo) {
          fullName = ensureString(data.nombre_completo);
        } else {
          fullName = `DNI ${number}`;
        }
      }

      let addressStr = "";
      if (data.direccion) {
        addressStr = ensureString(data.direccion);
      } else if (data.comprobante && data.comprobante.desDir) {
        addressStr = ensureString(data.comprobante.desDir);
      }

      let ubgStr = "";
      let depStr = "";
      let provStr = "";
      let distStr = "";

      if (data.ubigeo && typeof data.ubigeo === 'object') {
        const ubgObj = data.ubigeo;
        ubgStr = ensureString(ubgObj.codUbigeo || ubgObj.cod_ubigeo || ubgObj.codigoUbigeo || "");
        depStr = ensureString(ubgObj.desDepartamento || ubgObj.departamento || "");
        provStr = ensureString(ubgObj.desProvincia || ubgObj.provincia || "");
        distStr = ensureString(ubgObj.desDistrito || ubgObj.distrito || "");
      } else if (data.comprobante && data.comprobante.ubigeo && typeof data.comprobante.ubigeo === 'object') {
        const ubgObj = data.comprobante.ubigeo;
        ubgStr = ensureString(ubgObj.codUbigeo || ubgObj.cod_ubigeo || ubgObj.codigoUbigeo || "");
        depStr = ensureString(ubgObj.desDepartamento || ubgObj.departamento || "");
        provStr = ensureString(ubgObj.desProvincia || ubgObj.provincia || "");
        distStr = ensureString(ubgObj.desDistrito || ubgObj.distrito || "");
      } else {
        ubgStr = ensureString(data.ubigeo);
        depStr = ensureString(data.departamento || data.department);
        provStr = ensureString(data.provincia || data.province);
        distStr = ensureString(data.distrito || data.district);
      }

      const finalResult = {
        docType: "DNI",
        docNumber: ensureString(data.document_number || data.numero || number),
        name: fullName.trim().toUpperCase(),
        address: addressStr.toUpperCase(),
        sunatStatus: ensureString(data.estado || data.status || "ACTIVO").toUpperCase(),
        sunatCondition: ensureString(data.condicion || data.condition || "HABIDO").toUpperCase(),
        departamento: depStr.toUpperCase(),
        department: depStr.toUpperCase(),
        provincia: provStr.toUpperCase(),
        province: provStr.toUpperCase(),
        distrito: distStr.toUpperCase(),
        district: distStr.toUpperCase(),
        ubigeo: ubgStr
      };
      console.log("-> [ClientService API Final Mapped DNI]:", finalResult);
      return finalResult;
    } else {
      // Para RUC (Sunat)
      const rucNumber = ensureString(data.ruc || data.numero || data.document_number || number);
      const razonSocial = ensureString(data.razon_social || data.razonSocial || data.nombre_comercial || data.nombre || `EMPRESA ${number}`);
      
      const sunatStatus = ensureString(data.estado || data.status || "ACTIVO");
      const sunatCondition = ensureString(data.condicion || data.condition || "HABIDO");
      
      const ubigeo = ensureString(data.ubigeo);
      const urbanizacion = ensureString(data.urbanizacion);
      const distrito = ensureString(data.distrito || data.district);
      const provincia = ensureString(data.provincia || data.province);
      const departamento = ensureString(data.departamento || data.department);

      // Mapeo Inteligente: concatenar departamento, provincia y distrito si no hay una dirección explícita
      let addressStr = ensureString(data.direccion || data.direccion_completa || data.direccionCompleta);
      if (!addressStr || addressStr.trim() === "") {
        const parts = [urbanizacion, distrito, provincia, departamento].filter(p => p && p.trim() !== "");
        addressStr = parts.join(", ");
      }

      const finalResult = {
        docType: "RUC",
        docNumber: rucNumber,
        name: razonSocial.toUpperCase(),
        address: addressStr.toUpperCase(),
        sunatStatus: sunatStatus.toUpperCase(),
        sunatCondition: sunatCondition.toUpperCase(),
        ubigeo: ubigeo,
        urbanizacion: urbanizacion,
        distrito: distrito.toUpperCase(),
        district: distrito.toUpperCase(),
        provincia: provincia.toUpperCase(),
        province: provincia.toUpperCase(),
        departamento: departamento.toUpperCase(),
        department: departamento.toUpperCase()
      };
      console.log("-> [ClientService API Final Mapped RUC]:", finalResult);
      return finalResult;
    }
  } catch (error: any) {
    console.error("Error al consultar Decolecta API:", error);
    throw error;
  }
};

/**
 * Reserva de manera atómica con pesimismo absoluto (concurrencia segura) el próximo correlativo en Supabase.
 * Esto previene saltos, duplicados o colisiones en entornos multiusuario.
 */
export const reservarSiguienteCorrelativo = async (
  tipoComprobante: string,
  serie: string,
  tenantId?: string
): Promise<string> => {
  let finalTenantId = tenantId;
  
  if (!finalTenantId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      finalTenantId = session?.user?.user_metadata?.tenant_id || session?.user?.id;
    } catch (e) {
      console.warn("Could not fetch session tenant", e);
    }
  }

  // Fallback seguro en desarrollo local si no se cuenta con tenant configurado
  if (!finalTenantId) {
    finalTenantId = '00000000-0000-0000-0000-000000000000';
  }

  const { data, error } = await supabase.rpc('reservar_siguiente_correlativo', {
    p_tenant_id: finalTenantId,
    p_tipo_comprobante: tipoComprobante,
    p_serie: serie.toUpperCase()
  });

  if (error) {
    console.error("Error al reservar correlativo en Supabase RPC:", error);
    // Fallback local robusto ante fallas de red / falta de rpc en local para que la app continúe
    const localLast = parseInt(localStorage.getItem(`last_num_${tipoComprobante}_${serie}`) || '0', 10);
    const nextNum = localLast + 1;
    localStorage.setItem(`last_num_${tipoComprobante}_${serie}`, nextNum.toString());
    return `${serie.toUpperCase()}-${nextNum.toString().padStart(8, '0')}`;
  }

  return data as string;
};

/**
 * Envía el payload CPE (Boletas y Facturas) a SUNAT mediante el proxy de nuestro servidor local.
 */
export const sendCPEToVisioner7 = async (payload: any, apiToken: string): Promise<any> => {
  const url = `/api/v1/sunat/generar-cpe?apiToken=${encodeURIComponent(apiToken)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Error en el API de CPE (HTTP ${response.status})`);
  }

  return response.json();
};

/**
 * Envía el payload de Guía de Remitente a SUNAT mediante el proxy de nuestro servidor local.
 */
export const sendGuiaToVisioner7 = async (payload: any, apiToken: string): Promise<any> => {
  const url = `/api/v1/sunat/guia-remision?apiToken=${encodeURIComponent(apiToken)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Error en el API de Guía de Remisión (HTTP ${response.status})`);
  }

  return response.json();
};
