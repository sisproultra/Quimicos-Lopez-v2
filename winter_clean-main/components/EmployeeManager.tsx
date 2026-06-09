import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Employee, ViewState } from '../types';
import { Plus, Search, Trash2, Edit2, User, Phone, MapPin, X, Shield, Camera, Eye, EyeOff, Lock, CheckSquare, Square, Flag, Map } from 'lucide-react';

const AVAILABLE_PERMISSIONS: { id: ViewState, label: string }[] = [
    { id: 'pos', label: 'Nueva Venta' },
    { id: 'quotations', label: 'Cotizaciones López' },
    { id: 'guia_remision', label: 'Guías de Remisión' },
    { id: 'inventory', label: 'Productos' },
    { id: 'customers', label: 'Clientes' },
    { id: 'purchases', label: 'Compra' },
    { id: 'sales_history', label: 'Ventas' },
    { id: 'accounts_payable', label: 'Cuentas por Pagar' },
    { id: 'finance', label: 'Cobranzas' },
    { id: 'suppliers', label: 'Proveedores' },
    { id: 'employees', label: 'Personal' },
    { id: 'settings', label: 'Configuración' }
];

const ROLE_DEFAULTS: Record<string, ViewState[]> = {
    'admin': ['pos', 'quotations', 'guia_remision', 'inventory', 'customers', 'purchases', 'sales_history', 'accounts_payable', 'finance', 'suppliers', 'employees', 'settings'],
    'cajero': ['pos', 'sales_history', 'finance', 'customers'],
    'vendedor_ruta': ['pos', 'sales_history', 'customers'],
    'operario_produccion': ['inventory', 'purchases'],
    'almacen': ['inventory', 'purchases'],
    'operario': ['pos'],
    'programmer': ['pos', 'quotations', 'guia_remision', 'inventory', 'customers', 'purchases', 'sales_history', 'accounts_payable', 'finance', 'suppliers', 'employees', 'settings']
};

