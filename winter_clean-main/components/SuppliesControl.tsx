
import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Droplets, AlertTriangle } from 'lucide-react';

interface BottleProps {
    percentage: number;
    color: string;
    title: string;
    stock: number;
    max: number;
    unit: string;
}

const Bottle: React.FC<BottleProps> = ({ percentage, color, title, stock, max, unit }) => (
    <div className="flex flex-col items-center">
        {/* Bottle Graphic */}
        <div className="relative w-32 h-48 bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm mb-3 group">
            {/* Cap */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-400 rounded-sm z-20"></div>
            
            {/* Liquid Container */}
            <div className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out" style={{ height: `${percentage}%` }}>
                {/* Liquid Body */}
                <div className={`w-full h-full ${color} opacity-80 relative`}>
                    {/* Bubbles animation could go here */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-white/30 animate-pulse"></div>
                </div>
            </div>

            {/* Percentage Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <span className="text-2xl font-black text-slate-800 drop-shadow-md bg-white/70 px-2 rounded-lg">
                    {percentage.toFixed(0)}%
                </span>
            </div>

            {/* Glass Reflection */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/20 to-transparent pointer-events-none"></div>
        </div>

        {/* Info */}
        <div className="text-center">
            <h4 className="font-bold text-slate-800 text-sm mb-1">{title}</h4>
            <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                {stock} / {max} {unit}
            </div>
            {percentage < 30 && (
                <div className="flex items-center justify-center gap-1 text-red-600 text-xs font-bold mt-1 animate-bounce">
                    <AlertTriangle size={12} /> CRÍTICO
                </div>
            )}
        </div>
    </div>
);

export const SuppliesControl: React.FC = () => {
    const { services } = useContext(AppContext);

    const supplies = services.filter(s => s.type === 'INSUMO');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Droplets className="text-blue-600" /> Control de Insumos
                    </h2>
                    <p className="text-slate-500">Monitoreo visual de niveles de tanques y reservas.</p>
                </div>
            </div>

            {supplies.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                    No hay insumos registrados. Ve a Inventario para agregar materias primas.
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 p-4">
                    {supplies.map(supply => {
                        const max = supply.maxStock || 100; // Default max if not set
                        const current = supply.stock || 0;
                        const percentage = Math.min(100, Math.max(0, (current / max) * 100));
                        
                        const high = supply.alertHigh || 70;
                        const low = supply.alertLow || 30;

                        let color = 'bg-green-500'; // Healthy
                        if (percentage < low) color = 'bg-red-500'; // Critical
                        else if (percentage < high) color = 'bg-yellow-400'; // Warning

                        return (
                            <Bottle 
                                key={supply.id}
                                percentage={percentage}
                                color={color}
                                title={supply.name}
                                stock={current}
                                max={max}
                                unit={supply.unit}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};
