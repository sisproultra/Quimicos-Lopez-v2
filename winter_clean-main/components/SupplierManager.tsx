
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Supplier } from '../types';
import { Plus, Search, Trash2, Edit2, User, Phone, MapPin, X, AlertTriangle, Briefcase, Mail, FileText, Loader2, Store, ShoppingBag, DollarSign } from 'lucide-react';
import { searchClient } from '../services/clientService';

export const SupplierManager: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, themeStyles: themeColors, currency, purchases, apiToken } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // API Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Delete Modal State
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Supplier>>({
    docType: 'RUC',
    docNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.docNumber) return;

    if (editingId) {
      updateSupplier({ ...formData, id: editingId } as Supplier);
    } else {
      addSupplier({ ...formData, id: Date.now().toString() } as Supplier);
    }
    closeModal();
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  };

  const openModal = (supplier?: Supplier) => {
    setSearchError(null);
    if (supplier) {
      setEditingId(supplier.id);
      setFormData(supplier);
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', 
        docType: 'RUC',
        docNumber: '',
        contactName: '',
        phone: '', 
        address: '', 
        email: '', 
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ docType: 'RUC', docNumber: '' });
    setEditingId(null);
    setSearchError(null);
  };

  const handleSearchDoc = async () => {
      const docType = formData.docType || 'RUC';
      if (!formData.docNumber) return;
      
      if (!apiToken) {
          setSearchError('API Token no configurado. Contacte al programador.');
          return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
          const result = await searchClient(docType, formData.docNumber, apiToken);
          if (result) {
              setFormData(prev => ({
                  ...prev,
                  name: result.name,
                  address: result.address || prev.address
              }));
          } else {
              setSearchError('No se encontraron datos para este número.');
          }
      } catch (err) {
          setSearchError('Error técnico al consultar el servicio.');
      } finally {
          setIsSearching(false);
      }
  };

  const filteredSuppliers = suppliers.filter(s => 
    !s.deleted && (
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        s.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        s.docNumber?.includes(searchTerm)
    )
  );

  const getSupplierStats = (supplierId: string) => {
      const supplierPurchases = purchases.filter(p => p.supplierId === supplierId && !p.deleted);
      const totalPurchased = supplierPurchases.reduce((sum, p) => sum + p.total, 0);
      const purchaseCount = supplierPurchases.length;
      return { totalPurchased, purchaseCount };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Briefcase size={28} className="text-indigo-600" />
                Gestión de Proveedores
            </h2>
            <p className="text-slate-500">Cree y administre sus proveedores de materia prima.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-lg active:scale-95`}
        >
          <Plus size={20} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC, contacto..."
            className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none ${themeColors.ring} focus:ring-2 bg-slate-50 transition-all`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 italic">
                  No se encontraron proveedores registrados.
              </div>
          ) : filteredSuppliers.map(supplier => {
            const stats = getSupplierStats(supplier.id);
            return (
            <div key={supplier.id} className="p-5 rounded-2xl border border-slate-200 transition-all bg-white group flex flex-col hover:border-indigo-300 hover:shadow-md relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${themeColors.badge}`}>
                     {supplier.name.charAt(0)}
                   </div>
                   <div>
                     <h3 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate max-w-[150px]">
                        {supplier.name}
                     </h3>
                     <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200 mt-1 inline-block uppercase">
                        {supplier.docType}: {supplier.docNumber}
                     </span>
                   </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(supplier)} className={`p-2 text-slate-400 hover:${themeColors.text} hover:${themeColors.bgLight} rounded-lg`}>
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setSupplierToDelete(supplier)} 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600 flex-1">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span>{supplier.phone}</span>
                </div>
                {supplier.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 mt-0.5" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className={`p-1.5 rounded-full ${themeColors.bgLight} ${themeColors.text}`}>
                            <DollarSign size={12} strokeWidth={3} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Total</p>
                            <p className={`text-sm font-bold ${themeColors.text}`}>{currency} {stats.totalPurchased.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-full bg-slate-100 text-slate-500">
                            <ShoppingBag size={12} strokeWidth={3} />
                        </div>
                         <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Compras</p>
                            <p className="text-sm font-bold text-slate-700">{stats.purchaseCount}</p>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )})}
        </div>
      </div>

      {/* Modal Formulario Proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={28} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div className="flex gap-4">
                          <div className="w-1/3">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Tipo Doc.</label>
                              <select 
                                  className={`w-full px-3 py-3 border border-slate-200 rounded-xl ${themeColors.ring} focus:ring-2 outline-none bg-white text-sm shadow-sm transition-all`}
                                  value={formData.docType || 'RUC'}
                                  onChange={e => setFormData({...formData, docType: e.target.value as any})}
                              >
                                  <option value="RUC">RUC</option>
                                  <option value="DNI">DNI</option>
                              </select>
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Número</label>
                              <div className="flex gap-2">
                                  <div className="relative flex-1">
                                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                      <input
                                          required
                                          type="tel"
                                          className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl ${themeColors.ring} focus:ring-2 outline-none font-mono text-sm shadow-sm transition-all`}
                                          value={formData.docNumber || ''}
                                          onChange={e => setFormData({...formData, docNumber: e.target.value})}
                                      />
                                  </div>
                                  <button 
                                      type="button"
                                      onClick={handleSearchDoc}
                                      disabled={isSearching || !formData.docNumber}
                                      className={`px-4 rounded-xl text-white ${themeColors.primary} ${themeColors.hover} disabled:opacity-50 transition-all shadow-md active:scale-95`}
                                  >
                                      {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                                  </button>
                              </div>
                          </div>
                      </div>
                      
                      {searchError && (
                          <div className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-fade-in">
                              <AlertTriangle size={14} /> {searchError}
                          </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Razón Social</label>
                        <div className="relative">
                          <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            required
                            className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl ${themeColors.ring} focus:ring-2 outline-none text-sm shadow-sm transition-all font-medium text-slate-800`}
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Teléfono</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            required
                            className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl ${themeColors.ring} focus:ring-2 outline-none text-sm shadow-sm transition-all`}
                            value={formData.phone || ''}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Dirección</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            className={`w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl ${themeColors.ring} focus:ring-2 outline-none text-sm shadow-sm transition-all`}
                            value={formData.address || ''}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                          />
                        </div>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">
                    Cancelar
                  </button>
                  <button type="submit" className={`flex-[2] py-4 rounded-2xl text-white font-bold shadow-xl transition-all ${themeColors.primary} hover:brightness-110 active:scale-[0.98]`}>
                    Guardar Proveedor
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
