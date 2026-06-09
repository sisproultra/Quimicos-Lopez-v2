
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { Sale, SaleStatus } from '../types';
import { Clock, AlertTriangle, CheckCircle, ArrowRight, Calendar, User, Shirt, Camera, Info, CheckSquare, Square, X, Eye, Check, WashingMachine } from 'lucide-react';

export const Operations: React.FC = () => {
    const { sales, updateSale, updateSaleStatus, themeStyles: themeColors, currency } = useContext(AppContext);
    const [timeNow, setTimeNow] = useState(new Date());
    const [confirmModal, setConfirmModal] = useState<{sale: Sale, type: 'finish_all'} | null>(null);
    const [viewPhotosSale, setViewPhotosSale] = useState<Sale | null>(null);

    // Update time every minute for accurate "Time Remaining"
    React.useEffect(() => {
        const interval = setInterval(() => setTimeNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // 1. Filter only pending items (Por Lavar)
    // 2. Sort by delivery date (Earliest first)
    const pendingOperations = useMemo(() => {
        return sales
            .filter(s => s.status === 'por_lavar')
            .sort((a, b) => {
                const dateA = a.scheduledDeliveryDate ? new Date(a.scheduledDeliveryDate).getTime() : new Date(a.date).getTime();
                const dateB = b.scheduledDeliveryDate ? new Date(b.scheduledDeliveryDate).getTime() : new Date(b.date).getTime();
                return dateA - dateB;
            });
    }, [sales]);

    const getUrgencyInfo = (deliveryDateStr?: string) => {
        if (!deliveryDateStr) return { color: 'bg-slate-500', label: 'Sin fecha', priority: 0, blink: false };
        
        const delivery = new Date(deliveryDateStr);
        const diffMs = delivery.getTime() - timeNow.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 0) {
            return { 
                color: 'bg-red-600', 
                borderColor: 'border-red-500', 
                bgColor: 'bg-red-50', 
                textColor: 'text-red-700',
                label: 'VENCIDO', 
                priority: 4,
                blink: true
            };
        } else if (diffHours < 4) {
            return { 
                color: 'bg-orange-500', 
                borderColor: 'border-orange-500',
                bgColor: 'bg-orange-50', 
                textColor: 'text-orange-700',
                label: 'CRÍTICO', 
                priority: 3,
                blink: true
            };
        } else if (diffHours < 24) {
            return { 
                color: 'bg-yellow-400', 
                borderColor: 'border-yellow-400',
                bgColor: 'bg-yellow-50', 
                textColor: 'text-yellow-800',
                label: 'URGENTE', 
                priority: 2,
                blink: false
            };
        } else {
            return { 
                color: 'bg-green-500', 
                borderColor: 'border-green-500',
                bgColor: 'bg-green-50', 
                textColor: 'text-green-700',
                label: 'A TIEMPO', 
                priority: 1,
                blink: false
            };
        }
    };

    const handleItemToggle = (sale: Sale, itemIndex: number) => {
        const updatedItems = [...sale.items];
        updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            completed: !updatedItems[itemIndex].completed
        };
        updateSale({ ...sale, items: updatedItems });
    };

    const handleFinishClick = (sale: Sale) => {
        const allCompleted = sale.items.every(i => i.completed);
        if (allCompleted) {
            // If all checked, finish immediately
            executeFinish(sale);
        } else {
            // Show confirm modal
            setConfirmModal({ sale, type: 'finish_all' });
        }
    };

    const executeFinish = (sale: Sale) => {
        // Mark all items as completed
        const updatedItems = sale.items.map(i => ({ ...i, completed: true }));
        updateSale({
            ...sale,
            items: updatedItems,
            status: 'lavado'
        });
        setConfirmModal(null);
    };

    // Helper to format time remaining
    const getTimeRemaining = (dateStr?: string) => {
        if (!dateStr) return "--";
        const delivery = new Date(dateStr);
        const diffMs = delivery.getTime() - timeNow.getTime();
        const isNegative = diffMs < 0;
        
        const absMs = Math.abs(diffMs);
        const hours = Math.floor(absMs / (1000 * 60 * 60));
        const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));

        if (isNegative) return `HACE ${hours}h ${minutes}m`;
        return `Falta ${hours}h ${minutes}m`;
    };

    const totalPendingItems = pendingOperations.reduce((acc, sale) => acc + sale.items.reduce((sum, i) => sum + i.quantity, 0), 0);

    return (
        <div className="h-full flex flex-col relative bg-slate-100">
            {/* Top Bar */}
            <div className="flex-none p-4 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${themeColors.primary} text-white`}><WashingMachine size={20} /></div>
                        Centro de Operaciones
                    </h2>
                </div>
                <div className="flex gap-3">
                     <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-center min-w-[80px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Ordenes</span>
                        <span className="text-lg font-bold text-slate-800 leading-none">{pendingOperations.length}</span>
                     </div>
                     <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-center min-w-[80px]">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Prendas</span>
                        <span className="text-lg font-bold text-blue-600 leading-none">{totalPendingItems}</span>
                     </div>
                </div>
            </div>

            {pendingOperations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                        <CheckCircle size={40} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">¡Todo al día!</h3>
                    <p className="text-slate-500">No hay órdenes pendientes de lavado.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {pendingOperations.map(sale => {
                            const urgency = getUrgencyInfo(sale.scheduledDeliveryDate);
                            const timeLabel = getTimeRemaining(sale.scheduledDeliveryDate);
                            const completedCount = sale.items.filter(i => i.completed).length;
                            const progress = (completedCount / sale.items.length) * 100;
                            
                            // Check if ANY item has photos
                            const hasPhotos = sale.items.some(i => i.photos && i.photos.length > 0);
                            
                            return (
                                <div 
                                    key={sale.id} 
                                    className={`bg-white rounded-xl shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md border h-fit
                                        ${urgency.priority >= 3 ? 'border-transparent' : 'border-slate-200'}
                                        ${urgency.priority === 4 ? 'ring-2 ring-red-100' : ''}
                                    `}
                                >
                                    {/* Blinking Priority Stripe */}
                                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${urgency.color} ${urgency.blink ? 'animate-pulse' : ''} z-10`} />

                                    {/* Photo Indicator Button (Top Right) */}
                                    {hasPhotos && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewPhotosSale(sale);
                                            }}
                                            className="absolute top-3 right-3 z-20 bg-green-100 text-green-700 p-1.5 rounded-lg border border-green-200 shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-green-200 transition-colors" 
                                            title="Ver fotos de prendas"
                                        >
                                            <Camera size={14} />
                                            <div className="bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                                <Check size={8} strokeWidth={4} />
                                            </div>
                                        </button>
                                    )}

                                    {/* Header */}
                                    <div className="p-3 pt-5 border-b border-slate-50 bg-white relative">
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm ${urgency.bgColor} ${urgency.textColor} flex items-center gap-1`}>
                                                {urgency.blink && <AlertTriangle size={10} className="animate-bounce" />}
                                                {urgency.label}
                                            </span>
                                            {!hasPhotos && ( // Only show time here if photos icon isn't taking space, or push time left
                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${urgency.blink ? 'text-red-600' : 'text-slate-400'}`}>
                                                    <Clock size={10} />
                                                    {timeLabel}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex justify-between items-end gap-2">
                                             <h3 className="font-bold text-slate-800 text-base truncate leading-tight w-full" title={sale.customerName}>
                                                {sale.customerName}
                                             </h3>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-mono text-[10px] text-slate-400 font-bold">#{sale.id}</span>
                                            {hasPhotos && ( // Show time below name if icon is top right
                                                 <div className={`flex items-center gap-1 text-[10px] font-bold ${urgency.blink ? 'text-red-600' : 'text-slate-400'}`}>
                                                    <Clock size={10} />
                                                    {timeLabel}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ease-out ${themeColors.primary}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Items List - Compact & Scrollable (Max ~4 items) */}
                                    <div className="p-2 bg-slate-50/50 space-y-2 overflow-y-auto max-h-[220px] scrollbar-hide">
                                        {sale.items.map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                onClick={() => handleItemToggle(sale, idx)}
                                                className={`flex flex-col bg-white p-2 rounded-lg border transition-all cursor-pointer hover:border-blue-300 ${item.completed ? 'border-green-200 bg-green-50/30 opacity-60' : 'border-slate-200 shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {/* Checkbox */}
                                                    <div 
                                                        className={`flex-shrink-0 transition-colors ${item.completed ? 'text-green-500' : 'text-slate-300'}`}
                                                    >
                                                        {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center">
                                                            <span className={`font-bold text-xs leading-tight truncate ${item.completed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                                                <span className={`${themeColors.text} mr-1 text-sm`}>{item.quantity}</span>
                                                                {item.serviceName}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Compact Notes */}
                                                        {item.notes && (
                                                            <div className="flex mt-1">
                                                                <span className="text-[9px] text-orange-700 font-bold bg-orange-100 px-1.5 rounded flex items-center gap-1 border border-orange-200 truncate max-w-full">
                                                                    <AlertTriangle size={8} /> {item.notes}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Global Notes */}
                                        {sale.notes && (
                                            <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-[10px] text-yellow-800 italic flex gap-1 items-start leading-tight">
                                                <Info size={12} className="flex-shrink-0 mt-0.5" />
                                                <span className="font-medium line-clamp-2">{sale.notes}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="p-3 bg-white border-t border-slate-100">
                                        <button 
                                            onClick={() => handleFinishClick(sale)}
                                            className={`w-full py-2.5 rounded-lg font-bold text-white text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-lg hover:brightness-110
                                                ${themeColors.primary}
                                            `}
                                        >
                                            <WashingMachine size={16} />
                                            LAVAR
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl text-center border-4 border-slate-50">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <WashingMachine size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">¿Marcar todo como lavado?</h3>
                        <p className="text-slate-500 mb-6 text-sm font-medium">
                           ¿Confirmas que todas las prendas de la orden <span className="font-bold text-slate-800">#{confirmModal.sale.id}</span> están limpias y listas para entrega?
                        </p>
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => executeFinish(confirmModal.sale)}
                                className={`w-full py-3 rounded-xl text-white font-bold shadow-md text-sm ${themeColors.primary} hover:brightness-110 transition-all`}
                            >
                                Sí, Terminar Lavado
                            </button>
                            <button 
                                onClick={() => setConfirmModal(null)}
                                className="w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Photos Modal */}
            {viewPhotosSale && (
                <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setViewPhotosSale(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                             <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Camera size={20} className="text-slate-500" />
                                    Evidencia Fotográfica
                                </h3>
                                <p className="text-xs text-slate-500">Orden #{viewPhotosSale.id} - {viewPhotosSale.customerName}</p>
                             </div>
                             <button onClick={() => setViewPhotosSale(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                 <X size={20} />
                             </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                             <div className="space-y-6">
                                {viewPhotosSale.items.filter(item => item.photos && item.photos.length > 0).length === 0 ? (
                                    <div className="text-center text-slate-400 py-10">
                                        No hay fotos registradas para esta orden.
                                    </div>
                                ) : (
                                    viewPhotosSale.items
                                        .filter(item => item.photos && item.photos.length > 0)
                                        .map((item, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                    {item.quantity}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 leading-tight">{item.serviceName}</h4>
                                                    {item.notes && <p className="text-[10px] text-orange-600 font-medium">{item.notes}</p>}
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {item.photos?.map((photo, pIdx) => (
                                                    <div key={pIdx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 group relative">
                                                        <img src={photo} alt={`${item.serviceName} ${pIdx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setViewPhotosSale(null)}
                                className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
