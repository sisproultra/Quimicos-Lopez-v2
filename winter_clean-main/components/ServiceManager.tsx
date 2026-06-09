
import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../App';
import { Service } from '../types';
import { Plus, Trash2, Edit2, X, Tag, Grid, AlertTriangle, Info, Package, CheckSquare, Square, Upload, Image as ImageIcon, Box, Sparkles } from 'lucide-react';

export const ServiceManager: React.FC = () => {
  const { 
      services, addService, updateService, deleteService, 
      categories, units, 
      themeStyles: themeColors, currency 
  } = useContext(AppContext);
  
  // Tab State: 'ALL' | 'SERVICES' | 'PRODUCTS'
  const [activeTab, setActiveTab] = useState<'ALL' | 'SERVICES' | 'PRODUCTS'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Initialize form
  const [formData, setFormData] = useState<Partial<Service>>({});
  
  // Image upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    // Enrich data with Category Name and Unit Name for backward compatibility/search
    const selectedCat = categories.find(c => c.id === formData.categoryId);
    
    // Auto-set trackStock based on current View if creating new
    let trackStockValue = formData.trackStock;
    if (!editingId) {
        // If creating new in "PRODUCTS" tab, force trackStock true
        if (activeTab === 'PRODUCTS') trackStockValue = true;
        // If creating new in "SERVICES" tab, force trackStock false
        if (activeTab === 'SERVICES') trackStockValue = false;
    }

    const finalData: Service = {
        ...formData,
        id: editingId || Date.now().toString(),
        category: selectedCat ? selectedCat.name : (formData.category || 'General'), // Fallback
        unit: formData.unit || 'unidad',
        trackStock: trackStockValue,
        // Ensure stock defaults to 0 if tracking is enabled but no stock entered
        stock: trackStockValue ? (formData.stock || 0) : undefined 
    } as Service;

    if (editingId) {
      updateService(finalData);
    } else {
      addService(finalData);
    }
    closeModal();
  };

  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteService(serviceToDelete.id);
      setServiceToDelete(null);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingId(service.id);
      setFormData(service);
    } else {
      setEditingId(null);
      // Default to first category and its unit
      const defaultCat = categories[0];
      const defaultUnit = units.find(u => u.id === defaultCat?.unitId);
      
      const defaultTrackStock = activeTab === 'PRODUCTS';

      setFormData({ 
          name: '', 
          price: 0, 
          categoryId: defaultCat?.id || '', 
          category: defaultCat?.name || '',
          unit: defaultUnit?.symbol || 'unidad', 
          description: '',
          trackStock: defaultTrackStock,
          stock: 0,
          imageUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const handleCategoryChange = (catId: string) => {
      const cat = categories.find(c => c.id === catId);
      if (cat) {
          const defaultUnit = units.find(u => u.id === cat.unitId);
          setFormData(prev => ({
              ...prev,
              categoryId: cat.id,
              category: cat.name,
              unit: defaultUnit ? defaultUnit.symbol : prev.unit
          }));
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX_WIDTH = 300; 
                  const MAX_HEIGHT = 300;
                  let width = img.width;
                  let height = img.height;

                  if (width > height) {
                      if (width > MAX_WIDTH) {
                          height *= MAX_WIDTH / width;
                          width = MAX_WIDTH;
                      }
                  } else {
                      if (height > MAX_HEIGHT) {
                          width *= MAX_HEIGHT / height;
                          height = MAX_HEIGHT;
                      }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx?.drawImage(img, 0, 0, width, height);
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
              };
              img.src = event.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  // Filter Logic based on Tab and Soft Delete
  const filteredServices = services.filter(s => {
      if (s.deleted) return false;
      if (activeTab === 'SERVICES') return !s.trackStock;
      if (activeTab === 'PRODUCTS') return s.trackStock;
      return true; // ALL
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Gestión de Catálogo</h2>
            <p className="text-slate-500">Administra tus servicios y productos de venta.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-md`}
        >
          <Plus size={20} /> Nuevo {activeTab === 'PRODUCTS' ? 'Producto' : activeTab === 'SERVICES' ? 'Servicio' : 'Item'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Grid size={16} /> Todos
          </button>
          <button
            onClick={() => setActiveTab('SERVICES')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'SERVICES' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Sparkles size={16} /> Servicios (Lavado)
          </button>
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'PRODUCTS' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
              <Package size={16} /> Productos (Venta)
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredServices.map(service => (
          <div key={service.id} className={`bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col group hover:${themeColors.border} transition-all overflow-hidden relative`}>
            {/* ... Service Card Render ... */}
            {service.imageUrl && (
                <div className="h-32 w-full bg-slate-100 relative">
                    <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
            )}

            {/* Stock Badge Overlay */}
            {service.trackStock && (
                <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-lg border shadow-sm z-10
                    ${(service.stock || 0) <= 5 
                        ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                        : (service.stock || 0) <= 20 
                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : 'bg-green-100 text-green-700 border-green-200'
                    }`}>
                    Stock: {service.stock}
                </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
                {!service.imageUrl && (
                    <div className="flex justify-between items-start mb-4">
                        <div className={`${themeColors.bgLight} ${themeColors.text} p-3 rounded-xl`}>
                            {service.trackStock ? <Package size={24} /> : <Tag size={24} />}
                        </div>
                    </div>
                )}
                
                <div className="mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${themeColors.text} bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100`}>
                        {service.category || 'General'}
                    </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{service.name}</h3>
                <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">{service.description || 'Sin descripción'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">
                        /{service.unit}
                    </span>
                    <span className={`text-xl font-bold ${themeColors.text}`}>
                        {currency} {service.price.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Actions Overlay (visible on hover) */}
            <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button onClick={() => openModal(service)} className="p-2 bg-white text-slate-500 hover:text-blue-600 rounded-lg shadow-sm hover:shadow-md border border-slate-100 transition-colors">
                    <Edit2 size={14} />
                </button>
                <button 
                    onClick={() => setServiceToDelete(service)}
                    className="p-2 bg-white text-slate-500 hover:text-red-600 rounded-lg shadow-sm hover:shadow-md border border-slate-100 transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Item?</h3>
            <p className="text-slate-500 mb-6 text-sm">
              Estás a punto de eliminar <span className="font-bold text-slate-800">{serviceToDelete.name}</span>. (Soft Delete)
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* ... Form Logic ... */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Editar Item' : 'Nuevo Item'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload Section */}
              <div className="flex justify-center">
                  <div 
                    className="w-32 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                      {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                          <div className="text-center text-slate-400">
                              <ImageIcon size={24} className="mx-auto mb-1" />
                              <span className="text-[10px] font-bold">Subir Foto</span>
                          </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload size={20} className="text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lavado de Edredón, Detergente..."
                  className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`}
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                   <div className="relative">
                      <Grid className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        required
                        className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none bg-white appearance-none`}
                        value={formData.categoryId || ''}
                        onChange={e => handleCategoryChange(e.target.value)}
                      >
                        <option value="" disabled>Seleccionar...</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Precio ({currency})</label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currency}</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className={`w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`}
                        value={formData.price || ''}
                        onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                      />
                   </div>
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Unidad de Medida</label>
                 <select 
                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none bg-white`}
                    value={formData.unit || ''}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                 >
                   {units.map(u => (
                       <option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>
                   ))}
                 </select>
              </div>

              {/* Stock Control Toggle */}
              <div className={`p-4 rounded-xl border transition-all ${formData.trackStock ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                   <div 
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => setFormData({...formData, trackStock: !formData.trackStock})}
                   >
                        <div className={`transition-colors ${formData.trackStock ? 'text-blue-600' : 'text-slate-300'}`}>
                             {formData.trackStock ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                        <div className="flex-1">
                             <p className={`font-bold text-sm ${formData.trackStock ? 'text-blue-800' : 'text-slate-600'}`}>
                                 Es un Producto Físico
                             </p>
                             <p className="text-xs text-slate-400">
                                 Habilita el control de stock (inventario)
                             </p>
                        </div>
                   </div>
                   
                   {formData.trackStock && (
                       <div className="mt-3 animate-fade-in">
                           <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Stock Inicial</label>
                           <input
                                type="number"
                                min="0"
                                className="w-full px-4 py-2 border border-blue-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-300 text-lg font-bold text-slate-800"
                                value={formData.stock || 0}
                                onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                           />
                       </div>
                   )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none resize-none`}
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className={`w-full ${themeColors.primary} ${themeColors.hover} text-white font-bold py-3 rounded-xl mt-4 shadow-lg transition-all`}
              >
                Guardar Item
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
