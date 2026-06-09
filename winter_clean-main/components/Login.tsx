
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Lock, User, Eye, EyeOff, AlertTriangle, ShieldCheck, Beaker } from 'lucide-react';

export const Login: React.FC = () => {
    const { login, ticketConfig, themeStyles: themeColors } = useContext(AppContext);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Security: Brute force protection
    const [attempts, setAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTime, setLockoutTime] = useState(0);

    // Timer for lockout
    useEffect(() => {
        let interval: number;
        if (isLocked && lockoutTime > 0) {
            interval = window.setInterval(() => {
                setLockoutTime(prev => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        setAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isLocked, lockoutTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isLocked) return;

        setIsLoading(true);
        setError(null);

        try {
            const success = await login(username, password);
            
            if (success) {
                setIsLoading(false);
            } else {
                const newAttempts = attempts + 1;
                setAttempts(newAttempts);
                
                if (newAttempts >= 3) {
                    setIsLocked(true);
                    setLockoutTime(30); // 30 seconds lockout
                    setError("Cuenta bloqueada temporalmente por seguridad.");
                } else {
                    setError("Credenciales inválidas.");
                }
                setIsLoading(false);
            }
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión.");
            setIsLoading(false);
        }
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans text-slate-100 relative overflow-hidden">
            {/* VIBRANT BRAND AMBIENT AURAS - Broad, colorful space painting instead of plain white */}
            <div className="absolute top-1/4 -left-32 w-[550px] h-[550px] bg-[#51B01E]/25 rounded-full blur-[120px] pointer-events-none select-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-1/4 -right-32 w-[550px] h-[550px] bg-[#DC2626]/20 rounded-full blur-[120px] pointer-events-none select-none animate-pulse duration-[6000ms]"></div>
            <div className="absolute top-12 right-1/4 w-[400px] h-[400px] bg-[#51B01E]/15 rounded-full blur-[100px] pointer-events-none select-none"></div>
            <div className="absolute bottom-12 left-1/4 w-[400px] h-[400px] bg-[#DC2626]/15 rounded-full blur-[100px] pointer-events-none select-none"></div>
            
            {/* Subtle background chemical geometry */}
            <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="login-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <circle cx="1.5" cy="1.5" r="1.3" fill="#51B01E" />
                            <circle cx="16.5" cy="16.5" r="1.1" fill="#DC2626" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#login-grid)" />
                </svg>
            </div>

            {/* Centered Modern Card - Sleek dark glassmorphism */}
            <div className="w-full max-w-md mx-4 bg-slate-900/80 backdrop-blur-3xl border border-slate-800/80 rounded-[32px] p-8 md:p-10 shadow-[0_0_50px_rgba(81,176,30,0.12)] relative z-10 transition-all duration-300">
                {/* Visual Accent top bar with both brand colors */}
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#51B01E] via-[#84CC16] to-[#DC2626] rounded-t-[32px]"></div>
                
                {/* Header Logo */}
                <div className="text-center space-y-4 mb-8">
                    <div className="inline-flex justify-center items-center bg-white border border-slate-200 p-4.5 rounded-3xl shadow-md hover:scale-105 hover:rotate-2 transition-all duration-350 bg-gradient-to-b from-white to-slate-100 ring-4 ring-[#51B01E]/20">
                        {ticketConfig.logoUrl && !ticketConfig.logoUrl.includes('winter_clean') ? (
                            <img 
                                src={ticketConfig.logoUrl} 
                                alt="Logo" 
                                className="h-16 w-auto object-contain" 
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <img 
                                src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" 
                                alt="Logo" 
                                className="h-16 w-auto object-contain" 
                                referrerPolicy="no-referrer"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-[#51B01E] bg-[#51B01E]/12 px-3 py-1 rounded-full inline-block border border-[#51B01E]/20">
                            SISTEMA COMERCIAL
                        </span>
                        <h2 className="text-xl font-black text-white tracking-tight text-center leading-snug">
                            {ticketConfig.shopName && !ticketConfig.shopName.includes('Winter Clean') ? ticketConfig.shopName : 'Químicos e Inversiones López'}
                        </h2>
                    </div>
                </div>

                {/* Standard Login Fields */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#51B01E]"></span>
                                Usuario de Acceso
                            </label>
                        </div>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 group-focus-within:text-[#51B01E] transition-colors duration-300" size={18} />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-slate-800 focus:border-[#51B01E] rounded-2xl outline-none focus:ring-4 focus:ring-[#51B01E]/10 transition-all font-bold text-white text-sm placeholder:text-slate-600"
                                placeholder="Escriba su usuario"
                                disabled={isLocked || isLoading}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                                Contraseña
                            </label>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-450 group-focus-within:text-[#DC2626] transition-colors duration-300" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-12 py-3.5 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-slate-800 focus:border-[#DC2626] rounded-2xl outline-none focus:ring-4 focus:ring-[#DC2626]/10 transition-all font-bold text-white text-sm placeholder:text-slate-600"
                                placeholder="••••••••"
                                disabled={isLocked || isLoading}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={`flex items-start gap-3 p-4 rounded-2xl text-xs ${isLocked ? 'bg-red-950/50 text-red-300 border border-red-900/30' : 'bg-red-950/30 text-red-200 border border-red-900/20'} animate-fade-in`}>
                            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-[#DC2626]" />
                            <div>
                                <span className="font-bold block text-red-50 mb-0.5">{isLocked ? 'Acceso temporalmente bloqueado' : 'Credenciales incorrectas'}</span>
                                <span className="font-medium text-slate-400">{error}</span>
                                {isLocked && <span className="block mt-1.5 font-mono font-black text-red-400">REINTENTAR EN: {lockoutTime} SEGUNDOS</span>}
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || isLocked || !username || !password}
                        className={`w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg
                            ${isLoading || isLocked || !username || !password
                                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 shadow-none cursor-not-allowed' 
                                : 'bg-gradient-to-r from-[#51B01E] via-[#84CC16] to-[#DC2626] hover:brightness-[1.12] hover:shadow-[0_0_20px_rgba(81,176,30,0.3)] active:scale-[0.98]'
                            }
                        `}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Iniciando Sesión...
                            </span>
                        ) : (
                            'INGRESAR AL SISTEMA'
                        )}
                    </button>
                </form>

                {/* Footer values - Clean, modern, light */}
                <div className="pt-5 mt-8 border-t border-slate-800 text-center flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                        Químicos e Inversiones López v5.0
                    </span>
                </div>
            </div>
        </div>
    );
};
