
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Shield, Calendar, AlertTriangle, Clock, CheckCircle, Power, Edit3, Palette, Hash, DollarSign, TrendingUp } from 'lucide-react';
import { PRESET_COLORS } from '../types';

export const AdminSaas: React.FC = () => {
    const { saasConfig, setSaasConfig, themeStyles: themeColors, theme, setTheme, themeStyles, exchangeRate, setExchangeRate } = useContext(AppContext);
    
    // Admin Tabs
    const [activeTab, setActiveTab] = useState<'license' | 'appearance' | 'financial'>('license');

    const toggleWarning = () => {
        const isActive = !saasConfig.warningActive;
        setSaasConfig({
            ...saasConfig,
            warningActive: isActive,
            warningStartTime: isActive ? new Date().toISOString() : null
        });
    };

    const updatePaymentDay = (day: number) => {
        setSaasConfig({ ...saasConfig, paymentDay: day });
    };

    const updateDuration = (hours: number) => {
        if (hours < 0) return;
        setSaasConfig({ 
            ...saasConfig, 
            warningDurationHours: hours,
            warningStartTime: saasConfig.warningActive ? new Date().toISOString() : null
        });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-3 rounded-xl text-white shadow-lg">
                        <Shield size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Administrador</h2>
                        <p className="text-slate-500">Configuración global del sistema.</p>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button
                        onClick={() => setActiveTab('license')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'license' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Licencia
                     </button>
                     <button
                        onClick={() => setActiveTab('financial')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'financial' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Financiero
                     </button>
                     <button
                        onClick={() => setActiveTab('appearance')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'appearance' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Apariencia
                     </button>
                </div>
            </div>

            {activeTab === 'license' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Payment Date Configuration */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                <Calendar size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">Fecha de Corte</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">
                                Día del mes para el pago:
                            </label>
                            <div className="relative">
                                <select 
                                    value={saasConfig.paymentDay}
                                    onChange={(e) => updatePaymentDay(parseInt(e.target.value))}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>Día {day}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* License Warning Control */}
                    <div className={`p-6 rounded-2xl shadow-sm border transition-all ${saasConfig.warningActive ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${saasConfig.warningActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${saasConfig.warningActive ? 'text-red-800' : 'text-slate-800'}`}>
                                        Alerta de Licencia
                                    </h3>
                                </div>
                            </div>
                            <button 
                                onClick={toggleWarning}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${saasConfig.warningActive ? 'bg-red-600 ring-red-500' : 'bg-slate-200 ring-slate-300'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${saasConfig.warningActive ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'financial' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in max-w-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg text-slate-800">Tasa de Cambio (Dólar)</h3>
                           <p className="text-sm text-slate-500">Configure el tipo de cambio oficial del día para las compras de insumos.</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 font-bold">1 USD</div>
                                <div className="text-slate-400 font-black">=</div>
                            </div>
                            <div className="relative flex-1 max-w-[150px]">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="number" 
                                    step="0.001"
                                    value={exchangeRate}
                                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-9 pr-4 py-3 border-2 border-emerald-100 rounded-xl font-black text-xl text-emerald-700 outline-none focus:border-emerald-500 transition-all bg-white text-right"
                                />
                            </div>
                            <div className="ml-3 font-bold text-slate-700 text-lg">PEN (Soles)</div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-xl border border-slate-100 text-sm">
                            <p className="text-slate-500 italic">
                                * Este valor se utilizará automáticamente en el módulo de compras para convertir insumos facturados en dólares a costo unitario en moneda local.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'appearance' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in max-w-3xl">
                     <div className="flex items-center gap-3 mb-6">
                        <div className={`${themeStyles.bgLight} p-3 rounded-full ${themeStyles.text}`}>
                          <Palette size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg text-slate-800">Color del Sistema</h3>
                           <p className="text-sm text-slate-500">Elige un color de los predefinidos o selecciona uno personalizado.</p>
                        </div>
                     </div>
                     
                     <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">Color Personalizado</h4>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                           <input 
                                type="color" 
                                value={theme.startsWith('#') ? theme : '#10b981'}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-16 h-16 rounded-xl cursor-pointer p-1 border border-slate-200 bg-white"
                           />
                           <div className="flex-1 w-full">
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                  type="text" 
                                  value={theme}
                                  onChange={(e) => setTheme(e.target.value)}
                                  placeholder="#000000"
                                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200 uppercase"
                                />
                              </div>
                           </div>
                        </div>
                     </div>

                     <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">Colores Predefinidos</h4>
                     <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {PRESET_COLORS.map(color => (
                           <button
                              key={color}
                              onClick={() => setTheme(color)}
                              className={`relative p-4 rounded-xl border-2 transition-all group hover:shadow-md h-24 flex items-center justify-center
                                ${theme === color ? `border-slate-800 bg-slate-50` : 'border-slate-100 bg-white hover:border-slate-200'}`}
                           >
                              <div className="w-10 h-10 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                              {theme === color && (
                                 <div className="absolute top-1 right-1 text-slate-800"><CheckCircle size={16} /></div>
                              )}
                           </button>
                        ))}
                     </div>
                 </div>
            )}
        </div>
    );
};
