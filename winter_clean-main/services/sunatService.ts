export interface Company {
  ruc: string;
  razon_social: string;
  sol_usuario: string;
  sol_password: string;
  pfx_password: string;
  visioner7_token: string;
  visioner7_clave: string;
  ubigeo: string;
  direccion: string;
  tipo_documento_empresa?: string; // "6"
}

export interface InvoiceItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  codigoProducto?: string;
  unidadMedida?: string; // (default "NIU")
}

export interface Invoice {
  tipo: '01' | '03'; // '01' = Factura, '03' = Boleta
  serie: string;
  correlativo: number;
  fechaEmision: string;
  cliente: {
    tipoDoc: string;
    nroDoc: string;
    razonSocial: string;
  };
  items: InvoiceItem[];
  formaPago: 'Contado' | 'Credito';
}

export interface SunatResponse {
  archivo: string;
  cod_sunat: string;
  msj_sunat: string;
  hash_cdr: string;
  cdr_data?: string;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularTotales(items: InvoiceItem[], igv = 18) {
  let totalGravadas = 0;
  let totalIgv = 0;

  items.forEach(item => {
    const precioSinIgv = item.precioUnitario / (1 + igv / 100);
    const importeItem = precioSinIgv * item.cantidad;
    const igvItem = (item.precioUnitario - precioSinIgv) * item.cantidad;

    totalGravadas += importeItem;
    totalIgv += igvItem;
  });

  const total = totalGravadas + totalIgv;

  return {
    totalGravadas: round(totalGravadas),
    totalIgv: round(totalIgv),
    total: round(total)
  };
}

export function numeroALetras(num: number): string {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  const entero = Math.floor(num);
  const centavos = Math.round((num - entero) * 100);

  const convertirTresDigitos = (n: number): string => {
    if (n === 0) return "";
    if (n === 100) return "CIEN";

    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    let res = centenas[c];
    if (n % 100 > 0) {
      if (res !== "") res += " ";
      if (d === 1) {
        res += especiales[u];
      } else if (d > 1) {
        res += decenas[d];
        if (u > 0) res += " Y " + unidades[u];
      } else if (u > 0) {
        res += unidades[u];
      }
    }
    return res;
  };

  const suffix = "SOLES";
  if (entero === 0) return `CERO CON ${centavos.toString().padStart(2, '0')}/100 ${suffix}`;

  let palabras = "";
  let temp = entero;

  const millones = Math.floor(temp / 1000000);
  if (millones > 0) {
    if (millones === 1) {
      palabras += "UN MILLON";
    } else {
      palabras += convertirTresDigitos(millones) + " MILLONES";
    }
    temp %= 1000000;
    if (temp > 0) palabras += " ";
  }

  const miles = Math.floor(temp / 1000);
  if (miles > 0) {
    if (miles === 1) {
      palabras += "MIL";
    } else {
      palabras += convertirTresDigitos(miles) + " MIL";
    }
    temp %= 1000;
    if (temp > 0) palabras += " ";
  }

  if (temp > 0) {
    palabras += convertirTresDigitos(temp);
  }

  return `${palabras} CON ${centavos.toString().padStart(2, '0')}/100 ${suffix}`.replace(/\s+/g, ' ').trim();
}

function generarUUID(): string {
  return 'prod-' + Math.random().toString(36).substring(2, 10);
}

export function buildInvoicePayload(invoice: Invoice, company: Company): Record<string, any> {
  const { totalGravadas, totalIgv, total } = calcularTotales(invoice.items);

  const payload: Record<string, any> = {
    txtTIPO_OPERACION: "0101",
    txtCOD_TIPO_DOCUMENTO: invoice.tipo,
    txtNRO_COMPROBANTE: `${invoice.serie}-${String(invoice.correlativo).padStart(8, '0')}`,
    txtFECHA_DOCUMENTO: invoice.fechaEmision,
    txtFECHA_VTO: invoice.fechaEmision,
    txtCOD_MONEDA: "PEN",
    txtTIPO_PROCESO: "1",
    txtTOTAL_GRAVADAS: totalGravadas.toFixed(2),
    txtTOTAL_IGV: totalIgv.toFixed(2),
    txtTOTAL: total.toFixed(2),
    txtTOTAL_LETRAS: numeroALetras(total),
    txtPOR_IGV: "18.00",

    txtTOTAL_EXONERADAS: "0.00",
    txtTOTAL_INATAFECTAS: "0.00",
    txtTOTAL_INAFECTAS: "0.00",
    txtTOTAL_GRATUITAS: "0.00",
    txtTOTAL_PERCEPCIONES: "0.00",
    txtTOTAL_RETENCIONES: "0.00",
    txtTOTAL_DETRACCION: "0.00",
    txtTOTAL_BONIFICACIONES: "0.00",
    txtTOTAL_DESCUENTO: "0.00",
    txtTOTAL_EXPORTACION: "0.00",
    txtTOTAL_ANTICIPOS: "0.00",

    txtNRO_DOCUMENTO_EMPRESA: company.ruc,
    txtTIPO_DOCUMENTO_EMPRESA: "6",
    txtNOMBRE_COMERCIAL_EMPRESA: company.razon_social,
    txtRAZON_SOCIAL_EMPRESA: company.razon_social,
    txtCODIGO_UBIGEO_EMPRESA: company.ubigeo,
    txtDIRECCION_EMPRESA: company.direccion,
    txtUSUARIO_SOL_EMPRESA: company.sol_usuario,
    txtPASS_SOL_EMPRESA: company.sol_password,
    txtCONTRA: company.pfx_password,
    txtPAS_FIRMA: company.pfx_password,

    txtNRO_DOCUMENTO_CLIENTE: invoice.cliente.nroDoc,
    txtTIPO_DOCUMENTO_CLIENTE: invoice.cliente.tipoDoc,
    txtRAZON_SOCIAL_CLIENTE: invoice.cliente.razonSocial,

    detalle_forma_pago: [
      {
        COD_FORMA_PAGO: invoice.formaPago === 'Credito' ? 'Credito' : 'Contado',
        MONTO_FORMA_PAGO: total.toFixed(2)
      }
    ],

    detalle: invoice.items.map((item, index) => {
      const precioSinIgv = item.precioUnitario / 1.18;
      const importeBase = precioSinIgv * item.cantidad;
      const igvItem = (item.precioUnitario - precioSinIgv) * item.cantidad;

      return {
        txtITEM: String(index + 1),
        txtDESCRIPCION_DET: item.descripcion.toUpperCase(),
        txtCANTIDAD_DET: item.cantidad.toFixed(2),
        txtPRECIO_DET: item.precioUnitario.toFixed(2),
        txtIMPORTE_DET: importeBase.toFixed(2),
        txtPRECIO_SIN_IGV_DET: precioSinIgv.toFixed(2),
        txtIGV: igvItem.toFixed(2),
        POR_IGV: "18.00",
        txtUNIDAD_MEDIDA_DET: item.unidadMedida || "NIU",
        txtCOD_TIPO_OPERACION: "10",
        txtPRECIO_TIPO_CODIGO: "01",
        txtISC: "0.00",
        FLG_ICBPER: 0,
        IMPUESTO_BP: "0.00",
        IMPORTE_BP: "0.00",
        txtCODIGO_DET: item.codigoProducto || generarUUID()
      };
    })
  };

  return payload;
}

export async function sendBillToVisioner7(invoice: Invoice, company: Company): Promise<SunatResponse> {
  const payload = buildInvoicePayload(invoice, company);

  console.log("🌸 [Visioner7] Payload enviado:", JSON.stringify(payload, null, 2));

  const proxyUrl = `/api/sunat-proxy?url=${encodeURIComponent('https://service1.visioner7-api.com/api/v1/sunat/generar-cpe')}`;

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
    console.log("✅ [Visioner7] Respuesta raw recibida:", rawText);

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Respuesta inválida del proxy (No es JSON): ${rawText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.details || `Error del proxy (HTTP ${response.status})`);
    }

    const finalRes = data.data || data.result || data;

    const codSunat = String(finalRes.cod_sunat ?? finalRes.codSunat ?? '');
    const msjSunat = String(finalRes.msj_sunat ?? finalRes.msjSunat ?? finalRes.mensaje ?? 'Error desconocido');

    if (codSunat !== "0" && codSunat !== "") {
      throw new Error(`SUNAT rechazó: [Código ${codSunat}] ${msjSunat}`);
    }

    return {
      archivo: finalRes.archivo || finalRes.pdf || finalRes.url_pdf || '',
      cod_sunat: codSunat || "0",
      msj_sunat: msjSunat || 'Aceptado por SUNAT',
      hash_cdr: finalRes.hash_cdr || finalRes.hashCdr || finalRes.hash || '',
      cdr_data: finalRes.cdr_data || finalRes.cdrData || ''
    };
  } catch (error: any) {
    console.error("❌ [Visioner7 error] Detalle:", error);
    throw error;
  }
}
