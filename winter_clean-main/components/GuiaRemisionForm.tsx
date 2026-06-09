import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from '../App';
import { supabase } from '../services/supabaseClient';
import { searchClient } from '../services/clientService';
import { 
  buildGuiaPayload, 
  sendGuiaRemision, 
  getNextCorrelativoGuia, 
  saveGuiaToSupabase 
} from '../services/guiaRemisionService';
import { 
  GuiaRemisionInput, 
  GuiaDetalle, 
  DatosCliente, 
  DatosChofer 
} from '../types/guiaRemision';
import { 
  Truck, 
  Package, 
  User, 
  Plus, 
  Trash2, 
  Search, 
  Building, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Calendar, 
  Scale, 
  Layers, 
  AlertCircle, 
  MapPin, 
  Loader2, 
  RefreshCw,
  FileText
} from 'lucide-react';

export const GuiaRemisionForm: React.FC = () => {
  const { customers, currentUser, apiToken, addGuiaRemision } = useContext(AppContext);

  // Company details
  const [company, setCompany] = useState<any>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  // Modalidad de traslado
  const [modalidad, setModalidad] = useState<'PRIVADA' | 'PUBLICA'>('PRIVADA');

  // Correlativo / Nro Guía
  const [nroComprobante, setNroComprobante] = useState('');
  const [isRefreshingCorrelativo, setIsRefreshingCorrelativo] = useState(false);

  // Fechas
  const today = new Date().toISOString().split('T')[0];
  const [fechaDocumento, setFechaDocumento] = useState(today);
  const [fechaInicio, setFechaInicio] = useState(today);

  // Datos de Carga / Generales
  const [pesoBruto, setPesoBruto] = useState('5.0');
  const [totalBultos, setTotalBultos] = useState('1');
  const [nota, setNota] = useState('');

  // Datos Destinatario (Cliente)
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [customerDocType, setCustomerDocType] = useState('DNI'); // 'DNI', 'RUC'
  const [customerDocNum, setCustomerDocNum] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerUbigeo, setCustomerUbigeo] = useState('150101');
  const [customerDireccion, setCustomerDireccion] = useState('');
  
  // Consulta Sunat externa
  const [isQueryingSunat, setIsQueryingSunat] = useState(false);

  // Datos Chofer (Privada)
  const [placaVehiculo, setPlacaVehiculo] = useState('');
  const [driverDocType, setDriverDocType] = useState('DNI');
  const [driverDocNum, setDriverDocNum] = useState('');
  const [driverNames, setDriverNames] = useState('');
  const [driverApellidos, setDriverApellidos] = useState('');
  const [driverLicencia, setDriverLicencia] = useState('');

  // Detalle prendas/ítems
  const [detalle, setDetalle] = useState<Omit<GuiaDetalle, 'item' | 'orderItem'>[]>([
    {
      unidadMedida: 'NIU',
      cantidad: '1',
      descripcion: 'SERVICIO DE LAVADO',
      codigo: 'PRENDA-01'
    }
  ]);

  // Loading & Respuesta global
  const [isSending, setIsSending] = useState(false);
  const [successResponse, setSuccessResponse] = useState<any | null>(null);
  const [errorResponse, setErrorResponse] = useState<string | null>(null);

  // Cargar datos del tenant actual al montar
  const fetchCompanyDetails = async () => {
    setIsLoadingCompany(true);
    try {
      const tenantId = currentUser?.tenantId || currentUser?.tenant_id || '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();
      
      if (data) {
        setCompany(data);
      } else {
        // Fallback demo
        setCompany({
          id: tenantId,
          ruc: '20601004561',
          razon_social: 'QUÍMICOS LOPEZ S.A.C.',
          direccion: 'JR. CARABAYA 540, LIMA CERCADO',
          ubigeo: '150101',
          sol_usuario: 'MODDATOS',
          sol_password: 'MODDATOS',
          pfx_password: 'MODDATOS',
          visioner7_token: apiToken || 'sk_11867.t8kBVOUaeNsEQgur18EEGVWOKner1ces',
          visioner7_clave: 'MODDATOS'
        });
      }
    } catch (e) {
      console.error("Error cargando metadatos del tenant:", e);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [currentUser]);

  // Siguiente correlativo al cargar empresa o refrescar
  const refreshCorrelativo = async () => {
    if (!company) return;
    setIsRefreshingCorrelativo(true);
    try {
      const tenantId = company.id || '00000000-0000-0000-0000-000000000000';
      const nextC = await getNextCorrelativoGuia(tenantId);
      setNroComprobante(nextC);
    } catch (e) {
      console.error("Error obteniendo número correlativo:", e);
    } finally {
      setIsRefreshingCorrelativo(false);
    }
  };

  useEffect(() => {
    if (company) {
      refreshCorrelativo();
    }
  }, [company]);

  // Lista de clientes filtrados
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return [];
    return customers.filter(c => 
      !c.deleted && (
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.docNumber && c.docNumber.includes(query)) ||
        (c.phone && c.phone.includes(query))
      )
    ).slice(0, 10);
  }, [customerSearch, customers]);

  const handleSelectCustomer = (c: any) => {
    setCustomerDocType(c.docType || 'DNI');
    setCustomerDocNum(c.docNumber || '');
    setCustomerName(c.name || '');
    setCustomerUbigeo(c.ubigeo || '150101');
    setCustomerDireccion(c.address || '');
    setCustomerSearch('');
    setShowDropdown(false);
  };

  // Consulta manual mediante API de Sunat
  const handleQuerySunat = async () => {
    const cleanNum = customerDocNum.trim();
    if (cleanNum.length !== 8 && cleanNum.length !== 11) {
      alert("Ingrese un número de documento válido (8 dígitos para DNI, 11 para RUC)");
      return;
    }
    
    setIsQueryingSunat(true);
    try {
      const docType = cleanNum.length === 8 ? 'DNI' : 'RUC';
      const tokenToUse = company?.visioner7_token || apiToken || 'sk_11867.t8kBVOUaeNsEQgur18EEGVWOKner1ces';
      const result = await searchClient(docType, cleanNum, tokenToUse);
      
      if (result) {
        setCustomerDocType(result.docType);
        setCustomerName(result.name || '');
        setCustomerDireccion(result.address || '');
        setCustomerUbigeo(result.ubigeo || '150101');
      } else {
        alert("No se obtuvieron resultados para el documento ingresado.");
      }
    } catch (err: any) {
      console.error("Falla en consulta SUNAT", err);
      alert(`Servicio de consulta no disponible: ${err.message}`);
    } finally {
      setIsQueryingSunat(false);
    }
  };

  // Agregar detalle
  const addItemRow = () => {
    const idx = detalle.length + 1;
    setDetalle(prev => [
      ...prev,
      {
        unidadMedida: 'NIU',
        cantidad: '1',
        descripcion: 'SERVICIO DE LAVADO',
        codigo: `PRENDA-${idx.toString().padStart(2, '0')}`
      }
    ]);
  };

  // Eliminar detalle
  const removeItemRow = (index: number) => {
    if (detalle.length <= 1) {
      alert("Se requiere al menos un ítem detallado para emitir la guía de remisión.");
      return;
    }
    setDetalle(prev => prev.filter((_, idx) => idx !== index));
  };

  // Modificar campo de detalle
  const updateItemRow = (index: number, field: string, value: string) => {
    setDetalle(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Reiniciar formulario
  const handleResetForm = () => {
    setModalidad('PRIVADA');
    setFechaDocumento(today);
    setFechaInicio(today);
    setPesoBruto('5.0');
    setTotalBultos('1');
    setNota('');
    setCustomerSearch('');
    setCustomerDocType('DNI');
    setCustomerDocNum('');
    setCustomerName('');
    setCustomerUbigeo('150101');
    setCustomerDireccion('');
    setPlacaVehiculo('');
    setDriverDocNum('');
    setDriverNames('');
    setDriverApellidos('');
    setDriverLicencia('');
    setDetalle([
      {
        unidadMedida: 'NIU',
        cantidad: '1',
        descripcion: 'SERVICIO DE LAVADO',
        codigo: 'PRENDA-01'
      }
    ]);
    setSuccessResponse(null);
    setErrorResponse(null);
    refreshCorrelativo();
  };

  // Emisión principal
  const handleEmitirGuia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorResponse(null);
    setSuccessResponse(null);

    // Validaciones básicas
    if (!nroComprobante.trim()) {
      setErrorResponse("El número de comprobante es requerido.");
      return;
    }
    if (!customerDocNum.trim() || !customerName.trim() || !customerDireccion.trim()) {
      setErrorResponse("Los datos del cliente/destino (Documento, Nombre, Dirección) son mandatorios.");
      return;
    }
    if (detalle.some(d => !d.descripcion.trim())) {
      setErrorResponse("Todos los ítems del detalle deben tener una descripción.");
      return;
    }

    setIsSending(true);

    try {
      const clienteData: DatosCliente = {
        tipoDocumento: customerDocType,
        nroDocumento: customerDocNum.trim(),
        razonSocial: customerName.trim().toUpperCase(),
        ubigeo: customerUbigeo.trim(),
        direccion: customerDireccion.trim().toUpperCase()
      };

      const choferData: DatosChofer | undefined = modalidad === 'PRIVADA' ? {
        tipoDoc: driverDocType,
        nroDoc: driverDocNum.trim(),
        nombres: driverNames.trim().toUpperCase(),
        apellidos: driverApellidos.trim().toUpperCase(),
        licConducir: driverLicencia.trim().toUpperCase()
      } : undefined;

      const input: GuiaRemisionInput = {
        modalidad,
        nroComprobante: nroComprobante.trim().toUpperCase(),
        fechaDocumento,
        fechaInicio,
        nota: nota.trim() || "Recojo/Entrega de prendas",
        pesoBruto,
        totalBultos,
        cliente: clienteData,
        placaVehiculo: modalidad === 'PRIVADA' ? placaVehiculo.trim().toUpperCase() : undefined,
        chofer: choferData,
        detalle: detalle.map((d, index) => ({
          ...d,
          item: String(index + 1),
          orderItem: String(index + 1)
        }))
      };

      // Ejecutar envío oficial
      const response = await sendGuiaRemision(input, company);

      // Guardar en Supabase para historial
      const tenantId = company?.id || '00000000-0000-0000-0000-000000000000';
      await saveGuiaToSupabase(input, response, tenantId);

      // Añadir la guía emitida al AppContext
      const nextId = Math.random().toString(36).substring(7);
      addGuiaRemision({
        id: nextId,
        nroGuiaCompleto: input.nroComprobante,
        serieDocumento: input.nroComprobante.split('-')[0],
        numeroDocumento: input.nroComprobante.split('-')[1],
        fechaDocumento: input.fechaDocumento,
        fechaInicioTraslado: input.fechaInicio,
        motivoTrasladoCodigo: '01',
        motivoTrasladoDescripcion: 'TRASLADO DE PRENDAS',
        modalidadTrasladoCodigo: modalidad === 'PRIVADA' ? '02' : '01',
        pesoBrutoTotal: parseFloat(input.pesoBruto),
        totalBultos: parseInt(input.totalBultos, 10),
        ubigeoOrigen: company?.ubigeo || '150101',
        direccionOrigen: company?.direccion || 'AV. PRINCIPAL 123',
        ubigeoDestino: input.cliente.ubigeo,
        direccionDestino: input.cliente.direccion,
        clienteTipoDocumento: input.cliente.tipoDocumento,
        clienteNroDocumento: input.cliente.nroDocumento,
        clienteRazonSocial: input.cliente.razonSocial,
        placaVehiculo: input.placaVehiculo,
        choferTipoDocumento: input.chofer?.tipoDoc,
        choferNroDocumento: input.chofer?.nroDoc,
        choferNombres: input.chofer?.nombres,
        choferApellidos: input.chofer?.apellidos,
        choferLicenciaConducir: input.chofer?.licConducir,
        estadoGuia: 'ACEPTADO',
        sunatPdfUrl: response.archivo,
        sunatHashGuia: response.hash_cdr,
        sunatCodigoRespuesta: response.cod_sunat,
        sunatDescripcionRespuesta: response.msj_sunat,
        items: input.detalle.map((d, index) => ({
          itemIndex: index + 1,
          codigoProducto: d.codigo,
          descripcion: d.descripcion,
          unidadMedida: d.unidadMedida,
          cantidad: parseFloat(d.cantidad)
        }))
      });

      setSuccessResponse(response);
    } catch (err: any) {
      setErrorResponse(err.message || 'Error inesperado al emitir la Guía.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl relative overflow-hidden max-w-5xl mx-auto my-6 font-sans">
      {/* Decorative vertical bar on the left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#51B01E]"></div>

      {/* HEADER SECTION */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#51B01E]/15 p-2.5 rounded-xl border border-[#51B01E]/20 text-[#51B01E]">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                Guía de Remisión Electrónica
                <span className="text-[10px] bg-[#51B01E]/20 text-[#51B01E] border border-[#51B01E]/30 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">SUNAT GRE v1</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Emisión integrada para recojo y transporte de prendas y productos químicos.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800 self-stretch md:self-auto justify-between">
            <div className="flex flex-col pl-1.5 pr-4 text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Número de Guía</span>
              <input 
                type="text" 
                value={nroComprobante} 
                onChange={(e) => setNroComprobante(e.target.value)}
                placeholder="T001-00000001"
                className="bg-transparent text-sm font-extrabold text-[#51B01E] focus:outline-none uppercase w-32 tracking-wider mt-0.5"
              />
            </div>
            <button 
              type="button"
              onClick={refreshCorrelativo}
              disabled={isRefreshingCorrelativo || isLoadingCompany}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-30 self-center"
              title="Actualizar correlativo"
            >
              <RefreshCw size={14} className={isRefreshingCorrelativo ? "animate-spin text-[#51B01E]" : ""} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleEmitirGuia} className="p-6 space-y-7">
        
        {/* SECCIÓN 1 - TIPO DE TRASLADO */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            SECCIÓN 1 - Modalidad de Despacho / Traslado
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setModalidad('PRIVADA')}
              className={`p-4.5 rounded-2xl flex items-center justify-between border transition-all text-left group cursor-pointer ${
                modalidad === 'PRIVADA'
                  ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-[#51B01E]/60 text-white shadow-md shadow-emerald-950/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border transition-all ${
                  modalidad === 'PRIVADA' ? 'bg-[#51B01E] text-white border-emerald-400/40' : 'bg-slate-900 text-slate-500 border-slate-800 group-hover:text-[#51B01E]'
                }`}>
                  <Truck size={20} />
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-250">Vehículo Propio (Moto/Auto)</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Modalidad Privada (02) - Misma sucursal</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                modalidad === 'PRIVADA' ? 'border-[#51B01E] bg-[#51B01E]' : 'border-slate-700'
              }`}>
                {modalidad === 'PRIVADA' && <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModalidad('PUBLICA')}
              className={`p-4.5 rounded-2xl flex items-center justify-between border transition-all text-left group cursor-pointer ${
                modalidad === 'PUBLICA'
                  ? 'bg-gradient-to-br from-[#1E51B0]/25 to-slate-900 border-blue-500/60 text-white shadow-md shadow-blue-950/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl border transition-all ${
                  modalidad === 'PUBLICA' ? 'bg-[#1E51B0] text-white border-blue-400/40' : 'bg-slate-900 text-slate-500 border-slate-800 group-hover:text-[#1E51B0]'
                }`}>
                  <Package size={20} />
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-250">Courier Externo</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Modalidad Pública (01) - Agencia de carga</span>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                modalidad === 'PUBLICA' ? 'border-[#1E51B0] bg-[#1E51B0]' : 'border-slate-700'
              }`}>
                {modalidad === 'PUBLICA' && <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>}
              </div>
            </button>
          </div>
        </div>


        {/* SECCIÓN 2 - DATOS GENERALES DEL TRASLADO */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            SECCIÓN 2 - Datos Generales de la Guía
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase uppercase tracking-wide">Fecha de Guía</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={fechaDocumento} 
                  onChange={(e) => setFechaDocumento(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:border-[#51B01E] focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha Inicio Traslado</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:border-[#51B01E] focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Peso Bruto Total (KGM)</label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 relative">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.1" 
                  value={pesoBruto} 
                  onChange={(e) => setPesoBruto(e.target.value)} 
                  className="w-full bg-transparent border-none py-2 text-xs font-semibold text-slate-100 focus:outline-none"
                  placeholder="2.5"
                />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1.5">KGM</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Total de Bultos</label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 relative">
                <input 
                  type="number" 
                  min="1" 
                  value={totalBultos} 
                  onChange={(e) => setTotalBultos(e.target.value)} 
                  className="w-full bg-transparent border-none py-2 text-xs font-semibold text-slate-100 focus:outline-none"
                  placeholder="1"
                />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1.5">BULTOS</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Observaciones / Nota</label>
            <input 
              type="text" 
              value={nota} 
              onChange={(e) => setNota(e.target.value)} 
              placeholder="Recojo de prendas - Orden #123" 
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-[#51B01E] focus:outline-none transition-all"
            />
          </div>
        </div>


        {/* SECCIÓN 3 - DESTINATARIO (CLIENTE) Y PUNTO DE LLEGADA */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
            SECCIÓN 3 - Datos de Destinatario / Cliente y Dirección de Entrega
          </label>
          
          {/* Autocompletar / Buscar */}
          <div className="relative">
            <span className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Buscar Cliente Registrado</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 focus-within:border-[#51B01E] rounded-xl px-3 transition-all">
              <Search size={14} className="text-slate-500 mr-2 flex-none" />
              <input 
                type="text" 
                value={customerSearch} 
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Escribe el nombre, DNI, RUC de cliente..."
                className="w-full bg-transparent border-none py-2 px-1 text-xs text-slate-100 focus:outline-none placeholder-slate-500"
              />
              {customerSearch && (
                <button 
                  type="button" 
                  onClick={() => setCustomerSearch('')} 
                  className="text-xs text-slate-500 hover:text-slate-350 px-1 hover:font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Droplist */}
            {showDropdown && customerSearch.trim() !== "" && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl max-h-56 overflow-y-auto shadow-2xl divide-y divide-slate-800/60">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-xs italic text-slate-500 text-center">No se encontraron clientes coincidentes.</div>
                ) : (
                  filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left p-2.5 hover:bg-slate-900/80 hover:text-white text-slate-300 text-xs transition-all flex items-center justify-between"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-extrabold text-slate-100 truncate uppercase">{c.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {c.docType || 'DOC'}: {c.docNumber || 'S/D'} • {c.district || 'S/D'}
                        </span>
                      </div>
                      <ArrowRight size={12} className="text-[#51B01E] flex-none opacity-40 group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/50 pt-3 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Tipo Doc</label>
              <select 
                value={customerDocType} 
                onChange={(e) => setCustomerDocType(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-[#51B01E]"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">C. Extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Nro Documento</label>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  value={customerDocNum} 
                  onChange={(e) => setCustomerDocNum(e.target.value)} 
                  maxLength={customerDocType === 'RUC' ? 11 : 15}
                  placeholder="DNI de 8 / RUC de 11 dig" 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-[#51B01E]"
                />
                
                {(customerDocType === 'DNI' || customerDocType === 'RUC') && (
                  <button
                    type="button"
                    onClick={handleQuerySunat}
                    disabled={isQueryingSunat || !customerDocNum}
                    className="bg-[#51B01E] hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md hover:shadow-emerald-950/20 active:scale-95 text-center whitespace-nowrap flex items-center justify-center gap-1.5"
                    title="Consultar Sunat"
                  >
                    {isQueryingSunat ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <>
                        <RefreshCw size={11} />
                        RENIEC
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Nombre o Razón Social</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="VALOR COMERCIAL DEL CLIENTE" 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 uppercase font-bold focus:outline-none focus:border-[#51B01E]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Ubigeo Destino (6 dig)</label>
              <input 
                type="text" 
                value={customerUbigeo} 
                onChange={(e) => setCustomerUbigeo(e.target.value)} 
                maxLength={6}
                placeholder="150101" 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-[#51B01E]"
              />
            </div>

            <div className="md:col-span-12">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Dirección Destino (Llegada)</label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 focus-within:border-[#51B01E]">
                <MapPin size={12} className="text-slate-500 mr-2" />
                <input 
                  type="text" 
                  value={customerDireccion} 
                  onChange={(e) => setCustomerDireccion(e.target.value)} 
                  placeholder="AV. SIEMPRE VIVA 123" 
                  className="w-full bg-transparent border-none py-2 text-xs text-slate-100 uppercase font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>


        {/* SECCIÓN 4 - SOLO VEHÍCULO Y CHOFER (SI MODALIDAD ES PRIVADA) */}
        {modalidad === 'PRIVADA' && (
          <div className="bg-slate-950 p-5 rounded-2xl border border-[#51B01E]/30 space-y-4 animate-fade-in relative overflow-hidden">
            <div className="absolute right-0 top-0 h-16 w-16 bg-[#51B01E]/5 rounded-bl-full pointer-events-none border-b border-l border-[#51B01E]/10 flex items-center justify-center">
              <Building size={16} className="text-[#51B01E]/30" />
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                SECCIÓN 4 - Vehículo Autoproporcionado y Conductor
              </label>
              <span className="text-[9px] text-[#51B01E] font-bold uppercase tracking-wider flex items-center gap-1 pl-0.5">
                💡 El transportista se registra automáticamente como tu empresa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Placa de Vehículo</label>
                <input 
                  type="text" 
                  value={placaVehiculo} 
                  onChange={(e) => setPlacaVehiculo(e.target.value)} 
                  placeholder="ABC123" 
                  maxLength={8}
                  className="w-full bg-slate-900 border border-[#51B01E]/20 focus:border-[#51B01E] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#51B01E] uppercase focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Doc Chofer (DNI)</label>
                <input 
                  type="text" 
                  value={driverDocNum} 
                  onChange={(e) => setDriverDocNum(e.target.value)} 
                  placeholder="DNI Conductor" 
                  maxLength={8}
                  className="w-full bg-slate-900 border border-[#51B01E]/20 focus:border-[#51B01E] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100 uppercase focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Nombres Conductor</label>
                <input 
                  type="text" 
                  value={driverNames} 
                  onChange={(e) => setDriverNames(e.target.value)} 
                  placeholder="JUAN" 
                  className="w-full bg-slate-900 border border-[#51B01E]/20 focus:border-[#51B01E] rounded-xl px-3 py-2 text-xs font-bold text-slate-100 uppercase focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Apellidos Conductor</label>
                <input 
                  type="text" 
                  value={driverApellidos} 
                  onChange={(e) => setDriverApellidos(e.target.value)} 
                  placeholder="PEREZ" 
                  className="w-full bg-slate-900 border border-[#51B01E]/20 focus:border-[#51B01E] rounded-xl px-3 py-2 text-xs font-bold text-slate-100 uppercase focus:outline-none"
                />
              </div>

              <div className="md:col-span-12">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Licencia de Conducir (Mismo Nro o código regional)</label>
                <input 
                  type="text" 
                  value={driverLicencia} 
                  onChange={(e) => setDriverLicencia(e.target.value)} 
                  placeholder="A12345678" 
                  className="w-full bg-slate-900 border border-[#51B01E]/20 focus:border-[#51B01E] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold tracking-widest text-[#51B01E] uppercase focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}


        {/* SECCIÓN 5 - DETALLE DE PRENDAS */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              SECCIÓN 5 - Prendas, Servicios o Envíos a Trasladar
            </label>
            <button
              type="button"
              onClick={addItemRow}
              className="px-3.5 py-1.5 bg-[#51B01E]/10 border border-[#51B01E]/40 hover:bg-[#51B01E]/20 text-[#51B01E] font-bold text-[10px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
            >
              <Plus size={12} /> Agregar prenda / servicio
            </button>
          </div>

          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-black text-[10px] tracking-wide">
                    <th className="p-3.5 pl-4 text-center w-12">#</th>
                    <th className="p-3.5">Descripción de la Carga</th>
                    <th className="p-3.5 text-center w-28">Cantidad</th>
                    <th className="p-3.5 text-center w-40">Código Item</th>
                    <th className="p-3.5 text-center w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {detalle.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 relative">
                      <td className="p-3 text-slate-400 text-center font-bold font-mono pl-4">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={row.descripcion} 
                          onChange={(e) => updateItemRow(idx, 'descripcion', e.target.value)}
                          placeholder="CAMISAS / PAQUETE DE PRENDAS"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 uppercase font-semibold focus:outline-none focus:border-[#51B01E]"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          min="1" 
                          value={row.cantidad} 
                          onChange={(e) => updateItemRow(idx, 'cantidad', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold text-slate-100 focus:outline-none focus:border-[#51B01E]"
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          value={row.codigo} 
                          onChange={(e) => updateItemRow(idx, 'codigo', e.target.value)}
                          placeholder="PRENDA-01"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-center font-mono font-semibold text-slate-400 uppercase focus:outline-none focus:border-[#51B01E]"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-red-400 bg-red-950/25 border border-red-950 hover:bg-red-900/40 rounded-xl transition-all hover:text-red-300 disabled:opacity-20 active:scale-90"
                          title="Eliminar fila"
                          disabled={detalle.length <= 1}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        {/* VISUALIZADOR DE ERRORES / RESPUESTAS EXITOSAS */}
        
        {errorResponse && (
          <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3 text-red-200 animate-pulse shrink-0">
            <XCircle size={18} className="text-red-500 mt-0.5 flex-none" />
            <div>
              <span className="block font-black text-xs uppercase tracking-wider">ERROR DE VALIDACIÓN O EMISIÓN SUNAT</span>
              <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed font-semibold">{errorResponse}</p>
            </div>
          </div>
        )}

        {successResponse && (
          <div className="p-5.5 bg-emerald-950/40 border border-[#51B01E]/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="bg-[#51B01E] text-slate-950 p-2 rounded-full flex-none mt-0.5">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <span className="block text-sm font-black text-white uppercase tracking-wider">✅ GUÍA DE REMISIÓN ACEPTADA CON ÉXITO</span>
                <p className="text-xs text-emerald-400 font-mono font-bold uppercase">Código SUNAT: {successResponse.cod_sunat} • Serie/Nro: {nroComprobante}</p>
                <p className="text-[11px] text-slate-300 leading-normal">
                  <span className="font-extrabold text-[#51B01E]">Mensaje SUNAT:</span> {successResponse.msj_sunat}
                </p>
                {successResponse.hash_cdr && (
                  <p className="text-[9px] font-mono text-slate-500 font-bold uppercase truncate max-w-sm">Hash CDR: {successResponse.hash_cdr}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              {successResponse.archivo && (
                <a 
                  href={successResponse.archivo} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-[#51B01E] hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-emerald-950/30 active:scale-95 block text-center"
                >
                  Descargar PDF
                </a>
              )}
              <button
                type="button"
                onClick={handleResetForm}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 font-bold text-xs text-slate-300 px-4 py-2.5 rounded-xl transition-all cursor-pointer block text-center active:scale-95"
              >
                Nueva Guía
              </button>
            </div>
          </div>
        )}


        {/* SECCIÓN 6 - ACCIONES PRINCIPALES Y EMISIÓN */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-xl">
          <div className="flex items-center gap-2.5 text-slate-400 pl-1 text-[11px] font-bold">
            <AlertCircle size={14} className="text-[#51B01E]" />
            <span>Al emitir este documento, se validará y firmará automáticamente ante los servidores de SUNAT.</span>
          </div>

          <button
            type="submit"
            disabled={isSending || isRefreshingCorrelativo || isLoadingCompany || !!successResponse}
            className={`w-full sm:w-auto px-7 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-[#0c0d0e] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl relative overflow-hidden h-11 ${
              successResponse 
                ? 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-[#51B01E] hover:bg-emerald-500 active:scale-98 hover:shadow-emerald-950/30 text-slate-950 font-black'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 size={14} className="animate-spin text-slate-950 mr-1" />
                <span>Enviando a SUNAT...</span>
              </>
            ) : (
              <>
                <FileText size={14} />
                <span>Emitir Guía de Remisión</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
