
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Category, WashType, MeasurementUnit } from '../types';
import { 
    Plus, Trash2, Edit2, X, Layers, Droplets, Ruler, 
    Shirt, BedDouble, Footprints, Scissors, Thermometer, Sparkles, Package, Home, Briefcase, Zap 
} from 'lucide-react';

// Available Icons for Categories
const AVAILABLE_ICONS = ['Shirt', 'BedDouble', 'Footprints', 'Scissors', 'Thermometer', 'Sparkles', 'Package', 'Home', 'Briefcase', 'Zap'];

const IconComponent = ({ name, size = 18 }: { name: string, size?: number }) => {
    switch(name) {
        case 'Shirt': return <Shirt size={size} />;
        case 'BedDouble': return <BedDouble size={size} />;
        case 'Footprints': return <Footprints size={size} />;
        case 'Scissors': return <Scissors size={size} />;
        case 'Thermometer': return <Thermometer size={size} />;
        case 'Sparkles': return <Sparkles size={size} />;
        case 'Package': return <Package size={size} />;
        case 'Home': return <Home size={size} />;
        case 'Briefcase': return <Briefcase size={size} />;
        case 'Zap': return <Zap size={size} />;
        default: return <Layers size={size} />;
    }
};

export const CategoryManager: React.FC = () => {
  const { 
      categories, addCategory, updateCategory, deleteCategory,
      washTypes, addWashType, deleteWashType,
      units, addUnit, deleteUnit,
      themeStyles: themeColors 
  } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState<'categories' | 'washTypes' | 'units'>('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'category' | 'washType' | 'unit' } | null>(null);

  // --- Form States ---
  const [catForm, setCatForm] = useState<Partial<Category>>({ icon: 'Shirt', deliveryTimeHours: 24 });
  const [washForm, setWashForm] = useState<Partial<WashType>>({});
  const [unitForm, setUnitForm] = useState<Partial<MeasurementUnit>>({});

  // --- Handlers ---
  const openModal = (item?: any) => {
      setEditingId(item ? item.id : null);
      if (activeTab === 'categories') {
          setCatForm(item || { name: '', icon: 'Shirt', washTypeId: washTypes.find(w => !w.deleted)?.id || '', unitId: units.find(u => !u.deleted)?.id || '', deliveryTimeHours: 24 });
      } else if (activeTab === 'washTypes') {
          setWashForm(item || { name: '', description: '' });
      } else {
          setUnitForm(item || { name: '', symbol: '' });
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setCatForm({});
      setWashForm({});
      setUnitForm({});
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (activeTab === 'categories') {
          if (!catForm.name || !catForm.washTypeId || !catForm.unitId) return;
          const payload = { ...catForm, id: editingId || Date.now().toString() } as Category;
          editingId ? updateCategory(payload) : addCategory(payload);
      } else if (activeTab === 'washTypes') {
          if (!washForm.name) return;
          const payload = { ...washForm, id: editingId || Date.now().toString() } as WashType;
          editingId ? null : addWashType(payload); 
      } else {
          if (!unitForm.name || !unitForm.symbol) return;
          const payload = { ...unitForm, id: editingId || Date.now().toString() } as MeasurementUnit;
          editingId ? null : addUnit(payload); 
      }
      closeModal();
  };

  const confirmDelete = () => {
      if (!itemToDelete) return;
      if (itemToDelete.type === 'category') deleteCategory(itemToDelete.id);
      if (itemToDelete.type === 'washType') deleteWashType(itemToDelete.id);
      if (itemToDelete.type === 'unit') deleteUnit(itemToDelete.id);
      setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
             <h2 className="text-2xl font-bold text-slate-800">Configuración Operativa</h2>
             <p className="text-slate-500">Gestiona categorías, tipos de lavado y unidades.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-md`}
        >
          <Plus size={20} /> Nuevo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Layers size={16} /> Categorías
        </button>
        <button onClick={() => setActiveTab('washTypes')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'washTypes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Droplets size={16} /> Tipos Lavado
        </button>
        <button onClick={() => setActiveTab('units')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'units' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Ruler size={16} /> Unidades
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         
         {/* Categories Table */}
         {activeTab === 'categories' && (
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                         <tr>
                             <th className="p-4">Categoría</th>
                             <th className="p-4">Tipo Lavado</th>
                             <th className="p-4">Unidad</th>
                             <th className="p-4">Tiempo Entrega</th>
                             <th className="p-4 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {categories.filter(c => !c.deleted).map(cat => {
                             const wt = washTypes.find(w => w.id === cat.washTypeId);
                             const un = units.find(u => u.id === cat.unitId);
                             return (
                                 <tr key={cat.id} className="hover:bg-slate-50">
                                     <td className="p-4 flex items-center gap-3 font-bold text-slate-700">
                                         <div className={`p-2 rounded-lg ${themeColors.bgLight} ${themeColors.text}`}>
                                             <IconComponent name={cat.icon} />
                                         </div>
                                         {cat.name}
                                     </td>
                                     <td className="p-4 text-sm text-slate-600">{wt?.name || '-'}</td>
                                     <td className="p-4 text-sm text-slate-600">{un?.name || '-'} ({un?.symbol})</td>
                                     <td className="p-4 text-sm font-medium text-blue-600">{cat.deliveryTimeHours} horas</td>
                                     <td className="p-4 text-right flex justify-end gap-2">
                                         <button onClick={() => openModal(cat)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                         <button onClick={() => setItemToDelete({id: cat.id, type: 'category'})} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
         )}

         {/* Wash Types Table */}
         {activeTab === 'washTypes' && (
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                         <tr>
                             <th className="p-4">Nombre</th>
                             <th className="p-4">Descripción</th>
                             <th className="p-4 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {washTypes.filter(w => !w.deleted).map(wt => (
                             <tr key={wt.id} className="hover:bg-slate-50">
                                 <td className="p-4 font-bold text-slate-700">{wt.name}</td>
                                 <td className="p-4 text-sm text-slate-500">{wt.description}</td>
                                 <td className="p-4 text-right">
                                     <button onClick={() => setItemToDelete({id: wt.id, type: 'washType'})} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}

         {/* Units Table */}
         {activeTab === 'units' && (
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                         <tr>
                             <th className="p-4">Nombre Unidad</th>
                             <th className="p-4">Símbolo</th>
                             <th className="p-4 text-right">Acciones</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {units.filter(u => !u.deleted).map(u => (
                             <tr key={u.id} className="hover:bg-slate-50">
                                 <td className="p-4 font-bold text-slate-700">{u.name}</td>
                                 <td className="p-4 font-mono text-sm text-slate-500 bg-slate-100 rounded px-2 w-fit">{u.symbol}</td>
                                 <td className="p-4 text-right">
                                     <button onClick={() => setItemToDelete({id: u.id, type: 'unit'})} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </div>

      {/* Modals */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">
                          {editingId ? 'Editar' : 'Crear'} {activeTab === 'categories' ? 'Categoría' : activeTab === 'washTypes' ? 'Tipo de Lavado' : 'Unidad'}
                      </h3>
                      <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Category Form */}
                      {activeTab === 'categories' && (
                          <>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Categoría</label>
                                 <input required className="w-full p-2 border rounded-lg outline-none focus:ring-2 ring-blue-100" value={catForm.name || ''} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="Ej. Ropa de Cama" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-2">Icono</label>
                                 <div className="flex flex-wrap gap-2">
                                     {AVAILABLE_ICONS.map(icon => (
                                         <button type="button" key={icon} onClick={() => setCatForm({...catForm, icon})} className={`p-2 rounded-lg border ${catForm.icon === icon ? `${themeColors.bgLight} ${themeColors.border} ${themeColors.text}` : 'border-slate-200 text-slate-400'}`}>
                                             <IconComponent name={icon} />
                                         </button>
                                     ))}
                                 </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="block text-sm font-medium text-slate-700 mb-1">Tipo Lavado</label>
                                     <select className="w-full p-2 border rounded-lg bg-white" value={catForm.washTypeId || ''} onChange={e => setCatForm({...catForm, washTypeId: e.target.value})}>
                                         {washTypes.filter(w => !w.deleted).map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                                     </select>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                                     <select className="w-full p-2 border rounded-lg bg-white" value={catForm.unitId || ''} onChange={e => setCatForm({...catForm, unitId: e.target.value})}>
                                         {units.filter(u => !u.deleted).map(u => <option key={u.id} value={u.id}>{u.symbol}</option>)}
                                     </select>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo Entrega (Horas)</label>
                                 <input type="number" className="w-full p-2 border rounded-lg" value={catForm.deliveryTimeHours || ''} onChange={e => setCatForm({...catForm, deliveryTimeHours: parseInt(e.target.value)})} />
                             </div>
                          </>
                      )}

                      {/* Wash Type Form */}
                      {activeTab === 'washTypes' && (
                          <>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                 <input required className="w-full p-2 border rounded-lg" value={washForm.name || ''} onChange={e => setWashForm({...washForm, name: e.target.value})} placeholder="Ej. Lavado en Seco" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                 <textarea className="w-full p-2 border rounded-lg resize-none" value={washForm.description || ''} onChange={e => setWashForm({...washForm, description: e.target.value})} placeholder="Breve descripción del proceso..." />
                              </div>
                          </>
                      )}

                      {/* Unit Form */}
                      {activeTab === 'units' && (
                          <>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Unidad</label>
                                 <input required className="w-full p-2 border rounded-lg" value={unitForm.name || ''} onChange={e => setUnitForm({...unitForm, name: e.target.value})} placeholder="Ej. Kilogramo" />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Símbolo</label>
                                 <input required className="w-full p-2 border rounded-lg" value={unitForm.symbol || ''} onChange={e => setUnitForm({...unitForm, symbol: e.target.value})} placeholder="Ej. kg" />
                              </div>
                          </>
                      )}

                      <button type="submit" className={`w-full py-3 rounded-xl ${themeColors.primary} text-white font-bold shadow-lg mt-4`}>
                          Guardar
                      </button>
                  </form>
              </div>
          </div>
      )}
      
      {/* Delete Modal */}
      {itemToDelete && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
               <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Trash2 size={32} />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Elemento?</h3>
               <p className="text-slate-500 mb-6 text-sm">
                 Esta acción no se puede deshacer y ocultará este elemento de todas las vistas activas.
               </p>
               <div className="flex gap-3">
                 <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
                 <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg">Eliminar</button>
               </div>
            </div>
          </div>
      )}
    </div>
  );
};
