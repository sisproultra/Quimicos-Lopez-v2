import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { TicketConfig, PaymentMethod } from '../types';
import { Save, Printer, Upload, Image as ImageIcon, Trash2, ChevronDown, Plus, CreditCard, Check, X, Smartphone, Banknote, QrCode, Clock, Wallet, Package, Database, RefreshCw, Layers, Building2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Settings: React.FC = () => {
  const { ticketConfig, setTicketConfig, themeStyles: themeColors, currency, paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, apiToken, setApiToken, decolectaUrl, setDecolectaUrl } = useContext(AppContext);
  const [formData, setFormData] = useState<TicketConfig>(ticketConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accordion state
  const [openSection, setOpenSection] = useState<'ticket' | 'payments' | 'decolecta' | 'correlativos' | null>('ticket');

  // Correlativos state
  const [correlativosList, setCorrelativosList] = useState<any[]>([]);
  const [loadingCorrelativos, setLoadingCorrelativos] = useState(false);
  const [savingCorrelativoType, setSavingCorrelativoType] = useState<string | null>(null);

  // Custom Alert Modal State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  const showCustomAlert = (message: string) => {
    setAlertModalMessage(message);
    setIsAlertModalOpen(true);
  };

  const fetchCorrelativos = async () => {
    setLoadingCorrelativos(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const finalTenantId = session?.user?.user_metadata?.tenant_id || session?.user?.id || '00000000-0000-0000-0000-000000000000';
      
      const { data, error } = await supabase
        .from('correlativos')
        .select('*')
        .eq('tenant_id', finalTenantId);
        
      if (error) {
        console.error("Error fetching correlativos", error);
        return;
      }
      
      const defaultTypes = [
         { tipo_comprobante: 'NV', nombre: 'Nota de Venta', serie_def: 'NV01' },
         { tipo_comprobante: '03', nombre: 'Boleta de Venta', serie_def: 'B001' },
         { tipo_comprobante: '01', nombre: 'Factura de Venta', serie_def: 'F001' },
         { tipo_comprobante: '07', nombre: 'Nota de Crédito', serie_def: 'FC01' },
         { tipo_comprobante: '08', nombre: 'Nota de Débito', serie_def: 'FD01' },
         { tipo_comprobante: 'CI', nombre: 'Correlativo Interno (Ventas)', serie_def: 'INT1' }
      ];
      
      const merged = defaultTypes.map(def => {
        const dbRow = (data || []).find(r => r.tipo_comprobante === def.tipo_comprobante);
        return {
          tipo_comprobante: def.tipo_comprobante,
          nombre: def.nombre,
          serie: dbRow?.serie || def.serie_def,
          ultimo_correlativo: dbRow?.ultimo_correlativo !== undefined ? dbRow.ultimo_correlativo : 0,
        };
      });
      
      setCorrelativosList(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCorrelativos(false);
    }
  };

  const handleSaveCorrelativo = async (item: any) => {
    if (!item.serie || item.serie.length !== 4) {
      alert("La serie debe tener exactamente 4 caracteres (ej: F001, B001, NV01).");
      return;
    }
    setSavingCorrelativoType(item.tipo_comprobante);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const finalTenantId = session?.user?.user_metadata?.tenant_id || session?.user?.id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('correlativos')
        .upsert({
          tenant_id: finalTenantId,
          tipo_comprobante: item.tipo_comprobante,
          serie: item.serie.toUpperCase(),
          ultimo_correlativo: parseInt(item.ultimo_correlativo) || 0
        }, { onConflict: 'tenant_id,tipo_comprobante,serie' });
        
      if (error) {
        throw error;
      }
      
      alert(`Correlativo de ${item.nombre} actualizado con éxito.`);
      await fetchCorrelativos();
    } catch (e: any) {
      console.error("Error saving correlativo:", e);
      alert("Error al guardar correlativo: " + (e.message || e));
    } finally {
      setSavingCorrelativoType(null);
    }
  };

  useEffect(() => {
    if (openSection === 'correlativos') {
      fetchCorrelativos();
    }
  }, [openSection]);

  useEffect(() => {
    setFormData(ticketConfig);
  }, [ticketConfig]);

  const [tokenInput, setTokenInput] = useState(apiToken);
  const [urlInput, setUrlInput] = useState(decolectaUrl);
  const [decolectaSaved, setDecolectaSaved] = useState(false);

  React.useEffect(() => {
    setTokenInput(apiToken);
  }, [apiToken]);

  React.useEffect(() => {
    setUrlInput(decolectaUrl);
  }, [decolectaUrl]);

  // Payment method form state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<Partial<PaymentMethod>>({
    name: '',
    icon: 'Banknote',
    color: 'slate',
    isActive: true,
    fixedValue: 0
  });
  const paymentIconRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      setTicketConfig(formData);
      showCustomAlert('Configuración de la empresa guardada con éxito.');
  };

  const handleOpenPaymentModal = (pm?: PaymentMethod) => {
    if (pm) {
      setEditingPayment(pm);
      setPaymentFormData(pm);
    } else {
      setEditingPayment(null);
      setPaymentFormData({
        name: '',
        icon: 'Banknote',
        color: 'slate',
        isActive: true,
        fixedValue: 0,
        imageIcon: undefined
      });
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentFormData(prev => ({ ...prev, imageIcon: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.name) return;

    const finalPM: PaymentMethod = {
      ...paymentFormData,
      id: editingPayment?.id || Date.now().toString(),
    } as PaymentMethod;

    if (editingPayment) {
      updatePaymentMethod(finalPM);
    } else {
      addPaymentMethod(finalPM);
    }
    setIsPaymentModalOpen(false);
  };

  const PaymentMethodIcon = ({ pm, size = 18 }: { pm: PaymentMethod, size?: number }) => {
    if (pm.imageIcon) {
      return <img src={pm.imageIcon} className="rounded-md object-contain" style={{ width: size, height: size }} alt={pm.name} />;
    }
    switch(pm.icon) {
      case 'Smartphone': return <Smartphone size={size} />;
      case 'Banknote': return <Banknote size={size} />;
      case 'QrCode': return <QrCode size={size} />;
      case 'Clock': return <Clock size={size} />;
      case 'Wallet': return <Wallet size={size} />;
      case 'Package': return <Package size={size} />;
      default: return <CreditCard size={size} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 animate-fade-in">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6 uppercase tracking-tight">
        <ImageIcon className={themeColors.text} /> CONFIGURACIÓN
      </h2>

      {/* Accordion Container */}
      <div className="space-y-3">
        {/* Accordion Item: Configuración de la Empresa */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === 'ticket' ? null : 'ticket')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <span className="font-bold text-slate-700">Configuración de la Empresa</span>
            </div>
            <ChevronDown className={`text-slate-400 transition-transform ${openSection === 'ticket' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'ticket' && (
            <div className="p-6 border-t border-slate-100 animate-fade-in">
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Administra los datos comerciales, fiscales de impresión y las credenciales de facturación electrónica de SUNAT para tu negocio. Allí se guardan todos los campos necesarios.
              </p>

              <form onSubmit={handleSave} className="space-y-8">
                {/* Logo and Main Fields */}
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Building2 size={15} className="text-indigo-600" /> Información Comercial y Fiscal
                  </h4>

                  <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-white transition-all relative overflow-hidden bg-white flex-shrink-0"
                    >
                        {formData.logoUrl ? (
                            <>
                                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="text-white" size={20} />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-slate-400">
                                <ImageIcon size={24} className="mx-auto mb-1" />
                                <span className="text-[10px] font-bold uppercase block">Subir Logo</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">Logo de Empresa</p>
                        <p className="text-xs text-slate-400 mb-2">Resolución recomendada: 300x100px.</p>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        {formData.logoUrl && (
                            <button type="button" onClick={() => setFormData({...formData, logoUrl: ''})} className="text-[10px] font-black text-red-600 uppercase">Eliminar Logo</button>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Comercial / Razón Social</label>
                      <input name="shopName" value={formData.shopName} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">R.U.C. de la Empresa (11 dígitos)</label>
                      <input name="ruc" maxLength={11} value={formData.ruc || ''} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" placeholder="e.g. 20604051984" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono</label>
                      <input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Horario de Atención</label>
                      <input name="schedule" value={formData.schedule} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-semibold text-slate-800" placeholder="e.g. Lun-Vie 8am - 6pm" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Dirección Física</label>
                    <input name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 text-slate-800" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Política o Términos del Ticket</label>
                    <textarea name="policy" value={formData.policy} onChange={handleChange} rows={2} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 text-sm text-slate-800" />
                  </div>
                </div>

                {/* SUNAT section */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Database size={15} className="text-indigo-600" /> Credenciales Facturación Electrónica (SUNAT)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Usuario SOL Secundario</label>
                      <input 
                        name="solUser" 
                        value={formData.solUser || ''} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" 
                        placeholder="e.g. MODDATOS"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Clave SOL Secundario</label>
                      <input 
                        type="password"
                        name="solPassword" 
                        value={formData.solPassword || ''} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" 
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Contraseña Certificado PFX / Firma</label>
                      <input 
                        type="password"
                        name="signaturePassword" 
                        value={formData.signaturePassword || ''} 
                        onChange={handleChange} 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold text-slate-800" 
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {/* Credenciales API Guía de Remisión */}
                  <div className="space-y-4 pt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Credenciales API SOL (Requerido para Guías de Remisión Electrónicas)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">API Guía: Client ID (ID Cliente)</label>
                        <input 
                          type="password"
                          name="guiaToken" 
                          value={formData.guiaToken || ''} 
                          onChange={handleChange} 
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold font-mono text-xs text-slate-800" 
                          placeholder="e.g. ad83fa81-282e-4bca-9ba8-82e706ab466c"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">API Guía: Client Secret (Clave Secreta)</label>
                        <input 
                          type="password"
                          name="guiaClave" 
                          value={formData.guiaClave || ''} 
                          onChange={handleChange} 
                          className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-bold font-mono text-xs text-slate-800" 
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal ml-1 font-semibold">
                      * El Client ID y Client Secret se obtienen del portal de SUNAT SOL bajo el menú "Trámites y Consultas" -&gt; "Credenciales de API" Registrando su aplicación de Guías de Remitente.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        id="productionMode"
                        name="productionMode"
                        checked={formData.productionMode || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, productionMode: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="productionMode" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                        Habilitar Modo Producción (Enviar a SUNAT de forma real)
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal ml-6 mt-1.5 font-semibold">
                      * Si se desmarca, los comprobantes CPE se enviarán en Modo Pruebas (Beta) para no generar deudas fiscales tributarias reales.
                    </p>
                  </div>
                </div>

                <button type="submit" className={`w-full py-4 rounded-xl text-white font-black shadow-lg ${themeColors.primary} hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest`}>
                  <Save className="inline mr-2" size={20} /> Guardar Configuración de la Empresa
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Accordion Item: Payment Methods (Tipo de Pago) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            onClick={() => setOpenSection(openSection === 'payments' ? null : 'payments')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CreditCard size={20} />
              </div>
              <span className="font-bold text-slate-700">Tipo de Pago</span>
            </div>
            <ChevronDown className={`text-slate-400 transition-transform ${openSection === 'payments' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'payments' && (
            <div className="p-6 border-t border-slate-100 animate-fade-in space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-slate-500">Administra los canales y métodos por los cuales recibes o realizas pagos.</p>
                <button 
                  onClick={() => handleOpenPaymentModal()}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Plus size={14} /> NUEVO TIPO
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.filter(pm => !pm.deleted).map(pm => (
                  <div key={pm.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${pm.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 overflow-hidden border border-slate-200">
                        <PaymentMethodIcon pm={pm} size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-700 uppercase text-xs leading-none mb-1">{pm.name}</h4>
                        {pm.fixedValue ? (
                          <p className="text-xs font-bold text-indigo-600">Valor: {currency} {pm.fixedValue.toFixed(2)}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Valor Variable</p>
                        )}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${pm.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                          {pm.isActive ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenPaymentModal(pm)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><ImageIcon size={16}/></button>
                      <button onClick={() => deletePaymentMethod(pm.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
                {/* Accordion Item: Decolecta API Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === 'decolecta' ? null : 'decolecta')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Printer size={20} />
              </div>
              <span className="font-bold text-slate-700">Integración Visioner7 (DNI / RUC)</span>
            </div>
            <ChevronDown className={`text-slate-400 transition-transform ${openSection === 'decolecta' ? 'rotate-180' : ''}`} />
          </button>
 
          {openSection === 'decolecta' && (
            <div className="p-6 border-t border-slate-100 animate-fade-in">
              <form onSubmit={(e) => {
                e.preventDefault();
                setApiToken(tokenInput);
                setDecolectaUrl(urlInput);
                setDecolectaSaved(true);
                setTimeout(() => setDecolectaSaved(false), 2000);
              }} className="space-y-6">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">Visioner7 API Base URL</label>
                  <input 
                    required 
                    value={urlInput} 
                    onChange={e => setUrlInput(e.target.value)} 
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-mono text-sm font-bold" 
                    placeholder="https://service1.visioner7-api.com"
                  />
                </div>
 
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block">API Credenciales (correo:clave)</label>
                  <input 
                    type="password"
                    required
                    value={tokenInput} 
                    onChange={e => setTokenInput(e.target.value)} 
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-indigo-100 font-mono text-sm font-bold" 
                    placeholder="usuario@correo.com:miClaveDeAcceso"
                  />
                  <p className="text-[10px] text-slate-400 font-medium ml-1 mt-1 leading-snug">
                    * Ingrese sus credenciales de Visioner API separadas por dos puntos (Ej: correo@empresa.com:contraseña) para realizar las consultas de DNI y RUC de forma automatizada y multiusuario.
                  </p>
                </div>
 
                <button type="submit" className={`w-full py-4 rounded-xl text-white font-black shadow-lg ${themeColors.primary} hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest flex items-center justify-center gap-2`}>
                  {decolectaSaved ? <Check className="inline" size={20} /> : <Save className="inline" size={20} />}
                  {decolectaSaved ? 'Configuración Guardada' : 'Guardar Configuración Visioner7'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Accordion Item: Gestión de Correlativos (6 tipos) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button 
            type="button"
            onClick={() => setOpenSection(openSection === 'correlativos' ? null : 'correlativos')}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Database size={20} />
              </div>
              <span className="font-bold text-slate-700 font-sans tracking-tight">Gestión de Correlativos y Series (6 tipos)</span>
            </div>
            <ChevronDown className={`text-slate-400 transition-transform ${openSection === 'correlativos' ? 'rotate-180' : ''}`} />
          </button>

          {openSection === 'correlativos' && (
            <div className="p-6 border-t border-slate-100 animate-fade-in space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm font-sans tracking-tight">Dispensador de Correlativos Multiusuario y Atómico</h4>
                  <p className="text-slate-400 text-[10px] italic">Garantiza seriaciones secuenciales seguras sin colisiones ni duplicados.</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchCorrelativos}
                  disabled={loadingCorrelativos}
                  className="flex items-center gap-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  <RefreshCw size={14} className={loadingCorrelativos ? 'animate-spin' : ''} />
                  Refrescar
                </button>
              </div>

              {loadingCorrelativos ? (
                <div className="py-8 text-center text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin text-emerald-500" />
                  Cargando correlativos desde Supabase...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-250 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                          <th className="py-2.5 px-3">Comprobante / Tipo</th>
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Serie (4 caracteres)</th>
                          <th className="py-2.5 px-3">Siguiente Número</th>
                          <th className="py-2.5 px-3">Último Correlativo</th>
                          <th className="py-2.5 px-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {correlativosList.map((item, idx) => {
                          const nextNumStr = String((parseInt(item.ultimo_correlativo) || 0) + 1).padStart(8, '0');
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3 font-bold text-slate-700">{item.nombre}</td>
                              <td className="py-3 px-3">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                                  {item.tipo_comprobante}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <input 
                                  type="text"
                                  maxLength={4}
                                  value={item.serie}
                                  onChange={(e) => {
                                    const val = e.target.value.substring(0, 4);
                                    setCorrelativosList(prev => prev.map(c => c.tipo_comprobante === item.tipo_comprobante ? { ...c, serie: val } : c));
                                  }}
                                  className="w-20 p-1 border border-slate-200 rounded font-mono font-bold text-center uppercase outline-none focus:ring-1 ring-emerald-500 bg-white text-slate-800"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono text-slate-700 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-bold">
                                  {item.serie.toUpperCase()}-{nextNumStr}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <input 
                                  type="number"
                                  min="0"
                                  value={item.ultimo_correlativo}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setCorrelativosList(prev => prev.map(c => c.tipo_comprobante === item.tipo_comprobante ? { ...c, ultimo_correlativo: val } : c));
                                  }}
                                  className="w-24 p-1 border border-slate-200 rounded font-mono text-center outline-none focus:ring-1 ring-emerald-500 bg-white text-slate-800"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleSaveCorrelativo(item)}
                                  disabled={savingCorrelativoType === item.tipo_comprobante}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wide transition-all shadow-sm shrink-0"
                                >
                                  {savingCorrelativoType === item.tipo_comprobante ? 'Guardando...' : 'Establecer'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-medium text-amber-850 flex gap-2">
                    <span>⚠️</span>
                    <p>Estos contadores se guardan directamente en Supabase y poseen concurrencia de bloqueo pesimista en base de datos. Modificar el correlativo aquí puede resultar en saltos o duplicaciones en facturas activas. Úselo con discreción.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>     </div>
      </div>

      {/* Payment Method Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">
                {editingPayment ? 'Editar' : 'Nuevo'} Tipo de Pago
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-5">
              <div className="flex justify-center mb-2">
                <div 
                  onClick={() => paymentIconRef.current?.click()}
                  className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-white transition-all overflow-hidden group"
                >
                  {paymentFormData.imageIcon ? (
                    <img src={paymentFormData.imageIcon} className="w-full h-full object-contain" alt="Icono" />
                  ) : (
                    <>
                      <ImageIcon size={24} className="text-slate-300 group-hover:text-emerald-500" />
                      <span className="text-[8px] font-black text-slate-400 mt-1 uppercase">Subir Icono</span>
                    </>
                  )}
                  <input type="file" ref={paymentIconRef} className="hidden" accept="image/*" onChange={handlePaymentIconUpload} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nombre del Método</label>
                  <input 
                    required
                    placeholder="Ej: Galoneras, Efectivo, BCP..."
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-emerald-100 font-bold"
                    value={paymentFormData.name}
                    onChange={e => setPaymentFormData({...paymentFormData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Icono Lucide</label>
                    <select 
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white text-xs font-bold"
                      value={paymentFormData.icon}
                      onChange={e => setPaymentFormData({...paymentFormData, icon: e.target.value})}
                    >
                      <option value="Banknote">Billete</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="QrCode">QR</option>
                      <option value="Wallet">Billetera</option>
                      <option value="CreditCard">Tarjeta</option>
                      <option value="Package">Paquete (Galonera)</option>
                      <option value="Clock">Reloj (Crédito)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Color Identificador</label>
                    <select 
                      className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white text-xs font-bold"
                      value={paymentFormData.color}
                      onChange={e => setPaymentFormData({...paymentFormData, color: e.target.value})}
                    >
                      <option value="green">Verde</option>
                      <option value="blue">Azul</option>
                      <option value="purple">Morado</option>
                      <option value="orange">Naranja</option>
                      <option value="red">Rojo</option>
                      <option value="slate">Gris</option>
                      <option value="emerald">Esmeralda</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Valor Fijo (Opcional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">{currency}</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-emerald-100 font-bold"
                      value={paymentFormData.fixedValue}
                      onChange={e => setPaymentFormData({...paymentFormData, fixedValue: parseFloat(e.target.value)})}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">* Usar si este método equivale a un monto específico (ej: Galonera = 5 soles).</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Estado del Método</span>
                <button 
                  type="button"
                  onClick={() => setPaymentFormData({...paymentFormData, isActive: !paymentFormData.isActive})}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${paymentFormData.isActive ? 'bg-green-600 text-white shadow-md' : 'bg-slate-300 text-slate-600'}`}
                >
                  {paymentFormData.isActive ? 'ACTIVO' : 'INACTIVO'}
                </button>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all uppercase text-xs">
                  {editingPayment ? 'Actualizar Método' : 'Crear Método'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alert Personalizado para Mensajes de Éxito / Notificación */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden p-6 text-center animate-scale-up">
            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-[#51B01E] mb-4">
              <Check size={36} className="stroke-[3]" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">¡Operación Exitosa!</h3>
            <p className="text-sm font-semibold text-slate-600 mb-6 leading-relaxed">{alertModalMessage}</p>
            <button
              onClick={() => setIsAlertModalOpen(false)}
              className="w-full py-3 bg-[#51B01E] hover:bg-[#439618] text-white rounded-xl font-black shadow-md active:scale-[0.98] transition-all uppercase tracking-wider text-xs"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
