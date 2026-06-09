export type ModalidadTraslado = 'PUBLICA' | 'PRIVADA';

export interface GuiaDetalle {
  item: string;
  orderItem: string;
  unidadMedida: string;
  cantidad: string;
  descripcion: string;
  codigo: string;
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
  nroComprobante: string;
  fechaDocumento: string;
  fechaInicio: string;
  nota: string;
  pesoBruto: string;
  totalBultos: string;
  cliente: DatosCliente;
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

export interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion: string;
  ubigeo: string;
  sol_usuario?: string;
  usuario_sol?: string;
  sol_password?: string;
  pass_sol?: string;
  pfx_password?: string;
  firma_contra?: string;
  firma_pas?: string;
  visioner7_token?: string;
  id_token?: string;
  visioner7_clave?: string;
  clave_token?: string;
}
