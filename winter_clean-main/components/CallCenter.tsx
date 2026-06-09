
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { PickupRequest } from '../types';
import { 
    Phone, MapPin, User, Calendar, Clock, Link as LinkIcon, 
    AlertTriangle, Star, Save, Trash2, CheckCircle, ExternalLink,
    Map, Search, Filter
} from 'lucide-react';

const COUNTRY_CODES = [
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+1', country: 'USA', flag: '🇺🇸' },
];

export const CallCenter: React.FC = () => {
    const { pickupRequests, addPickupRequest, updatePickupRequest, deletePickupRequest, themeStyles: themeColors } = useContext(AppContext);
    
    // State for Date/Time inputs (Separated for easier HTML5 input handling)
    const [dateInput, setDateInput] = useState(() => new Date().toISOString().split('T')[0]);
    const [timeInput, setTimeInput] = useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 1);
        return d.toTimeString().slice(0, 5);
    });

    // Form State
    const [formData, setFormData] = useState<Partial<PickupRequest>>({
        countryCode: '+51',
        isUrgent: false,
        isSpecialClient: false,
    });

    // Filter State for List
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'collected'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientName || !formData.phone || !formData.address) return;

        // Combine Date and Time
        const scheduledDateTime = new Date(`${dateInput}T${timeInput}`);

        const newRequest: PickupRequest = {
            id: Date.now().toString(),
            clientName: formData.clientName,
            countryCode: formData.countryCode || '+51',
            phone: formData.phone,
            address: formData.address,
            googleMapsUrl: formData.googleMapsUrl,
            scheduledDate: scheduledDateTime.toISOString(),
            notes: formData.notes,
            isUrgent: formData.isUrgent || false,
            isSpecialClient: formData.isSpecialClient || false,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        addPickupRequest(newRequest);
        
        // Reset Form
        setFormData({
            countryCode: '+51',
            isUrgent: false,
            isSpecialClient: false,
            clientName: '',
            phone: '',
            address: '',
            googleMapsUrl: '',
            notes: ''
        });
        
        // Reset time to +1 hour
        const d = new Date();
        d.setHours(d.getHours() + 1);
        setDateInput(d.toISOString().split('T')[0]);
        setTimeInput(d.toTimeString().slice(0, 5));
    };

    const toggleStatus = (request: PickupRequest) => {
        updatePickupRequest({
            ...request,
            status: request.status === 'pending' ? 'collected' : 'pending'
        });
    };

    const filteredRequests = useMemo(() => {
        return pickupRequests
            .filter(r => {
                const matchesSearch = 
                    (r.clientName && r.clientName.toLowerCase().includes(searchTerm.toLowerCase())) || 
                    (r.phone && r.phone.includes(searchTerm)) || 
                    (r.address && r.address.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    }, [pickupRequests, filterStatus, searchTerm]);

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 p-4 lg:p-6 bg-slate-100">
            {/* Left Column: Register Form */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-3 rounded-full ${themeColors.bgLight} ${themeColors.text}`}>
                            <Phone size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Registrar Visita</h2>
                            <p className="text-sm text-slate-500">Call Center & Solicitudes</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Cliente</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 ${themeColors.ring}`}
                                    placeholder="Nombre y Apellido"
                                    value={formData.clientName || ''}
                                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <div className="w-1/3">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cód.</label>
                                <select 
                                    className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 bg-white text-sm"
                                    value={formData.countryCode}
                                    onChange={e => setFormData({...formData, countryCode: e.target.value})}
                                >
                                    {COUNTRY_CODES.map(c => (
                                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                    ))}
                                </select>
                             </div>
                             <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                <input
                                    required
                                    type="tel"
                                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 ${themeColors.ring}`}
                                    placeholder="Número de contacto"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Exacta</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    required
                                    className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 ${themeColors.ring}`}
                                    placeholder="Calle, Número, Referencia"
                                    value={formData.address || ''}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Link Google Maps (Opcional)</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="url"
                                    className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 ${themeColors.ring}`}
                                    placeholder="https://maps.google.com/..."
                                    value={formData.googleMapsUrl || ''}
                                    onChange={e => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Date & Time Picker */}
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                             <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Fecha Recojo</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                                        <input 
                                            type="date"
                                            required
                                            className="w-full pl-8 pr-2 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-700 font-medium"
                                            value={dateInput}
                                            onChange={e => setDateInput(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-blue-700 mb-1 uppercase">Hora</label>
                                    <div className="relative">
                                        <Clock className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                                        <input 
                                            type="time"
                                            required
                                            className="w-full pl-8 pr-2 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-700 font-medium"
                                            value={timeInput}
                                            onChange={e => setTimeInput(e.target.value)}
                                        />
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                             <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all flex-1 ${formData.isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 accent-red-600"
                                    checked={formData.isUrgent}
                                    onChange={e => setFormData({...formData, isUrgent: e.target.checked})}
                                 />
                                 <div className="flex items-center gap-1 font-bold text-sm">
                                     <AlertTriangle size={16} /> Urgente
                                 </div>
                             </label>

                             <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all flex-1 ${formData.isSpecialClient ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 accent-yellow-500"
                                    checked={formData.isSpecialClient}
                                    onChange={e => setFormData({...formData, isSpecialClient: e.target.checked})}
                                 />
                                 <div className="flex items-center gap-1 font-bold text-sm">
                                     <Star size={16} /> Cliente Especial
                                 </div>
                             </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios / Notas</label>
                            <textarea
                                className={`w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 ${themeColors.ring} resize-none`}
                                rows={3}
                                placeholder="Detalles adicionales para el recolector..."
                                value={formData.notes || ''}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <button 
                            type="submit"
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 ${themeColors.primary}`}
                        >
                            <Save size={20} /> Registrar Solicitud
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column: List View (Driver/Logistics View) */}
            <div className="w-full lg:w-2/3 flex flex-col gap-4 h-full overflow-hidden">
                {/* Header Filter Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center flex-shrink-0">
                     <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Map size={20}/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Ruta de Recojo</h3>
                            <p className="text-xs text-slate-500">{filteredRequests.length} solicitudes</p>
                        </div>
                     </div>

                     <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Buscar..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-300 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <select 
                                className="pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-none appearance-none"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                            >
                                <option value="pending">Pendientes</option>
                                <option value="collected">Recogidos</option>
                                <option value="all">Todos</option>
                            </select>
                            <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                     </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                    {filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <MapPin size={48} className="mb-4 opacity-50" />
                            <p>No hay solicitudes en esta lista.</p>
                        </div>
                    ) : (
                        filteredRequests.map(request => (
                            <div 
                                key={request.id} 
                                className={`bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md relative overflow-hidden group
                                    ${request.isUrgent ? 'border-red-100 bg-red-50/10' : 'border-slate-200'}
                                    ${request.status === 'collected' ? 'opacity-70 bg-slate-50' : ''}
                                `}
                            >
                                {request.isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 animate-pulse"></div>}
                                {request.status === 'collected' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>}
                                
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`font-bold text-lg leading-none ${request.status === 'collected' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                {request.clientName}
                                            </h4>
                                            {request.isSpecialClient && (
                                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-yellow-200">
                                                    <Star size={10} fill="currentColor" /> VIP
                                                </span>
                                            )}
                                            {request.isUrgent && (
                                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-200">
                                                    <AlertTriangle size={10} /> URGENTE
                                                </span>
                                            )}
                                        </div>
                                        {/* Scheduled Date Display */}
                                        <div className="flex items-center gap-3 text-sm bg-blue-50 px-2 py-1 rounded-md text-blue-800 w-fit border border-blue-100">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} className="text-blue-500" />
                                                <span className="font-bold">{new Date(request.scheduledDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="w-px h-3 bg-blue-200"></div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} className="text-blue-500" />
                                                <span className="font-bold">{new Date(request.scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        Creado: {new Date(request.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 mb-4">
                                    <div className="space-y-1 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            <span className="font-bold">{request.countryCode} {request.phone}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <MapPin size={14} className="text-slate-400 mt-0.5" />
                                            <span>{request.address}</span>
                                        </div>
                                    </div>
                                    {request.notes && (
                                        <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 italic border border-slate-100 h-fit">
                                            "{request.notes}"
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pl-2 pt-2 border-t border-slate-100">
                                    {request.googleMapsUrl && (
                                        <a 
                                            href={request.googleMapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            <MapPin size={14} /> Ver Mapa
                                            <ExternalLink size={12} />
                                        </a>
                                    )}
                                    
                                    <div className="flex-1"></div>

                                    <button 
                                        onClick={() => toggleStatus(request)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm
                                            ${request.status === 'collected' 
                                                ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200' 
                                                : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                            }`}
                                    >
                                        <CheckCircle size={14} /> 
                                        {request.status === 'collected' ? 'Recogido' : 'Marcar Recogido'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => deletePickupRequest(request.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
