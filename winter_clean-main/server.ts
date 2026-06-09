import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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

  // API route to proxy the Visioner7 DNI/RUC lookups safely and bypass CORS/proxy issues
  app.get("/api/consultar-doc", async (req, res) => {
    try {
      const { docType, number, apiToken } = req.query;

      if (!docType || !number) {
        return res.status(400).json({ error: "Faltan parámetros requeridos: docType o number" });
      }

      // Extraer dinámicamente credenciales si se configuraron en formato 'email:password' en el frontend
      let customEmail = "";
      let customPassword = "";
      if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
        const parts = apiToken.split(':');
        customEmail = parts[0];
        customPassword = parts.slice(1).join(':');
      }

      // Obtener el token de acceso JWT para la API de Visioner7
      let token: string;
      try {
        token = await getVisionerToken(customEmail, customPassword);
      } catch (authError: any) {
        return res.status(401).json({ error: `Fallo de autenticación: ${authError.message}. Por favor verifique sus credenciales.` });
      }

      // Construcción del endpoint correcto de consulta
      let targetUrl = "";
      if (docType === 'DNI') {
        targetUrl = `https://service1.visioner7-api.com/api/sunatv1/consultar-personas/${number}`;
      } else {
        // RUC: tipo_consulta = 1 (Domicilio fiscal obligatorio según la solicitud)
        targetUrl = `https://service1.visioner7-api.com/api/sunatv1/locales-establecimientos/${number}/1`;
      }

      console.log(`[Proxy Server] Consultando ${docType} ${number} en Visioner7 API...`);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `La API de Visioner7 devolvió un estado incorrecto (HTTP ${response.status}) al consultar ${docType}` });
      }

      const rawData = (await response.json()) as any;
      
      // Buscar información útil en la respuesta (Visioner7 usualmente devuelve el objeto en la raíz, o en data/result)
      const srcData = rawData.data || rawData.result || rawData;

      if (!srcData) {
        return res.status(404).json({ error: "No se encontraron datos en la respuesta de la API" });
      }

      // Normalización inteligente para garantizar retrocompatibilidad total con la lógica del frontend:
      let normalizedData: any = {};

      if (docType === 'DNI') {
        const nombresCompletoStr = srcData.full_name || srcData.nombre_completo || srcData.nombreCompleto || srcData.nombres || "";
        const apPaterno = srcData.apellidoPaterno || srcData.apellido_paterno || srcData.first_last_name || "";
        const apMaterno = srcData.second_last_name || srcData.apellidoMaterno || srcData.apellido_materno || "";
        
        let calculatedFullName = nombresCompletoStr;
        if (apPaterno || apMaterno) {
          calculatedFullName = `${nombresCompletoStr} ${apPaterno} ${apMaterno}`.replace(/\s+/g, ' ').trim();
        }

        normalizedData = {
          full_name: calculatedFullName || `DNI ${number}`,
          first_name: srcData.first_name || srcData.nombres || nombresCompletoStr,
          first_last_name: apPaterno,
          second_last_name: apMaterno,
          document_number: srcData.document_number || srcData.numeroDocumento || srcData.numero || srcData.dni || number,
          ...srcData
        };
      } else {
        // En consulta de RUC de locales-establecimientos, los campos de dirección de Visioner7
        const rName = srcData.razon_social || srcData.razonSocial || srcData.nombre_comercial || srcData.nombreComercial || srcData.nombre || `EMPRESA ${number}`;
        const dir = srcData.direccion || srcData.direccion_completa || srcData.direccionCompleta || srcData.domicilio_fiscal || srcData.domicilioFiscal || "";
        
        normalizedData = {
          ruc: srcData.ruc || srcData.numeroDocumento || srcData.numero || number,
          razon_social: rName,
          estado: srcData.estado || srcData.estadoContribuyente || srcData.status || "ACTIVO",
          condicion: srcData.condicion || srcData.condicionContribuyente || srcData.condition || "HABIDO",
          direccion: dir,
          ubigeo: srcData.ubigeo || srcData.codigoUbigeo || srcData.codigo_ubigeo || "",
          departamento: srcData.departamento || "",
          provincia: srcData.provincia || "",
          distrito: srcData.distrito || "",
          ...srcData
        };
      }

      // Responder con estructura normalizada compatible con el frontend actual
      return res.json({
        success: true,
        data: normalizedData
      });

    } catch (error: any) {
      console.error("[Proxy Server] Error al consultar documento:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor" });
    }
  });

  // API route to proxy the CPE (Boletas/Facturas/Notas de Crédito) generation to Visioner7
  app.post("/api/v1/sunat/generar-cpe", async (req, res) => {
    try {
      const apiToken = req.query.apiToken || req.headers['authorization']?.replace('Bearer ', '');
      
      let customEmail = "";
      let customPassword = "";
      if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
        const parts = apiToken.split(':');
        customEmail = parts[0];
        customPassword = parts.slice(1).join(':');
      }

      // Obtener el token de acceso JWT para la API de Visioner7
      let token: string;
      try {
        token = await getVisionerToken(customEmail, customPassword);
      } catch (authError: any) {
        return res.status(401).json({ error: `Fallo de autenticación: ${authError.message}. Por favor verifique sus credenciales.` });
      }

      const targetUrl = "https://service1.visioner7-api.com/api/v1/sunat/generar-cpe";
      console.log(`[Proxy Server] Generando CPE en Visioner7 API...`, req.body?.txtNRO_COMPROBANTE);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const rawData = await response.json();
      console.log(`[Proxy Server] Respuesta de emisión CPE:`, rawData);

      if (!response.ok) {
        return res.status(response.status).json(rawData);
      }

      return res.json(rawData);

    } catch (error: any) {
      console.error("[Proxy Server] Error al generar CPE:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor al procesar el comprobante" });
    }
  });

  // API route to proxy the Guías de Remisión Remitente generation to Visioner7
  app.post("/api/v1/sunat/guia-remision", async (req, res) => {
    try {
      const apiToken = req.query.apiToken || req.headers['authorization']?.replace('Bearer ', '');
      
      let customEmail = "";
      let customPassword = "";
      if (apiToken && typeof apiToken === 'string' && apiToken.includes(':')) {
        const parts = apiToken.split(':');
        customEmail = parts[0];
        customPassword = parts.slice(1).join(':');
      }

      // Obtener el token de acceso JWT para la API de Visioner7
      let token: string;
      try {
        token = await getVisionerToken(customEmail, customPassword);
      } catch (authError: any) {
        return res.status(401).json({ error: `Fallo de autenticación: ${authError.message}. Por favor verifique sus credenciales.` });
      }

      const targetUrl = "https://service1.visioner7-api.com/api/v1/sunat/guia-remision";
      console.log(`[Proxy Server] Generando Guía de Remisión en Visioner7 API...`, req.body?.NRO_COMPROBANTE);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const rawData = await response.json();
      console.log(`[Proxy Server] Respuesta de emisión de Guía:`, rawData);

      if (!response.ok) {
        return res.status(response.status).json(rawData);
      }

      return res.json(rawData);

    } catch (error: any) {
      console.error("[Proxy Server] Error al generar Guía de Remisión:", error);
      return res.status(500).json({ error: error.message || "Error interno del servidor al procesar la guía de remisión" });
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
