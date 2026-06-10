import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { Customer, CustomerContact } from '../types';
import { Plus, Search, Trash2, Edit2, User, Phone, MapPin, X, Globe, AlertTriangle, Flag, DollarSign, ShoppingBag, Loader2, FileText, Store, Camera, Link as LinkIcon, Building2, RefreshCw } from 'lucide-react';
import { searchClient } from '../services/clientService';
import { generateUUID } from '../services/api';

// Explicit styles for alerts
const ALERT_STYLES: Record<string, { badge: string, text: string, border: string, bg: string, icon: string }> = {
    red: { badge: 'bg-red-100 text-red-600', text: 'text-red-500', border: 'border-red-200', bg: 'bg-red-50', icon: 'text-red-600' },
    green: { badge: 'bg-green-100 text-green-600', text: 'text-green-500', border: 'border-green-200', bg: 'bg-green-50', icon: 'text-green-600' },
    blue: { badge: 'bg-blue-100 text-blue-600', text: 'text-blue-500', border: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-600' },
    orange: { badge: 'bg-orange-100 text-orange-600', text: 'text-orange-500', border: 'border-orange-200', bg: 'bg-orange-50', icon: 'text-orange-600' },
};

const PREVIEW_STYLES: Record<string, string> = {
    red: 'bg-red-100 border-red-300 text-red-800',
    green: 'bg-green-100 border-green-300 text-green-800',
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
    orange: 'bg-orange-100 border-orange-300 text-orange-800',
};

const LIMA_DISTRICTS = ["ANCON", "ATE", "BARRANCO", "BREÑA", "CARABAYLLO", "CHACLACAYO", "CHORRILLOS", "CIENEGUILLA", "COMAS", "EL AGUSTINO", "INDEPENDENCIA", "JESUS MARIA", "LA MOLINA", "LA VICTORIA", "LIMA", "LINCE", "LOS OLIVOS", "LURIGANCHO", "LURIN", "MAGDALENA DEL MAR", "MIRAFLORES", "PACHACAMAC", "PUCUSANA", "PUEBLO LIBRE", "PUENTE PIEDRA", "PUNTA HERMOSA", "PUNTA NEGRA", "RIMAC", "SAN BARTOLO", "SAN BORJA", "SAN ISIDRO", "SAN JUAN DE LURIGANCHO", "SAN JUAN DE MIRAFLORES", "SAN LUIS", "SAN MARTIN DE PORRES", "SAN MIGUEL", "SANTA ANITA", "SANTA MARIA DEL MAR", "SANTA ROSA", "SANTIAGO DE SURCO", "SURQUILLO", "VILLA EL SALVADOR", "VILLA MARIA DEL TRIUNFO"];

export const CustomerManager: React.FC = () => {
  const { customers, sales, addCustomer, updateCustomer, deleteCustomer, refreshCustomers, themeStyles: themeColors, currency, apiToken, zones } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-refresh when entering Clientes view
  useEffect(() => {
    let active = true;
    const fetchLatest = async () => {
      try {
        setIsRefreshing(true);
        await refreshCustomers();
      } catch (err) {
        console.error("Failed auto refresh clients:", err);
      } finally {
        if (active) setIsRefreshing(false);
      }
    };
    fetchLatest();
    return () => {
      active = false;
    };
  }, []);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    countryCode: '+51',
    alertColor: 'red',
    docType: 'DNI',
    docNumber: '',
    department: '',
    province: '',
    contacts: [{ name: '', phone: '', type: 'DUEÑO' }]
  });

  const handleContactChange = (index: number, field: keyof CustomerContact, value: string) => {
    const newContacts = [...(formData.contacts || [])];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  };

  const addContactField = () => {
    if ((formData.contacts || []).length < 3) {
      setFormData({ ...formData, contacts: [...(formData.contacts || []), { name: '', phone: '', type: '' }] });
    }
  };

  const removeContactField = (index: number) => {
    const newContacts = (formData.contacts || []).filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: newContacts });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, businessLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Use first contact phone as primary phone if not set
    const primaryPhone = formData.contacts?.[0]?.phone || '';

    if (editingId) {
      updateCustomer({ ...formData, phone: primaryPhone, id: editingId } as Customer);
    } else {
      addCustomer({ ...formData, phone: primaryPhone, id: generateUUID(), deleted: false } as Customer);
    }
    closeModal();
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    }
  };

  const openModal = (customer?: Customer) => {
    setSearchError(null);
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        ...customer,
        contacts: customer.contacts || [{ name: '', phone: '', type: '' }]
      });
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', 
        businessName: '',
        phone: '', 
        address: '', 
        email: '', 
        countryCode: '+51', 
        docType: 'DNI',
        docNumber: '',
        department: '',
        province: '',
        district: '',
        zone: zones[0] || 'CENTRO',
        contacts: [{ name: '', phone: '', type: 'DUEÑO' }],
        alertMessage: '',
        alertColor: 'red'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingId(null);
    setSearchError(null);
  };

  const handleSearchDoc = async () => {
      const docType = formData.docType || 'DNI';
      if (!formData.docNumber) return;

      if (!apiToken) {
          setSearchError('API Token no configurado.');
          return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
          const result = await searchClient(docType as 'DNI' | 'RUC', formData.docNumber, apiToken);
          if (result) {
              setFormData(prev => ({
                  ...prev,
                  name: result.name,
                  address: result.address || prev.address,
                  district: result.district || prev.district,
                  province: result.province || prev.province,
                  department: result.department || prev.department,
                  ubigeo: result.ubigeo || prev.ubigeo,
                  sunatStatus: result.sunatStatus || prev.sunatStatus,
                  sunatCondition: result.sunatCondition || prev.sunatCondition
              }));
          } else {
              setSearchError('No encontrado.');
          }
      } catch (err) {
          setSearchError('Error al consultar.');
      } finally {
          setIsSearching(false);
      }
  };

  const filteredCustomers = customers.filter(c => 
    !c.deleted && (
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        c.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        c.docNumber?.includes(searchTerm)
    )
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setIsRefreshing(true);
              await refreshCustomers();
              setIsRefreshing(false);
            }}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-all border border-slate-200 shadow-sm active:scale-95 disabled:opacity-60"
            title="Refrescar lista de clientes"
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-[#51B01E]' : ''} />
            <span className="hidden sm:inline font-bold text-xs uppercase tracking-wide">Actualizar</span>
          </button>
          <button 
            onClick={() => openModal()}
            className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-md active:scale-95`}
          >
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, negocio, DNI..."
            className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none ${themeColors.ring} focus:ring-2 bg-slate-50 transition-all`}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[950px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Cliente</th>
                <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Identificación</th>
                <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Teléfono</th>
                <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Ubicación / Dirección</th>
                <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Alertas / Estado</th>
                <th className="p-4 font-bold text-slate-700 text-center uppercase tracking-wider text-xs w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">No se encontraron clientes.</td>
                </tr>
              ) : (
                paginatedCustomers.map(customer => {
                  const alertStyle = customer.alertMessage ? ALERT_STYLES[customer.alertColor || 'red'] : null;
                  return (
                    <tr 
                      key={customer.id} 
                      className="hover:bg-slate-50/55 transition-colors cursor-pointer group"
                      onClick={() => openModal(customer)}
                      title="Haz clic para editar o actualizar este cliente"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base overflow-hidden flex-shrink-0 ${customer.alertMessage ? alertStyle?.badge : themeColors.badge}`}>
                            {customer.businessLogo ? (
                              <img src={customer.businessLogo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : customer.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-slate-950 truncate max-w-[200px] group-hover:text-[#51B01E] transition-colors">{customer.name}</h4>
                            {customer.businessName && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 font-bold truncate">
                                <Store size={10} className="text-slate-400" /> {customer.businessName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-mono font-bold text-slate-600">
                          <span className="text-[10px] uppercase text-slate-400 font-sans tracking-wide block">{customer.docType || 'DNI'}</span>
                          {customer.docNumber || 'S/D'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-800 text-xs text-slate-900 font-extrabold">
                            <Phone size={11} className="text-slate-400" /> {customer.phone || 'S/N'}
                          </div>
                          {customer.contacts?.[0]?.name && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase truncate">
                              {customer.contacts[0].name} <span className="lowercase font-normal text-slate-400">({customer.contacts[0].type || 'Contacto'})</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-0.5 max-w-[250px]">
                          <div className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider inline-block ${themeColors.badge}`}>
                            {customer.zone} | {customer.district}
                          </div>
                          {customer.address && (
                            <p className="text-xs text-slate-500 font-semibold truncate block" title={customer.address}>
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {customer.alertMessage ? (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black uppercase ${alertStyle?.border} ${alertStyle?.bg} ${alertStyle?.text}`}>
                            <AlertTriangle size={12} className={alertStyle?.icon} />
                            <span>{customer.alertMessage}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider font-semibold">
                            ● Activo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openModal(customer)} className={`p-2 bg-[#51B01E]/10 text-[#51B01E] hover:bg-[#51B01E]/20 rounded-xl transition-all`} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setCustomerToDelete(customer)} className={`p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all`} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mostrando <span className="text-slate-850 font-extrabold">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="text-slate-850 font-extrabold">
                {Math.min(currentPage * itemsPerPage, filteredCustomers.length)}
              </span>{' '}
              de <span className="text-slate-850 font-extrabold">{filteredCustomers.length}</span> clientes
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 disabled:opacity-50 disabled:hover:bg-slate-50 transition-all select-none cursor-pointer"
              >
                Anterior
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Only show a few page buttons if there are too many pages
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-400 select-none">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#51B01E] text-white shadow-md font-extrabold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 disabled:opacity-50 disabled:hover:bg-slate-50 transition-all select-none cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Delete Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Cliente?</h3>
            <p className="text-slate-500 mb-6 text-sm">Eliminar a <span className="font-bold text-slate-800">{customerToDelete.name}</span>.</p>
            <div className="flex gap-3">
              <button onClick={() => setCustomerToDelete(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal REDESIGNED */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-8 shadow-2xl my-8 relative">
            <button onClick={closeModal} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X size={28} />
            </button>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-800">
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Lado Izquierdo: Datos Maestros */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText size={18} className={`${themeColors.text}`} />
                    <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Identificación y Datos</h4>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-1/3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Tipo Doc.</label>
                      <select 
                        className={`w-full px-3 py-3 border border-slate-200 rounded-xl outline-none bg-white text-sm shadow-sm transition-all focus:ring-2 ${themeColors.ring}`}
                        value={formData.docType || 'DNI'}
                        onChange={e => setFormData({...formData, docType: e.target.value as any})}
                      >
                        <option value="DNI">DNI</option>
                        <option value="RUC">RUC</option>
                        <option value="CE">C.E.</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Número</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          className={`flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none font-mono text-sm shadow-sm focus:ring-2 ${themeColors.ring}`}
                          value={formData.docNumber || ''}
                          onChange={e => setFormData({...formData, docNumber: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchDoc();
                            }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={handleSearchDoc}
                          className={`px-4 text-white rounded-xl shadow-sm hover:brightness-105 active:scale-95 transition-all ${themeColors.primary || 'bg-[#51B01E]'}`}
                        >
                          {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Nombre / Razón Social</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 ${themeColors.ring} uppercase font-bold`}
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                      />
                    </div>
                    {/* Etiquetas de Estado SUNAT */}
                    {(formData.sunatStatus || formData.sunatCondition) && (
                      <div className="flex gap-1.5 mt-2 pl-2">
                        {formData.sunatStatus && (
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${
                            formData.sunatStatus.toUpperCase() === 'ACTIVO'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            SUNAT: {formData.sunatStatus}
                          </span>
                        )}
                        {formData.sunatCondition && (
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${
                            formData.sunatCondition.toUpperCase() === 'HABIDO'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}>
                            Condición: {formData.sunatCondition}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Nombre Comercial</label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 ${themeColors.ring}`}
                          value={formData.businessName || ''}
                          onChange={e => setFormData({...formData, businessName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Zona de Venta</label>
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                          className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none bg-white text-sm shadow-sm focus:ring-2 ${themeColors.ring}`}
                          value={formData.zone || ''}
                          onChange={e => setFormData({...formData, zone: e.target.value})}
                        >
                          {zones.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase">Teléfonos de Contacto (Máx 3)</h5>
                      <button 
                        type="button" 
                        onClick={addContactField} 
                        disabled={(formData.contacts || []).length >= 3}
                        className={`text-xs font-bold ${themeColors.text} hover:opacity-80 disabled:opacity-30`}
                      >
                        + Agregar Fila
                      </button>
                    </div>
                    {(formData.contacts || []).map((contact, idx) => (
                      <div key={idx} className="flex gap-2 items-end animate-fade-in">
                        <div className="flex-1">
                          <input 
                            placeholder="Nombre"
                            className="w-full px-3 py-2 border rounded-lg text-xs"
                            value={contact.name}
                            onChange={e => handleContactChange(idx, 'name', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            placeholder="Teléfono"
                            className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                            value={contact.phone}
                            onChange={e => handleContactChange(idx, 'phone', e.target.value)}
                          />
                        </div>
                        <div className="w-24">
                          <input 
                            placeholder="Tipo (Ej: Dueño)"
                            className="w-full px-3 py-2 border rounded-lg text-[10px] uppercase font-bold"
                            value={contact.type}
                            onChange={e => handleContactChange(idx, 'type', e.target.value.toUpperCase())}
                          />
                        </div>
                        {idx > 0 && (
                          <button type="button" onClick={() => removeContactField(idx)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lado Derecho: Ubicación y Logo */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MapPin size={18} className={`${themeColors.text}`} />
                    <h4 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Ubicación y Negocio</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Departamento</label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase shadow-sm focus:ring-2 ${themeColors.ring}`}
                        placeholder="Ej. LIMA"
                        value={formData.department || ''}
                        onChange={e => setFormData({...formData, department: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Provincia</label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase shadow-sm focus:ring-2 ${themeColors.ring}`}
                        placeholder="Ej. LIMA"
                        value={formData.province || ''}
                        onChange={e => setFormData({...formData, province: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Distrito</label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase shadow-sm focus:ring-2 ${themeColors.ring}`}
                        placeholder="Ej. LOS OLIVOS"
                        value={formData.district || ''}
                        onChange={e => setFormData({...formData, district: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">UBIGEO</label>
                      <input
                        type="text"
                        placeholder="Ej. 150117"
                        maxLength={6}
                        className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold font-mono shadow-sm focus:ring-2 ${themeColors.ring}`}
                        value={formData.ubigeo || ''}
                        onChange={e => setFormData({...formData, ubigeo: e.target.value.replace(/\D/g, '')})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Dirección Exacta</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 ${themeColors.ring}`}
                        value={formData.address || ''}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="Av. Principal 123..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Logo Negocio</label>
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="h-24 w-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden"
                      >
                        {formData.businessLogo ? (
                          <img src={formData.businessLogo} className="h-full w-full object-contain" />
                        ) : (
                          <>
                            <Camera size={20} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 mt-1">SUBIR LOGO</span>
                          </>
                        )}
                        <input type="file" hidden ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Link Google Maps</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                        <textarea
                          rows={3}
                          className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none text-xs shadow-sm focus:ring-2 ${themeColors.ring} resize-none`}
                          value={formData.googleMapsUrl || ''}
                          onChange={e => setFormData({...formData, googleMapsUrl: e.target.value})}
                          placeholder="Pegue aquí el link de mapas..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <label className="block text-[10px] font-black text-orange-600 uppercase mb-2">Mensaje Crítico / Alerta</label>
                    <input 
                      className="w-full px-4 py-3 border border-orange-200 rounded-xl outline-none text-sm font-bold bg-white"
                      placeholder="Ej. CLIENTE CON DEUDA ANTIGUA"
                      value={formData.alertMessage || ''}
                      onChange={e => setFormData({...formData, alertMessage: e.target.value})}
                    />
                    <div className="flex gap-3 mt-4">
                      {['red', 'orange', 'blue', 'green'].map(c => (
                        <button 
                          key={c}
                          type="button"
                          onClick={() => setFormData({...formData, alertColor: c as any})}
                          className={`w-8 h-8 rounded-full shadow-sm transition-all ${formData.alertColor === c ? 'ring-4 ring-white ring-offset-2 scale-110' : 'opacity-40'}`}
                          style={{ backgroundColor: c === 'red' ? '#ef4444' : c === 'orange' ? '#f97316' : c === 'blue' ? '#3b82f6' : '#22c55e' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                  Cancelar
                </button>
                <button type="submit" className={`flex-[2] py-4 rounded-2xl text-white font-bold shadow-xl transition-all ${themeColors.primary || 'bg-[#51B01E]'} ${themeColors.hover || 'hover:bg-[#439618]'} active:scale-[0.98]`}>
                  {editingId ? 'Actualizar Cliente' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