export const EmployeeManager: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, themeStyles: themeColors, currentUser, zones, addZone } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    role: 'operario',
    gender: 'M',
    active: true,
    permissions: ROLE_DEFAULTS['operario'] || [],
    assignedZones: []
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.password) return;

    if (editingId) {
      updateEmployee({ ...formData, id: editingId } as Employee);
    } else {
      addEmployee({ ...formData, id: Date.now().toString() } as Employee);
    }
    closeModal();
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete.id);
      setEmployeeToDelete(null);
    }
  };

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingId(employee.id);
      setFormData({
        ...employee,
        assignedZones: employee.assignedZones || []
      });
    } else {
      setEditingId(null);
      setFormData({ 
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        role: 'operario',
        gender: 'M',
        phone: '',
        address: '',
        active: true,
        photoUrl: '',
        permissions: ROLE_DEFAULTS['operario'] || [],
        assignedZones: []
      });
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setEditingId(null);
  };

  const handleRoleChange = (role: any) => {
      setFormData(prev => ({
          ...prev,
          role: role,
          permissions: ROLE_DEFAULTS[role] || []
      }));
  };

  const togglePermission = (viewId: ViewState) => {
      setFormData(prev => {
          const current = prev.permissions || [];
          if (current.includes(viewId)) {
              return { ...prev, permissions: current.filter(p => p !== viewId) };
          } else {
              return { ...prev, permissions: [...current, viewId] };
          }
      });
  };

  const toggleZoneAssignment = (zone: string) => {
    const current = formData.assignedZones || [];
    if (current.includes(zone)) {
      setFormData({ ...formData, assignedZones: current.filter(z => z !== zone) });
    } else {
      setFormData({ ...formData, assignedZones: [...current, zone] });
    }
  };

  const handleCreateZone = () => {
    if (!newZoneName) return;
    addZone(newZoneName);
    setNewZoneName('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, photoUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (e.deleted) return false;
    if (e.role === 'programmer' && currentUser?.role !== 'programmer') {
        return false;
    }
    return (
        e.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getRoleBadge = (role: string) => {
      switch(role) {
          case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'cajero': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'programmer': return 'bg-slate-800 text-white border-slate-900';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
             <h2 className="text-2xl font-bold text-slate-800">Personal</h2>
             <p className="text-slate-500">Administra el acceso y datos de tu personal.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className={`flex items-center gap-2 ${themeColors.primary} text-white px-4 py-2 rounded-lg ${themeColors.hover} transition-colors shadow-md`}
        >
          <Plus size={20} /> Registrar Empleado
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none ${themeColors.ring} focus:ring-2`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} className={`relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group`}>
              <div className={`h-20 ${employee.role === 'programmer' ? 'bg-slate-800' : themeColors.bgLight}`}></div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(employee)} className="p-2 bg-white text-slate-500 hover:text-blue-600 rounded-full shadow-sm">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => setEmployeeToDelete(employee)} className="p-2 bg-white text-slate-500 hover:text-red-600 rounded-full shadow-sm">
                    <Trash2 size={16} />
                  </button>
              </div>
              <div className="px-6 pb-6 -mt-10">
                 <div className="flex items-end justify-between mb-4">
                     <div className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-md relative">
                        {employee.photoUrl ? (
                            <img src={employee.photoUrl} alt={employee.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} className="text-slate-400" />
                        )}
                        <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${employee.active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getRoleBadge(employee.role)}`}>
                         {employee.role}
                     </span>
                 </div>
                 <h3 className="font-bold text-lg text-slate-800">{employee.firstName} {employee.lastName}</h3>
                 <p className="text-sm text-slate-500 mb-4">@{employee.username}</p>
                 <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                       <Phone size={14} className="text-slate-400" />
                       <span>{employee.phone}</span>
                    </div>
                    {employee.address && (
                        <div className="flex items-center gap-2">
                           <MapPin size={14} className="text-slate-400" />
                           <span className="truncate">{employee.address}</span>
                        </div>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-5xl p-6 shadow-2xl my-8">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
                 <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
             </div>
             <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Col 1: Foto y Credenciales */}
                 <div className="col-span-1 space-y-6">
                     <div className="flex flex-col items-center">
                         <div className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative group mb-3">
                             {formData.photoUrl ? (
                                 <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                                 <User size={40} className="text-slate-300" />
                             )}
                             <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                 <Camera size={24} />
                                 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                             </label>
                         </div>
                         <p className="text-xs text-slate-400">Click para subir foto</p>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                             <Lock size={12} /> Credenciales
                         </h4>
                         <div className="space-y-3">
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 mb-1">Usuario</label>
                                 <input required className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ${themeColors.ring} focus:ring-2 outline-none`} value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña</label>
                                 <div className="relative">
                                     <input type={showPassword ? 'text' : 'password'} required className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm ${themeColors.ring} focus:ring-2 outline-none`} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"><Eye size={14}/></button>
                                 </div>
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-700 mb-1">Perfil / Rol</label>
                                 <select className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white ${themeColors.ring} focus:ring-2 outline-none`} value={formData.role} onChange={e => handleRoleChange(e.target.value)}>
                                     <option value="operario">Operario</option>
                                     <option value="cajero">Cajero</option>
                                     <option value="vendedor_ruta">Vendedor Ruta</option>
                                     <option value="almacen">Almacén</option>
                                     <option value="operario_produccion">Producción</option>
                                     <option value="admin">Administrador</option>
                                     {currentUser?.role === 'programmer' && <option value="programmer">Programador</option>}
                                 </select>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Col 2: Datos Personales */}
                 <div className="col-span-1 space-y-4">
                     <h4 className="font-bold text-slate-800 border-b pb-2">Datos Personales</h4>
                     <div className="grid grid-cols-1 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                             <input required className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`} value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                             <input required className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`} value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                             <input className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Género</label>
                             <select className={`w-full px-4 py-2 border border-slate-200 rounded-lg bg-white ${themeColors.ring} focus:ring-2 outline-none`} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                                 <option value="M">Masculino</option>
                                 <option value="F">Femenino</option>
                                 <option value="Otro">Otro</option>
                             </select>
                        </div>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                         <input className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} focus:ring-2 outline-none`} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                     </div>
                     <div className="pt-4 flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">Estado:</span>
                        <button type="button" onClick={() => setFormData({...formData, active: !formData.active})} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${formData.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                            {formData.active ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                     </div>
                 </div>

                 {/* Col 3: Zonas (Solo vendedores) */}
                 <div className="hidden col-span-1 flex flex-col gap-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                      <Map size={18} className="text-indigo-600" /> Zonas de Venta
                    </h4>
                    <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <div className="flex gap-2">
                        <input 
                          className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                          placeholder="Nueva zona..."
                          value={newZoneName}
                          onChange={e => setNewZoneName(e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={handleCreateZone}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {zones.map(zone => {
                          const isAssigned = formData.assignedZones?.includes(zone);
                          return (
                            <div 
                              key={zone} 
                              onClick={() => toggleZoneAssignment(zone)}
                              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${isAssigned ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-100'}`}
                            >
                              <div className={isAssigned ? 'text-indigo-600' : 'text-slate-300'}>{isAssigned ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                              <span className={`text-xs font-bold ${isAssigned ? 'text-indigo-800' : 'text-slate-600'}`}>{zone}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                 </div>

                 {/* Col 4: Permisos */}
                 <div className="col-span-1">
                     <h4 className="font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-blue-600" /> Permisos
                     </h4>
                     <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                         {AVAILABLE_PERMISSIONS.map(perm => {
                             const isChecked = formData.permissions?.includes(perm.id);
                             return (
                                 <div key={perm.id} onClick={() => togglePermission(perm.id)} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                                     <div className={isChecked ? 'text-blue-600' : 'text-slate-300'}>{isChecked ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                                     <span className={`text-sm font-medium ${isChecked ? 'text-blue-800' : 'text-slate-600'}`}>{perm.label}</span>
                                 </div>
                             );
                         })}
                     </div>
                 </div>

                 <div className="col-span-1 lg:col-span-3 pt-4 border-t border-slate-100 flex justify-end">
                    <button type="submit" className={`w-full lg:w-auto px-12 py-3 rounded-xl ${themeColors.primary} text-white font-bold shadow-lg hover:brightness-110 transition-all`}>Guardar Datos</button>
                 </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
