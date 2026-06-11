import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Helper de búsqueda recursivo e insensitivo a mayúsculas para mapear respuestas de API
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
  
  // Comparación insensitiva directa (limpiando caracteres que no sean alfanuméricos)
  const cleanedKeys = keysToFind.map(cleanKey);
  for (const key of Object.keys(obj)) {
    if (cleanedKeys.includes(cleanKey(key))) {
      const val = obj[key];
      if (val !== undefined && val !== null && val !== "") {
        return val;
      }
    }
  }
  
  // Búsqueda recursiva en subobjetos
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // Cache de token para Visioner7 para evitar logins redundantes y optimizar costos
  let cachedVisionerToken: string | null = null;
  let cachedVisionerCredentials = "";

  async function getVisionerToken(emailInput?: string, passwordInput?: string): Promise<string> {
    // Buscar credenciales por orden de prioridad: 
    // 1. Parámetros explícitos pasados (extraídos de la UI)
    // 2. Variables de entorno globales del sistema
    const email = emailInput || process.env.VISIONER7_EMAIL || "USUARIO_API";
    const password = passwordInput || process.env.VISIONER7_PASSWORD || "CLAVE_API";
    
    const credsKey = `${email}:${password}`;
    if (cachedVisionerToken && cachedVisionerCredentials === credsKey) {
      return cachedVisionerToken;
    }

    console.log(`[Visioner7 Auth] Iniciando sesión para obtener token de consulta para: ${email}`);
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
        throw new Error("La respuesta de autenticación de Visioner7 no contiene el token necesario.");
      }

      cachedVisionerToken = data.token;
      cachedVisionerCredentials = credsKey;
      return data.token;
    } catch (err: any) {
      console.error("[Visioner7 Auth Error] Falló el login de la API de consulta:", err.message);
      throw err;
    }
  }

  // API route to proxy electronic invoice/ticket generation (generar-cpe) to Visioner7 safely
  app.post("/api/v1/sunat/generar-cpe", async (req, res) => {
    try {
      const { apiToken } = req.query;
      let token = "";
      let tokenSource = "";

      if (apiToken && typeof apiToken === 'string' && apiToken.startsWith('eyJ') && apiToken.split('.').length === 3) {
        token = apiToken;
        tokenSource = "JWT directo del cliente (pestaña Settings)";
      } else {
        let emailInput = "";
        let passwordInput = "";
        if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
          const parts = apiToken.split(':');
          emailInput = parts[0];
          passwordInput = parts.slice(1).join(':');
        }
        tokenSource = `Autenticación automática VisionerLogin para ${emailInput || "USUARIO_DEFAULTS"}`;
        token = await getVisionerToken(emailInput, passwordInput);
      }

      const payload = req.body;

      // Log parsed payload (hide sensitive passwords)
      const safePayload = { ...payload };
      if (safePayload.txtPASS_SOL_EMPRESA) safePayload.txtPASS_SOL_EMPRESA = "****";
      if (safePayload.txtCONTRA) safePayload.txtCONTRA = "****";
      if (safePayload.txtPAS_FIRMA) safePayload.txtPAS_FIRMA = "****";
      
      console.log(`[Proxy CPE] ---------------------------------------------`);
      console.log(`[Proxy CPE] Generando CPE con Origen del Token: ${tokenSource}`);
      console.log(`[Proxy CPE] Token JWT que se enviará en Header: ${token.substring(0, 15)}...${token.substring(token.length - 15)} (Longitud: ${token.length})`);
      console.log(`[Proxy CPE] Payload enviado a Visioner7:`, JSON.stringify(safePayload, null, 2));

      const response = await fetch("https://service1.visioner7-api.com/api/v1/sunat/generar-cpe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      console.log(`[Proxy CPE] Respuesta cruda de Visioner7 recibida con estado ${response.status}:`, rawText);
      console.log(`[Proxy CPE] ---------------------------------------------`);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        data = { error: "No JSON response", rawText };
      }

      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[Proxy CPE] Error al generar CPE:", error);
      return res.status(500).json({ error: error.message || "Error interno al enviar CPE" });
    }
  });

  // API route to proxy Guia de Remisión (guia-remision) to Visioner7 safely
  app.post("/api/v1/sunat/guia-remision", async (req, res) => {
    try {
      const { apiToken } = req.query;
      let token = "";
      let tokenSource = "";

      if (apiToken && typeof apiToken === 'string' && apiToken.startsWith('eyJ') && apiToken.split('.').length === 3) {
        token = apiToken;
        tokenSource = "JWT directo del cliente (pestaña Settings)";
      } else {
        let emailInput = "";
        let passwordInput = "";
        if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
          const parts = apiToken.split(':');
          emailInput = parts[0];
          passwordInput = parts.slice(1).join(':');
        }
        tokenSource = `Autenticación automática VisionerLogin para ${emailInput || "USUARIO_DEFAULTS"}`;
        token = await getVisionerToken(emailInput, passwordInput);
      }
      const payload = req.body;

      // Log parsed payload (hide sensitive passwords)
      const safePayload = { ...payload };
      if (safePayload.PASS_SOL_EMPRESA) safePayload.PASS_SOL_EMPRESA = "****";
      if (safePayload.PAS_FIRMA) safePayload.PAS_FIRMA = "****";
      if (safePayload.CLAVE_TOKEN) safePayload.CLAVE_TOKEN = "****";
      
      console.log(`[Proxy Guia] ---------------------------------------------`);
      console.log(`[Proxy Guia] Generando Guía con Origen del Token: ${tokenSource}`);
      console.log(`[Proxy Guia] Token JWT que se enviará en Header: ${token.substring(0, 15)}...${token.substring(token.length - 15)} (Longitud: ${token.length})`);
      console.log(`[Proxy Guia] Payload de Guía de Remisión enviado a Visioner7:`, JSON.stringify(safePayload, null, 2));

      const response = await fetch("https://service1.visioner7-api.com/api/v1/sunat/guia-remision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      console.log(`[Proxy Guia] Respuesta cruda de Visioner7 recibida con estado ${response.status}:`, rawText);
      console.log(`[Proxy Guia] ---------------------------------------------`);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        data = { error: "No JSON response", rawText };
      }

      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("[Proxy Guia] Error al generar Guía de Remisión:", error);
      return res.status(500).json({ error: error.message || "Error interno al enviar Guía de Remisión" });
    }
  });

  // API route to proxy the Visioner7 DNI/RUC lookups safely and bypass CORS/proxy issues
  app.get("/api/consultar-doc", async (req, res) => {
    try {
      const docType = typeof req.query.docType === 'string' ? req.query.docType : String(req.query.docType || '');
      const number = typeof req.query.number === 'string' ? req.query.number : String(req.query.number || '');
      const apiToken = req.query.apiToken;

      if (!docType || !number) {
        return res.status(400).json({ error: "Faltan parámetros requeridos: docType o number" });
      }

      // Obtener el token de acceso JWT para la API de Visioner7 o usar el del query directamente si ya es JWT
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
          return res.status(401).json({ error: `Fallo de autenticación: ${authError.message}. Por favor verifique sus credenciales.` });
        }
      }

      // Construcción del endpoint correcto de consulta
      let targetUrl = "";
      if (docType === 'DNI') {
        targetUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-personas/${number}`;
      } else {
        // RUC: tipo_consulta = 1 (Domicilio fiscal obligatorio según la solicitud)
        targetUrl = `https://service1.visioner7-api.com/api/sunatv1/locales-establecimientos/${number}/1`;
      }

      console.log(`[Proxy Server] ---------------------------------------------`);
      console.log(`[Proxy Server] Consultando ${docType} ${number} en Visioner7 API...`);
      console.log(`[Proxy Server] Origen del Token: ${tokenSource}`);
      console.log(`[Proxy Server] Token JWT que se enviará en Header: ${token.substring(0, 15)}...${token.substring(token.length - 15)} (Longitud: ${token.length})`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[Proxy Server] Visioner7 de volvió HTTP ${response.status}`);
        return res.status(response.status).json({ error: `La API de Visioner7 devolvió un estado incorrecto (HTTP ${response.status}) al consultar ${docType}` });
      }

      const rawData = (await response.json()) as any;
      console.log(`[Proxy Server] RESPUESTA ORIGINAL de Visioner7 API para DNI/RUC ${number}:`, JSON.stringify(rawData));
      
      // Escribir a un archivo para inspección directa
      try {
        const fs = await import('fs');
        const debugInfo = {
          timestamp: new Date().toISOString(),
          docType,
          number,
          rawData
        };
        fs.writeFileSync(path.join(process.cwd(), 'api_debug.json'), JSON.stringify(debugInfo, null, 2), 'utf8');
        console.log("[Proxy Server] api_debug.json guardado con éxito.");
      } catch (fsErr: any) {
        console.error("Error writing debug file:", fsErr.message);
      }
      
      // Buscar información útil en la respuesta (Visioner7 usualmente devuelve el objeto en la raíz, o en data/result)
      const srcData = rawData.data || rawData.result || rawData;

      if (!srcData) {
        console.warn(`[Proxy Server] No se pudo encontrar un objeto de datos válido en la respuesta.`);
        return res.status(404).json({ error: "No se encontraron datos en la respuesta de la API" });
      }

      // Normalización inteligente ultrasensible para garantizar retrocompatibilidad total con la lógica del frontend:
      let normalizedData: any = {};

      const extractedNum = findValueByKey(rawData, ['document_number', 'documentNumber', 'numeroDocumento', 'numero_documento', 'numero', 'dni', 'ruc', 'num_doc']) || number;
      const extractedStatus = findValueByKey(rawData, ['estado', 'estadoContribuyente', 'estado_contribuyente', 'status', 'estado_del_contribuyente', 'estadoContribuyenteDescr']) || "ACTIVO";
      const extractedCondition = findValueByKey(rawData, ['condicion', 'condicionContribuyente', 'condicion_contribuyente', 'condition', 'condicion_del_contribuyente', 'condicionContribuyenteDescr']) || "HABIDO";

      if (docType === 'DNI') {
        const nombresCompletoStr = findValueByKey(rawData, ['nomPerNat', 'full_name', 'fullname', 'nombre_completo', 'nombreCompleto', 'nombres', 'nombre']) || "";
        const apPaterno = findValueByKey(rawData, ['apePaterno', 'first_last_name', 'apellido_paterno', 'apellidoPaterno', 'firstLastName', 'ap_paterno', 'apellido_pat']) || "";
        const apMaterno = findValueByKey(rawData, ['apeMaterno', 'second_last_name', 'apellido_materno', 'apellidoMaterno', 'secondLastName', 'ap_materno', 'apellido_mat']) || "";
        const dir = findValueByKey(rawData, ['desDir', 'direccion', 'direccion_completa', 'direccionCompleta', 'domicilio_fiscal', 'domicilioFiscal', 'domicilio', 'dir']) || "";
        const ubg = findValueByKey(rawData, ['codUbigeo', 'ubigeo', 'cod_ubigeo', 'codigoUbigeo', 'codigo_ubigeo', 'ubigeo_sunat', 'ubg']) || "";

        // Si nombresCompletoStr son solo los nombres de pila de la persona (ej. "OSNAR JHON")
        // y tenemos los apellidos ("OBREGON", "VIDAL"), construimos el nombre completo en formato estándar de Perú: APELLIDOS NOMBRES
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

        // Intento de decodificar ubigeo para DNI
        let dep = "";
        let prov = "";
        let dist = "";
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
          provincia: prov,
          distrito: dist
        };
      } else {
        // RUC: Obtener información del domicilio fiscal y datos geográficos
        const domicilioFiscalArray = rawData.domiciliofiscal || findValueByKey(rawData, ['domiciliofiscal', 'locales', 'establecimientos', 'domicilio_fiscal']);
        let firstEstab: any = {};
        if (Array.isArray(domicilioFiscalArray) && domicilioFiscalArray.length > 0) {
          firstEstab = domicilioFiscalArray[0] || {};
        }

        // 1. Obtención inteligente y con fallbacks de la Razón Social / Nombre Completo
        let rName = "";

        // Si empieza con 10, es persona natural con negocio: consultar DNI para obtener nombre correcto
        if (number.startsWith("10") && number.length === 11) {
          const dni = number.substring(2, 10);
          console.log(`[Proxy Server] RUC Persona Natural (${number}). Consultando DNI ${dni} para nombre completo...`);
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
              const nombres = findValueByKey(dniData, ['nomPerNat', 'full_name', 'fullname', 'nombre_completo', 'nombreCompleto', 'nombres', 'nombre']) || "";
              const paterno = findValueByKey(dniData, ['apePaterno', 'first_last_name', 'apellido_paterno', 'apellidoPaterno', 'firstLastName', 'ap_paterno', 'apellido_pat']) || "";
              const materno = findValueByKey(dniData, ['apeMaterno', 'second_last_name', 'apellido_materno', 'apellidoMaterno', 'secondLastName', 'ap_materno', 'apellido_mat']) || "";
              
              if (paterno || materno) {
                rName = `${paterno} ${paterno.toLowerCase().includes(materno.toLowerCase()) ? '' : materno} ${nombres}`.replace(/\s+/g, ' ').trim().toUpperCase();
              } else {
                rName = nombres.toUpperCase();
              }
            }
          } catch (dniErr: any) {
            console.error("[Proxy Server] Error al intentar obtener nombre de DNI:", dniErr.message);
          }
        }

        // Si no se obtuvo con el DNI o no es de tipo persona natural (o el DNI falló), buscar en la respuesta locales-establecimientos
        if (!rName) {
          rName = findValueByKey(rawData, ['razon_social', 'razonSocial', 'nombre_comercial', 'nombreComercial', 'nombre', 'razon_social_registrado', 'name']) || "";
        }

        // Si sigue sin nombre, intentar consultar-ruc
        if (!rName) {
          console.log(`[Proxy Server] Razón social no encontrada en locales. Intentando consultar-ruc para ${number}...`);
          try {
            const rucUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-ruc/${number}`;
            const rucResponse = await fetch(rucUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (rucResponse.ok) {
              const rucData = await rucResponse.json();
              rName = findValueByKey(rucData, ['razon_social', 'razonSocial', 'nombre_comercial', 'nombreComercial', 'nombre', 'razon_social_registrado', 'name']) || "";
            }
          } catch (rucErr: any) {
            console.error("[Proxy Server] Falló consulta de RUC general:", rucErr.message);
          }
        }

        // Fallback final
        if (!rName) {
          rName = `EMPRESA ${number}`;
        }

        // 2. Extracción precisa de la dirección y ubigeo sin confundirse con el array principal
        // Para evitar que findValueByKey reconozca todo el array "domiciliofiscal" como el campo "direccion",
        // definimos primero con el valor del primer establecimiento si existe.
        const dir = firstEstab.direccion || findValueByKey(rawData, ['direccion', 'direccion_completa', 'direccionCompleta', 'dir', 'desDir', 'des_dir']) || "";
        const ubg = firstEstab.codUbigeo || findValueByKey(rawData, ['codUbigeo', 'cod_ubigeo', 'ubigeo', 'codigoUbigeo', 'codigo_ubigeo', 'ubigeo_sunat', 'ubg']) || "";
        const dep = firstEstab.descDepar || findValueByKey(rawData, ['descDepar', 'desc_depar', 'departamento', 'department', 'dep', 'nombre_departamento', 'desc_dep']) || "";
        const prov = firstEstab.descProvi || findValueByKey(rawData, ['descProvi', 'desc_provi', 'provincia', 'province', 'prov', 'nombre_provincia', 'desc_prov']) || "";
        const dist = firstEstab.descDistr || findValueByKey(rawData, ['descDistr', 'desc_distr', 'distrito', 'district', 'dist', 'nombre_distrito', 'desc_dist']) || "";
        
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

      console.log(`[Proxy Server] DATOS NORMALIZADOS enviados al cliente:`, JSON.stringify(normalizedData));

      // Responder con estructura normalizada compatible con el frontend actual
      return res.json({
        success: true,
        data: normalizedData,
        debugRawResponse: rawData
      });

    } catch (error: any) {
      console.error("[Proxy Server] Error al consultar documento:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
