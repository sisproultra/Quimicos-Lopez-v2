import type { VercelRequest, VercelResponse } from '@vercel/node';

function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findValueByKey(obj: any, keysToFind: string[]): any {
  if (!obj) return undefined;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const val = findValueByKey(item, keysToFind);
      if (val !== undefined && val !== null && val !== "") {
        return val;
      }
    }
    return undefined;
  }
  
  if (typeof obj !== "object") return undefined;
  
  const cleanedKeys = keysToFind.map(cleanKey);
  for (const key of Object.keys(obj)) {
    if (cleanedKeys.includes(cleanKey(key))) {
      const val = obj[key];
      if (val !== undefined && val !== null && val !== "") {
        return val;
      }
    }
  }
  
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object") {
      const found = findValueByKey(val, keysToFind);
      if (found !== undefined && found !== null && found !== "") {
        return found;
      }
    }
  }
  return undefined;
}

let cachedVisionerToken: string | null = null;
let cachedVisionerCredentials = "";

async function getVisionerToken(emailInput?: string, passwordInput?: string): Promise<string> {
  const email = emailInput || process.env.VISIONER7_EMAIL || "USUARIO_API";
  const password = passwordInput || process.env.VISIONER7_PASSWORD || "CLAVE_API";
  
  const credsKey = `${email}:${password}`;
  if (cachedVisionerToken && cachedVisionerCredentials === credsKey) {
    return cachedVisionerToken;
  }

  console.log(`[Vercel Auth] Logging in to get token: ${email}`);
  try {
    const response = await fetch("https://service1.visioner7-api.com/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Credenciales incorrectas o API no disponible (HTTP ${response.status})`);
    }

    const data = (await response.json()) as any;
    if (!data || !data.token) {
      throw new Error("El token de Visioner7 no se encuentra en la respuesta.");
    }

    cachedVisionerToken = data.token;
    cachedVisionerCredentials = credsKey;
    return data.token;
  } catch (err: any) {
    console.error("[Vercel Auth Error] Login falló:", err.message);
    throw err;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const docType = req.query.docType as string;
    const number = req.query.number as string;
    const apiToken = req.query.apiToken as string;

    if (!docType || !number) {
      return res.status(400).json({ error: "Faltan parámetros requeridos: docType o number" });
    }

    // Obtener el token JWT
    let token = "";
    let tokenSource = "";
    if (apiToken && typeof apiToken === 'string' && apiToken.startsWith('eyJ') && apiToken.split('.').length === 3) {
      token = apiToken;
      tokenSource = "JWT directo del cliente (pestaña Settings)";
    } else {
      let customEmail = "";
      let customPassword = "";
      if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
        const parts = apiToken.split(':');
        customEmail = parts[0];
        customPassword = parts.slice(1).join(':');
      }
      tokenSource = `Autenticación automática VisionerLogin para ${customEmail || "USUARIO_DEFAULTS"}`;
      try {
        token = await getVisionerToken(customEmail, customPassword);
      } catch (authError: any) {
        return res.status(401).json({ error: `Fallo de autenticación: ${authError.message}` });
      }
    }

    // Construcción del endpoint
    let targetUrl = "";
    if (docType === 'DNI') {
      targetUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-personas/${number}`;
    } else {
      targetUrl = `https://service1.visioner7-api.com/api/sunatv1/locales-establecimientos/${number}/1`;
    }

    console.log(`[Proxy Vercel] Consultando ${docType} ${number}...`);
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[Proxy Vercel] Visioner7 devolvió un error (HTTP ${response.status})`);
      return res.status(response.status).json({ error: `La API de Visioner7 devolvió código ${response.status}` });
    }

    const rawData = (await response.json()) as any;
    const srcData = rawData.data || rawData.result || rawData;

    if (!srcData) {
      return res.status(404).json({ error: "No se encontraron datos en la respuesta de la API" });
    }

    let normalizedData: any = {};
    const extractedNum = findValueByKey(rawData, ['document_number', 'documentNumber', 'numeroDocumento', 'numero_documento', 'numero', 'dni', 'ruc', 'num_doc']) || number;
    const extractedStatus = findValueByKey(rawData, ['estado', 'estado_contribuyente', 'status']) || "ACTIVO";
    const extractedCondition = findValueByKey(rawData, ['condicion', 'condicion_contribuyente', 'condition']) || "HABIDO";

    if (docType === 'DNI') {
      const nombresCompletoStr = findValueByKey(rawData, ['nomPerNat', 'full_name', 'fullname', 'nombre_completo', 'nombres', 'nombre']) || "";
      const apPaterno = findValueByKey(rawData, ['apePaterno', 'first_last_name', 'apellido_paterno', 'apellidoPaterno']) || "";
      const apMaterno = findValueByKey(rawData, ['apeMaterno', 'second_last_name', 'apellido_materno', 'apellidoMaterno']) || "";
      const dir = findValueByKey(rawData, ['desDir', 'direccion', 'direccion_completa', 'direccionCompleta', 'domicilio_fiscal']) || "";
      const ubg = findValueByKey(rawData, ['codUbigeo', 'ubigeo', 'cod_ubigeo', 'codigoUbigeo']) || "";

      let calculatedFullName = nombresCompletoStr;
      if (apPaterno || apMaterno) {
        const hasPaterno = apPaterno && nombresCompletoStr.toLowerCase().includes(apPaterno.toLowerCase());
        const hasMaterno = apMaterno && nombresCompletoStr.toLowerCase().includes(apMaterno.toLowerCase());
        if (hasPaterno && hasMaterno) {
          calculatedFullName = nombresCompletoStr;
        } else {
          calculatedFullName = `${apPaterno} ${apMaterno} ${nombresCompletoStr}`.replace(/\s+/g, ' ').trim();
        }
      }

      let dep = "";
      if (ubg && typeof ubg === 'string' && ubg.length >= 2) {
        const DEPARTAMENTOS: Record<string, string> = {
          "01": "AMAZONAS", "02": "ANCASH", "03": "APURIMAC", "04": "AREQUIPA", "05": "AYACUCHO",
          "06": "CAJAMARCA", "07": "CALLAO", "08": "CUSCO", "09": "HUANCAVELICA", "10": "HUANUCO",
          "11": "ICA", "12": "JUNIN", "13": "LA LIBERTAD", "14": "LAMBAYEQUE", "15": "LIMA",
          "16": "LORETO", "17": "MADRE DE DIOS", "18": "MOQUEGUA", "19": "PASCO", "20": "PIURA",
          "21": "PUNO", "22": "SAN MARTIN", "23": "TACNA", "24": "TUMBES", "25": "UCAYALI"
        };
        dep = DEPARTAMENTOS[ubg.substring(0, 2)] || "";
      }

      normalizedData = {
        ...srcData,
        full_name: calculatedFullName || nombresCompletoStr || `DNI ${number}`,
        first_name: nombresCompletoStr,
        first_last_name: apPaterno,
        second_last_name: apMaterno,
        document_number: extractedNum,
        estado: extractedStatus,
        condicion: extractedCondition,
        direccion: dir,
        ubigeo: ubg,
        departamento: dep,
        provincia: "",
        distrito: ""
      };
    } else {
      // RUC
      const domicilioFiscalArray = rawData.domiciliofiscal || findValueByKey(rawData, ['domiciliofiscal', 'locales', 'establecimientos', 'domicilio_fiscal']);
      let firstEstab: any = {};
      if (Array.isArray(domicilioFiscalArray) && domicilioFiscalArray.length > 0) {
        firstEstab = domicilioFiscalArray[0] || {};
      }

      let rName = "";
      if (number.startsWith("10") && number.length === 11) {
        const dni = number.substring(2, 10);
        try {
          const dniUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-personas/${dni}`;
          const dniResponse = await fetch(dniUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (dniResponse.ok) {
            const dniData = await dniResponse.json();
            const nombres = findValueByKey(dniData, ['nomPerNat', 'full_name', 'fullname', 'nombre_completo', 'nombres', 'nombre']) || "";
            const paterno = findValueByKey(dniData, ['apePaterno', 'first_last_name', 'apellido_paterno', 'apellidoPaterno']) || "";
            const materno = findValueByKey(dniData, ['apeMaterno', 'second_last_name', 'apellido_materno', 'apellidoMaterno']) || "";
            if (paterno || materno) {
              rName = `${paterno} ${paterno.toLowerCase().includes(materno.toLowerCase()) ? '' : materno} ${nombres}`.replace(/\s+/g, ' ').trim().toUpperCase();
            } else {
              rName = nombres.toUpperCase();
            }
          }
        } catch (dniErr: any) {
          console.error("Error fetching name for Natural Person RUC:", dniErr.message);
        }
      }

      if (!rName) {
        rName = findValueByKey(rawData, ['razon_social', 'razonSocial', 'nombre_comercial', 'nombre', 'name']) || "";
      }

      if (!rName) {
        try {
          const rucUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-ruc/${number}`;
          const rucResponse = await fetch(rucUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (rucResponse.ok) {
            const rucData = await rucResponse.json();
            rName = findValueByKey(rucData, ['razon_social', 'razonSocial', 'nombre_comercial', 'nombre', 'name']) || "";
          }
        } catch (rucErr: any) {
          console.error("RUC general fallback request failed:", rucErr.message);
        }
      }

      if (!rName) {
        rName = `EMPRESA ${number}`;
      }

      const dir = firstEstab.direccion || findValueByKey(rawData, ['direccion', 'direccion_completa', 'direccionCompleta', 'dir']) || "";
      const ubg = firstEstab.codUbigeo || findValueByKey(rawData, ['codUbigeo', 'cod_ubigeo', 'ubigeo']) || "";
      const dep = firstEstab.descDepar || findValueByKey(rawData, ['descDepar', 'departamento', 'department']) || "";
      const prov = firstEstab.descProvi || findValueByKey(rawData, ['descProvi', 'provincia', 'province']) || "";
      const dist = firstEstab.descDistr || findValueByKey(rawData, ['descDistr', 'distrito', 'district']) || "";

      normalizedData = {
        ...srcData,
        ruc: extractedNum,
        razon_social: rName,
        estado: extractedStatus,
        condicion: extractedCondition,
        direccion: dir,
        ubigeo: ubg,
        departamento: dep,
        provincia: prov,
        distrito: dist
      };
    }

    return res.status(200).json({
      success: true,
      data: normalizedData
    });

  } catch (error: any) {
    console.error("Error en consultar-doc serverless:", error);
    return res.status(500).json({ error: error.message || "Error interno de consulta" });
  }
}
