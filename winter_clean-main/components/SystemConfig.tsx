
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Shield, Key, Save, CheckCircle } from 'lucide-react';

export const SystemConfig: React.FC = () => {
    const { apiToken, setApiToken, decolectaUrl, setDecolectaUrl, themeStyles } = useContext(AppContext);
    const [token, setToken] = useState(apiToken);
    const [url, setUrl] = useState(decolectaUrl);
    const [saved, setSaved] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setApiToken(token);
        setDecolectaUrl(url);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg">
                    <Shield size={32} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
                    <p className="text-slate-500 text-sm">Parámetros técnicos y llaves de API externas.</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Key size={16} className="text-indigo-500" />
                            Decolecta API Base URL
                        </label>
                        <input 
                            type="text"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 ring-emerald-100 outline-none font-mono text-sm mb-4"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="Ej: https://api.decolecta.com/v1"
                            required
                        />

                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Key size={16} className="text-indigo-500" />
                            API Token (api.decolecta.com)
                        </label>
                        <input 
                            type="password"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 ring-emerald-100 outline-none font-mono text-sm"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder="Ingrese el Bearer Token para consultas SUNAT/RENIEC"
                        />
                        <p className="text-xs text-slate-400 mt-2 italic">
                            * Este token permite realizar las consultas de DNI y RUC de forma automatizada mediante la API de Decolecta.
                        </p>
                    </div>

                    <button 
                        type="submit"
                        className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${themeStyles.primary} hover:brightness-110`}
                    >
                        {saved ? <CheckCircle size={20} /> : <Save size={20} />}
                        {saved ? 'Configuración Guardada' : 'Guardar Configuración'}
                    </button>
                </form>
            </div>
        </div>
    );
};
