
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { Service, Ingredient } from '../types';
import { Plus, Trash2, Edit2, Package, Beaker, Save, Search, FileText, X, AlertTriangle, Wand2 } from 'lucide-react';

const SUNAT_UNITS = [
  { symbol: 'UNIDAD', name: 'UNIDAD (NIU)' },
  { symbol: 'KILOGRAMO', name: 'KILOGRAMO (KGM)' },
  { symbol: 'LITRO', name: 'LITRO (LTR)' },
  { symbol: 'GALON', name: 'GALON (GLI)' },
  { symbol: 'GRAMO', name: 'GRAMO (GRM)' },
  { symbol: 'MILILITRO', name: 'MILILITRO (MLT)' },
  { symbol: 'METRO', name: 'METRO (MTR)' },
  { symbol: 'CAJA', name: 'CAJA (BX)' },
  { symbol: 'PAQUETE', name: 'PAQUETE (PK)' }
];

export const InventoryManager: React.FC = () => {
  const { services, addProduct, updateProduct, deleteProduct, categories, units, themeStyles, currency } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'insumos' | 'productos'>('productos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Delete Modal
  const [itemToDelete, setItemToDelete] = useState<Service | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Service>>({});
  
  // Recipe Builder State (local to form)
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Reset page when switching tabs or changing search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Filter Deleted
  const activeServices = services.filter(s => !s.deleted);
  const rawMaterials = activeServices.filter(s => s.type === 'INSUMO');
  const finishedProducts = activeServices.filter(s => s.type === 'PRODUCTO_TERMINADO');
  
  const displayedItems = activeTab === 'insumos' ? rawMaterials : finishedProducts;
  const filteredItems = displayedItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.internalCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Alphanumeric Code Generator
  const generateAutoCode = (name: string) => {
    const prefix = name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix || 'PROD'}-${random}`;
  };

  useEffect(() => {
    if (isModalOpen && !editingId && formData.name && !formData.internalCode) {
        setFormData(prev => ({ ...prev, internalCode: generateAutoCode(prev.name || '') }));
    }
  }, [formData.name, isModalOpen, editingId]);

  const openModal = (item?: Service) => {
      if (item) {
          setEditingId(item.id);
          setFormData(item);
          setRecipeIngredients(item.recipe || []);
      } else {
          setEditingId(null);
          setFormData({
              type: activeTab === 'insumos' ? 'INSUMO' : 'PRODUCTO_TERMINADO',
              trackStock: true,
              stock: 0,
              unit: 'UNIDAD',
              minProduceQty: 1
          });
          setRecipeIngredients([]);
      }
      setIsModalOpen(true);
  };

  const handleAddIngredient = (insumo: Service) => {
      const exists = recipeIngredients.find(i => i.id === insumo.id);
      if (exists) return;
      setRecipeIngredients([...recipeIngredients, { id: insumo.id, name: insumo.name, quantity: 1, unit: insumo.unit }]);
  };

  const updateIngredientQty = (id: string, qty: number) => {
      setRecipeIngredients(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeIngredient = (id: string) => {
      setRecipeIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name) return;

      const finalData: Service = {
          ...formData,
          id: editingId || Date.now().toString(),
          category: formData.category || 'General',
          recipe: formData.type === 'PRODUCTO_TERMINADO' ? recipeIngredients : undefined
      } as Service;

      if (editingId) updateProduct(finalData);
      else addProduct(finalData);
      
      setIsModalOpen(false);
  };

  const confirmDelete = () => {
      if(itemToDelete) {
          deleteProduct(itemToDelete.id);
          setItemToDelete(null);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Catálogo de Productos</h2>
                <p className="text-slate-500">Gestiona el catálogo de productos y precios para su venta.</p>
            </div>
            <button onClick={() => openModal()} className={`${themeStyles.primary} text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all`}>
                <Plus size={20} /> CREAR NUEVO PRODUCTO
            </button>
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ring-blue-100"
                placeholder="Buscar productos por nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Table representation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Código</th>
                  <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Nombre del Producto</th>
                  <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Categoría</th>
                  <th className="p-4 font-bold text-slate-700 uppercase tracking-wider text-xs text-right">Precio de Venta</th>
                  <th className="p-4 font-bold text-slate-700 text-right uppercase tracking-wider text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                      No se encontraron {activeTab === 'insumos' ? 'insumos' : 'productos terminados'}.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-4 font-bold font-mono text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded select-all">{item.internalCode || 'S/C'}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-900 text-sm md:text-base">{item.name}</td>
                      <td className="p-4 text-slate-600 font-medium">{item.category}</td>
                      <td className="p-4 font-extrabold text-slate-900 text-right text-sm md:text-base">
                        {currency} {item.price.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openModal(item)} className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setItemToDelete(item)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Mostrando <span className="text-slate-800 font-extrabold">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="text-slate-800 font-extrabold">
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                </span>{' '}
                de <span className="text-slate-800 font-extrabold">{filteredItems.length}</span> {activeTab === 'insumos' ? 'insumos' : 'productos'}
              </div>
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 disabled:opacity-50 disabled:hover:bg-white transition-all select-none cursor-pointer"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
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
                          ? 'bg-slate-900 text-white shadow-sm font-extrabold'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 disabled:opacity-50 disabled:hover:bg-white transition-all select-none cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {itemToDelete && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Item?</h3>
                    <p className="text-slate-500 mb-6 text-sm">
                        Estás a punto de eliminar <span className="font-bold text-slate-800">{itemToDelete.name}</span>. 
                        No se borrará de la base de datos, solo cambiará de estado.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setItemToDelete(null)}
                            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl my-8 flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Editar' : 'Registrar'} {activeTab === 'insumos' ? 'Insumo' : 'Producto'}</h3>
                            <p className="text-xs text-slate-500">Complete los datos del producto o insumo.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Producto</label>
                                <input 
                                    required 
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-indigo-100 transition-all font-medium" 
                                    value={formData.name || ''} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    placeholder="Nombre el produto"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Código Interno</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-indigo-100 transition-all font-mono uppercase bg-slate-50" 
                                        value={formData.internalCode || ''} 
                                        onChange={e => setFormData({...formData, internalCode: e.target.value.toUpperCase()})} 
                                        placeholder="AUTOGENERADO"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, internalCode: generateAutoCode(prev.name || '') }))}
                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm"
                                        title="Regenerar Código"
                                    >
                                        <Wand2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoría</label>
                                <select 
                                    required
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-indigo-100 transition-all bg-white font-medium" 
                                    value={formData.categoryId || ''} 
                                    onChange={e => {
                                        const cat = categories.find(c => c.id === e.target.value);
                                        setFormData({...formData, categoryId: e.target.value, category: cat?.name});
                                    }}
                                >
                                    <option value="" disabled>Seleccionar...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Unidad de Medida</label>
                                <select className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-indigo-100 transition-all bg-white font-medium" value={formData.unit || 'UNIDAD'} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                    {SUNAT_UNITS.map(u => <option key={u.symbol} value={u.symbol}>{u.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                    {activeTab === 'insumos' ? 'Costo Unitario' : 'Precio de Venta'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currency}</span>
                                    <input type="number" step="0.01" className="w-full pl-8 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-indigo-100 transition-all font-bold text-slate-800" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className={`flex-[2] py-4 rounded-2xl font-bold text-white shadow-xl ${themeStyles.primary} hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2`}
                            >
                                <Save size={20} /> Guardar {activeTab === 'insumos' ? 'Insumo' : 'Producto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
