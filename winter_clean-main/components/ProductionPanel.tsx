import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { ProductionLog, WasteLog, Service, PackagingEntry, Ingredient } from '../types';
import { Factory, Save, CheckCircle, AlertTriangle, Package, Trash2, AlertOctagon, User, Plus, Search, ChevronRight, ArrowLeft, Layers, FlaskConical, Beaker, Archive, ListFilter, ClipboardList, Clock, History, MoreVertical, X, ChevronDown, Download, FileText, BarChart2, Zap, TrendingUp, Edit3 } from 'lucide-react';

// Componente de Botella Animada para Productos Terminados (Granel)
const BulkBottle: React.FC<{ percentage: number, title: string, stock: number, unit: string, onAction?: () => void, onPack?: () => void, onKardex?: () => void }> = ({ percentage, title, stock, unit, onAction, onPack, onKardex }) => {
    // Lógica de Semáforo: Rojo <= 30%, Verde >= 70%, Amarillo entre ambos.
    let liquidColor = 'bg-yellow-400';
    let borderColor = 'border-yellow-200';
    let textColor = 'text-yellow-600';

    if (percentage <= 30) {
        liquidColor = 'bg-red-500';
        borderColor = 'border-red-200';
        textColor = 'text-red-600';
    } else if (percentage >= 70) {
        liquidColor = 'bg-green-500';
        borderColor = 'border-green-200';
        textColor = 'text-green-600';
    }

    return (
        <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col items-center">
            <div className="relative w-24 h-36 bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-inner">
                {/* Cap */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-3 bg-slate-300 rounded-full z-20"></div>
                
                {/* Liquid with wave animation */}
                <div 
                    className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out ${liquidColor} opacity-80`}
                    style={{ height: `${Math.max(5, percentage)}%` }}
                >
                    <div className="absolute top-0 left-0 w-[200%] h-4 bg-white/20 -translate-y-1/2 animate-wave"></div>
                </div>

                {/* Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none"></div>
                
                {/* Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <span className="text-xl font-black text-slate-800 drop-shadow-sm bg-white/40 px-1.5 rounded-lg">{percentage.toFixed(0)}%</span>
                </div>
            </div>

            <div className="text-center w-full min-w-0">
                <h4 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight mb-1">{title}</h4>
                <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                        {stock.toFixed(1)} {unit}
                    </span>
                    {percentage <= 30 && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
                </div>
                
                <div className="flex gap-1 justify-center border-t border-slate-50 pt-3">
                    <button onClick={onKardex} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Kardex"><BarChart2 size={16}/></button>
                    <button onClick={onAction} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${liquidColor} text-white hover:brightness-110 active:scale-95`}>
                        <Zap size={12}/> Producir
                    </button>
                    <button onClick={onPack} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95">
                        <Archive size={12}/> Envasar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ProductionPanel: React.FC = () => {
    const { services, produceItem, registerWaste, productionLogs, wasteLogs, themeStyles, currentUser, addPackagingToBatch, currency, categories, units, addProduct, updateProduct, currentView } = useContext(AppContext);
    
    const activeSubView = useMemo(() => {
        if (currentView === 'prod_bulk') return 'bulk';
        if (currentView === 'prod_packaged') return 'bottling';
        if (currentView === 'prod_history') return 'history';
        if (currentView === 'prod_waste') return 'waste';
        return 'bulk';
    }, [currentView]);

    const [wizardStep, setWizardStep] = useState(0); 
    const [selectedProduct, setSelectedProduct] = useState<Service | null>(null);
    const [volumeToProduce, setVolumeToProduce] = useState<string>('');
    const [batchNumber, setBatchNumber] = useState('');
    const [expiration, setExpiration] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'BULK' | 'PACKAGED'>('BULK');
    const [newProductData, setNewProductData] = useState<Partial<Service>>({});
    const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
    const [ingSearch, setIngSearch] = useState('');

    const [selectedBatch, setSelectedBatch] = useState<ProductionLog | null>(null);
    const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
    const [packagingSkuId, setPackagingSkuId] = useState('');
    const [packagingQty, setPackagingQty] = useState('');
    const [containerSize, setContainerSize] = useState('');

    const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

    const bulkProducts = useMemo(() => services.filter(s => s.type === 'PRODUCTO_TERMINADO' && s.subtype === 'BULK' && !s.deleted), [services]);
    const packagedProducts = useMemo(() => services.filter(s => s.type === 'PRODUCTO_TERMINADO' && s.subtype === 'PACKAGED' && !s.deleted), [services]);
    const supplies = useMemo(() => services.filter(s => s.type === 'INSUMO' && !s.deleted), [services]);
    const activeBatches = useMemo(() => productionLogs.filter(l => l.status === 'open' && !l.deleted), [productionLogs]);

    // Cálculo de Costo Sugerido para Bulk (Suma de ingredientes)
    const suggestedBulkCost = useMemo(() => {
        return recipeIngredients.reduce((acc, ing) => {
            const supply = supplies.find(s => s.id === ing.id);
            return acc + (ing.quantity * (supply?.price || 0));
        }, 0);
    }, [recipeIngredients, supplies]);

    // Cálculo de Costo Sugerido para SKU (Costo madre * cantidad consumida)
    const suggestedSkuCost = useMemo(() => {
        if (modalMode !== 'PACKAGED' || !newProductData.consumesFromBulkId || !newProductData.packagedSize) return 0;
        const mother = bulkProducts.find(b => b.id === newProductData.consumesFromBulkId);
        if (!mother) return 0;
        return mother.price * newProductData.packagedSize;
    }, [newProductData.consumesFromBulkId, newProductData.packagedSize, bulkProducts, modalMode]);

    useEffect(() => {
        if (modalMode === 'BULK' && isCreateModalOpen) {
            setNewProductData(prev => ({ ...prev, price: suggestedBulkCost }));
        }
    }, [suggestedBulkCost]);

    useEffect(() => {
        if (modalMode === 'PACKAGED' && isCreateModalOpen) {
            setNewProductData(prev => ({ ...prev, price: suggestedSkuCost }));
        }
    }, [suggestedSkuCost]);

    const requiredIngredients = useMemo(() => {
        if (!selectedProduct || !volumeToProduce) return [];
        const vol = parseFloat(volumeToProduce) || 0;
        return selectedProduct.recipe?.map(ing => {
            const supply = services.find(s => s.id === ing.id);
            const totalRequired = ing.quantity * vol;
            return {
                ...ing,
                available: supply?.stock || 0,
                required: totalRequired,
                hasEnough: (supply?.stock || 0) >= totalRequired
            };
        }) || [];
    }, [selectedProduct, volumeToProduce, services]);

    const canProceedWizard = wizardStep === 0 ? !!selectedProduct : wizardStep === 1 ? (parseFloat(volumeToProduce) > 0 && requiredIngredients.every(i => i.hasEnough)) : true;

    const [kardexItemId, setKardexItemId] = useState<string | null>(null);

    const getKardexData = (itemId: string) => {
        const item = services.find(s => s.id === itemId);
        if (!item) return [];
        const movements: any[] = [];
        if (item.subtype === 'BULK') {
            productionLogs.forEach(log => {
                if (log.productId === itemId) {
                    movements.push({ date: log.date, type: 'ENTRADA', qty: log.quantityProduced, concept: `Producción Lote ${log.batchNumber}`, user: log.producedBy });
                }
                log.packaging?.forEach(p => {
                    if (log.productId === itemId) {
                        movements.push({ date: p.date, type: 'SALIDA', qty: p.totalVolume, concept: `Envasado SKU: ${p.targetProductName}`, user: p.performedBy });
                    }
                });
            });
        } else {
            productionLogs.forEach(log => {
                log.packaging?.forEach(p => {
                    if (p.targetProductId === itemId) {
                        movements.push({ date: p.date, type: 'ENTRADA', qty: p.quantity, concept: `Envasado desde Lote ${log.batchNumber}`, user: p.performedBy });
                    }
                });
            });
        }
        return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const downloadKardexCSV = (itemId: string) => {
        const item = services.find(s => s.id === itemId);
        const data = getKardexData(itemId);
        let csv = '\ufeffFecha,Tipo,Cantidad,Concepto,Usuario\n';
        data.forEach(d => {
            csv += `${new Date(d.date).toLocaleString()},${d.type},${d.qty},${d.concept},${d.user}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', `Kardex_${item?.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const startProduction = (e?: React.FormEvent) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (!selectedProduct || !volumeToProduce || !canProceedWizard) return;
        const log: ProductionLog = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantityProduced: parseFloat(volumeToProduce),
            packagedVolume: 0,
            batchNumber: batchNumber || `BATCH-${Date.now().toString().slice(-6)}`,
            expirationDate: expiration,
            producedBy: currentUser?.firstName || 'Admin',
            ingredientsDeducted: true,
            status: 'open',
            packaging: []
        };
        const result = produceItem(log);
        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setWizardStep(0); setSelectedProduct(null); setVolumeToProduce(''); setBatchNumber('');
        } else {
            setMessage({ type: 'error', text: result.message });
        }
    };

    const handlePackFromTank = (productId: string) => {
        const batch = activeBatches.find(b => b.productId === productId);
        if (batch) {
            setSelectedBatch(batch);
            setIsPackagingModalOpen(true);
        } else {
            alert("No hay lotes con saldo de granel disponible para este producto. Realice una producción primero.");
        }
    };

    const handleAddPackaging = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBatch) return;
        const size = parseFloat(containerSize);
        const qty = parseFloat(packagingQty);
        const sku = packagedProducts.find(s => s.id === packagingSkuId);
        if (!sku || !size || !qty) return;
        const entry: PackagingEntry = {
            id: Date.now().toString(),
            targetProductId: sku.id,
            targetProductName: sku.name,
            quantity: qty,
            containerSize: size,
            totalVolume: size * qty,
            date: new Date().toISOString(),
            performedBy: currentUser?.firstName || 'Admin'
        };
        const result = addPackagingToBatch(selectedBatch.id, entry);
        if (result.success) {
            setMessage({ type: 'success', text: result.message });
            setIsPackagingModalOpen(false); setPackagingSkuId(''); setPackagingQty(''); setContainerSize('');
        } else {
            alert(result.message);
        }
    };

    const handleCreateProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProductData.name) return;
        const payload: Service = {
            ...newProductData,
            id: Date.now().toString(),
            type: 'PRODUCTO_TERMINADO',
            subtype: modalMode,
            trackStock: true,
            stock: 0,
            recipe: modalMode === 'BULK' ? recipeIngredients : undefined,
            deleted: false,
            price: newProductData.price || 0,
            unit: newProductData.unit || (modalMode === 'BULK' ? 'Kg' : 'Und'),
            category: newProductData.category || 'General'
        } as Service;
        addProduct(payload);
        setIsCreateModalOpen(false); setNewProductData({}); setRecipeIngredients([]);
    };

    const addIngredient = (item: Service) => {
        if (recipeIngredients.find(i => i.id === item.id)) return;
        setRecipeIngredients([...recipeIngredients, { id: item.id, name: item.name, quantity: 1, unit: item.unit }]);
    };

    const removeIngredient = (id: string) => {
        setRecipeIngredients(recipeIngredients.filter(i => i.id !== id));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <style>{`
                @keyframes wave {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
                .animate-wave {
                    position: absolute;
                    width: 200%;
                    height: 200%;
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 40%;
                    animation: wave 4s infinite linear;
                    top: 0;
                    left: 50%;
                }
            `}</style>
            
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex-none">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                    <Factory className="text-indigo-600" /> Planta de Producción
                </h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                    {activeSubView === 'bulk' && 'Producto Terminado (Granel)'}
                    {activeSubView === 'bottling' && 'Nueva Presentación (SKU)'}
                    {activeSubView === 'history' && 'Historial de Operaciones'}
                    {activeSubView === 'waste' && 'Reporte de Mermas'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 pb-24">
                {activeSubView === 'bulk' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl"><FlaskConical size={22} /></div>
                                <h4 className="text-sm font-black text-slate-800 uppercase">Tanques de Almacenamiento</h4>
                            </div>
                            <button 
                                onClick={() => { setModalMode('BULK'); setIsCreateModalOpen(true); setNewProductData({ unit: 'Kg' }); }}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                <Plus size={14}/> NUEVA MAESTRA
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {bulkProducts.map(p => {
                                const max = p.maxStock || 1000;
                                const current = p.stock || 0;
                                const percentage = Math.min(100, (current / max) * 100);
                                return (
                                    <BulkBottle 
                                        key={p.id}
                                        title={p.name}
                                        stock={current}
                                        unit={p.unit}
                                        percentage={percentage}
                                        onAction={() => { setSelectedProduct(p); setWizardStep(1); }}
                                        onPack={() => handlePackFromTank(p.id)}
                                        onKardex={() => setKardexItemId(p.id)}
                                    />
                                );
                            })}
                        </div>

                        {wizardStep > 0 && selectedProduct && (
                            <div className="mt-8 p-8 bg-white border-4 border-indigo-50 rounded-[3rem] shadow-2xl animate-slide-up relative">
                                <button onClick={() => { setWizardStep(0); setSelectedProduct(null); }} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 p-2 bg-slate-50 rounded-full"><X size={24}/></button>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-100"><FlaskConical size={32}/></div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Proceso de Fabricación: {selectedProduct.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Generación de Lote en Tanque</p>
                                    </div>
                                </div>

                                {wizardStep === 1 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
                                                <label className="block text-xs font-black text-slate-400 uppercase mb-3 tracking-widest">Cantidad a fabricar ({selectedProduct.unit})</label>
                                                <div className="relative">
                                                    <input type="number" autoFocus className="w-full bg-white px-5 py-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-black text-4xl text-slate-800 shadow-sm" value={volumeToProduce} onChange={e => setVolumeToProduce(e.target.value)} placeholder="0.00" />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">{selectedProduct.unit}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input className="w-full p-4 border rounded-2xl text-xs font-bold uppercase bg-slate-50/50" placeholder="LOTE ID" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
                                                <input type="date" className="w-full p-4 border rounded-2xl text-xs font-bold bg-slate-50/50" value={expiration} onChange={e => setExpiration(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col">
                                            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Beaker size={14} className="text-indigo-500" /> Explosión de Insumos</h5>
                                            <div className="space-y-3 flex-1 max-h-60 overflow-y-auto pr-2">
                                                {requiredIngredients.map(ing => (
                                                    <div key={ing.id} className={`flex justify-between items-center p-3 rounded-2xl text-xs border ${ing.hasEnough ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                                                        <span className="font-bold text-slate-700">{ing.name}</span>
                                                        <div className="text-right">
                                                            <span className="block font-black text-indigo-600">{ing.required.toFixed(2)} {ing.unit}</span>
                                                            <span className={`text-[9px] font-black ${ing.hasEnough ? 'text-slate-400' : 'text-red-600 uppercase'}`}>{ing.hasEnough ? `Disp: ${ing.available}` : 'STOCK INSUFICIENTE'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="text-center py-10 max-w-md mx-auto">
                                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-50"><CheckCircle size={48}/></div>
                                        <h4 className="text-2xl font-black text-slate-800 uppercase mb-3">Confirmar Producción</h4>
                                        <p className="text-sm font-bold text-slate-500 leading-relaxed">Los insumos se descontarán automáticamente del inventario maestro.</p>
                                    </div>
                                )}

                                <div className="mt-10 flex gap-4">
                                    <button onClick={() => wizardStep === 1 ? setWizardStep(0) : setWizardStep(1)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">Atrás</button>
                                    <button 
                                        disabled={!canProceedWizard}
                                        onClick={() => wizardStep === 1 ? setWizardStep(2) : startProduction()}
                                        className={`flex-[2] py-5 rounded-2xl font-black text-sm shadow-xl transition-all uppercase tracking-widest ${!canProceedWizard ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                                    >
                                        {wizardStep === 1 ? 'Siguiente' : 'Iniciar Fabricación'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSubView === 'bottling' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><Archive size={22} /></div>
                                <h4 className="text-sm font-black text-slate-800 uppercase">Catálogo de Presentaciones para Venta</h4>
                            </div>
                            <button 
                                onClick={() => { setModalMode('PACKAGED'); setIsCreateModalOpen(true); setNewProductData({ unit: 'Und' }); }}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <Plus size={14}/> NUEVA PRESENTACIÓN
                            </button>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                        <tr>
                                            <th className="p-6">Nombre de Presentación</th>
                                            <th className="p-6">Producto Madre</th>
                                            <th className="p-6">Unidad</th>
                                            <th className="p-6 text-right">Consumo Maestra</th>
                                            <th className="p-6 text-right">Costo Sugerido</th>
                                            <th className="p-6 text-right">Precio Venta</th>
                                            <th className="p-6 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {packagedProducts.length === 0 ? (
                                            <tr><td colSpan={7} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-[0.2em]">No hay presentaciones configuradas</td></tr>
                                        ) : (
                                            packagedProducts.map(p => {
                                                const mother = bulkProducts.find(b => b.id === p.consumesFromBulkId);
                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-6 font-black text-slate-800">{p.name}</td>
                                                        <td className="p-6">
                                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-bold text-[10px]">{mother?.name || '---'}</span>
                                                        </td>
                                                        <td className="p-6 uppercase font-bold text-slate-400">{p.unit}</td>
                                                        <td className="p-6 text-right font-black text-slate-600">{p.packagedSize || 0} {mother?.unit || 'Kg'}</td>
                                                        <td className="p-6 text-right font-bold text-emerald-600">{currency} {(mother ? mother.price * (p.packagedSize || 0) : 0).toFixed(2)}</td>
                                                        <td className="p-6 text-right font-black text-indigo-700 text-sm">{currency} {p.price.toFixed(2)}</td>
                                                        <td className="p-6 text-center">
                                                            <button onClick={() => setKardexItemId(p.id)} className="p-2 text-slate-400 hover:text-indigo-600"><BarChart2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubView === 'history' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                        <div className="p-8 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight"><History size={20} className="text-slate-500" /> Historial de Operaciones</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                                    <tr><th className="p-6">Fecha / Hora</th><th className="p-6">Lote</th><th className="p-6">Producto Granel</th><th className="p-6 text-right">Vol. Producido</th><th className="p-6 text-right">Envasado</th><th className="p-6 text-center">Estado</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {productionLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-6"><span className="font-bold text-slate-700 block">{new Date(log.date).toLocaleDateString()}</span><span className="text-[9px] text-slate-400 uppercase font-bold">{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                                            <td className="p-6 font-mono font-black text-indigo-600 uppercase tracking-tighter">{log.batchNumber}</td>
                                            <td className="p-6"><span className="font-black text-slate-800">{log.productName}</span><div className="text-[9px] text-slate-400 font-bold mt-1 uppercase flex items-center gap-1"><User size={10}/> {log.producedBy}</div></td>
                                            <td className="p-6 text-right font-black text-slate-600">{log.quantityProduced.toFixed(1)}</td>
                                            <td className="p-6 text-right font-black text-emerald-600">{log.packagedVolume.toFixed(1)}</td>
                                            <td className="p-6 text-center"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${log.status === 'open' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{log.status === 'open' ? 'Abierto' : 'Cerrado'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. MERMAS Y PÉRDIDAS */}
                {activeSubView === 'waste' && (
                    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl h-fit">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-red-50 text-red-600 rounded-[1.2rem] shadow-sm"><AlertOctagon size={28}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Reportar Merma</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Pérdidas de Inventario</p>
                                </div>
                            </div>
                            
                            <form className="space-y-6">
                                <div className="text-center text-slate-400 py-10 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <AlertTriangle className="mx-auto mb-2 opacity-20" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Funcionalidad de reporte de mermas</p>
                                </div>
                            </form>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <h4 className="font-black text-slate-700 text-xs uppercase tracking-widest">Movimientos Recientes</h4>
                                <AlertTriangle className="text-red-400" size={18} />
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
                                {wasteLogs.length === 0 ? (
                                    <p className="text-center text-slate-400 py-20 text-xs font-bold uppercase italic">Sin mermas registradas</p>
                                ) : (
                                    wasteLogs.map(log => (
                                        <div key={log.id} className="p-4 border rounded-2xl flex items-center justify-between bg-white hover:bg-red-50/30 transition-colors border-slate-100">
                                            <div className="min-w-0">
                                                <p className="font-black text-slate-800 text-sm truncate">{log.productName}</p>
                                                <p className="text-[9px] font-bold text-red-600 uppercase tracking-tighter mt-1 bg-red-50 px-2 py-0.5 rounded w-fit">{log.reason}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-red-600">-{log.quantity}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CREAR PRODUCTO (BULK O PACKAGED) */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 flex-none">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo {modalMode === 'BULK' ? 'Producto Granel' : 'Presentación Final'}</h3>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Catálogo Maestro de Planta</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleCreateProduct} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nombre Descriptivo</label>
                                    <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder={modalMode === 'BULK' ? "Ej. Detergente Rosa Maestra" : "Ej. Detergente Rosa 4 Litros"} value={newProductData.name || ''} onChange={e => setNewProductData({...newProductData, name: e.target.value})} />
                                </div>

                                {modalMode === 'PACKAGED' && (
                                    <>
                                        <div className="col-span-2">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Producto Madre (Granel)</label>
                                            <select required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500" value={newProductData.consumesFromBulkId || ''} onChange={e => {
                                                const mother = bulkProducts.find(b => b.id === e.target.value);
                                                setNewProductData({...newProductData, consumesFromBulkId: e.target.value, unit: 'Und', category: mother?.category});
                                            }}>
                                                <option value="">Seleccione producto base...</option>
                                                {bulkProducts.map(b => <option key={b.id} value={b.id}>{b.name} (Costo: {currency}{b.price.toFixed(2)}/{b.unit})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Cantidad Consumo Maestra</label>
                                            <div className="relative">
                                                <input type="number" step="0.01" required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:border-indigo-500 shadow-inner" placeholder="0.00" value={newProductData.packagedSize || ''} onChange={e => setNewProductData({...newProductData, packagedSize: parseFloat(e.target.value)})} />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 uppercase text-[10px]">{bulkProducts.find(b => b.id === newProductData.consumesFromBulkId)?.unit || 'Kg/Lt'}</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Unidad de Medida</label>
                                    <select required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500" value={newProductData.unit || (modalMode === 'BULK' ? 'Kg' : 'Und')} onChange={e => setNewProductData({...newProductData, unit: e.target.value})}>
                                        <option value="Kg">Kilogramos (Kg)</option>
                                        <option value="Lt">Litros (Lt)</option>
                                        <option value="Und">Unidades (Und)</option>
                                        <option value="Gal">Galones (Gal)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex justify-between">
                                        Costo {modalMode === 'BULK' ? 'Formulación' : 'Producción'}
                                        <span className="text-[9px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><TrendingUp size={10}/> Sugerido</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</span>
                                        <input type="number" step="0.0001" className="w-full pl-10 pr-4 py-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-500 transition-all shadow-md" value={newProductData.price || ''} onChange={e => setNewProductData({...newProductData, price: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            {modalMode === 'BULK' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 shadow-inner">
                                        <label className="text-[11px] font-black text-indigo-600 uppercase ml-1 tracking-widest flex items-center gap-2"><Beaker size={14}/> Formulación por Unidad</label>
                                        <div className="relative">
                                            <input className="text-[10px] p-2 pr-8 border-2 border-indigo-100 rounded-xl outline-none focus:border-indigo-500 bg-white" placeholder="Buscar insumo..." value={ingSearch} onChange={e => setIngSearch(e.target.value)} />
                                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            {ingSearch && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-2xl z-20 max-h-40 overflow-y-auto rounded-xl mt-1">
                                                    {supplies.filter(s => s.name.toLowerCase().includes(ingSearch.toLowerCase())).map(s => (
                                                        <button type="button" key={s.id} onClick={() => { addIngredient(s); setIngSearch(''); }} className="w-full text-left p-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 text-[10px] font-bold uppercase">{s.name}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {recipeIngredients.length === 0 && <p className="text-center py-6 text-[10px] text-slate-300 uppercase font-black tracking-widest italic border-2 border-dashed border-slate-100 rounded-3xl">Agregue insumos para ver el costo sugerido</p>}
                                        {recipeIngredients.map(ing => {
                                            const supply = supplies.find(s => s.id === ing.id);
                                            return (
                                                <div key={ing.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{ing.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Costo Base: {currency}{supply?.price.toFixed(4)}/{ing.unit}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative">
                                                            <input type="number" step="0.001" className="w-24 p-2 bg-white border-2 border-indigo-50 rounded-xl text-center font-black text-indigo-700 outline-none focus:border-indigo-500" value={ing.quantity} onChange={e => setRecipeIngredients(recipeIngredients.map(ri => ri.id === ing.id ? {...ri, quantity: parseFloat(e.target.value)} : ri))} />
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase w-6">{ing.unit}</span>
                                                        <button type="button" onClick={() => removeIngredient(ing.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button type="submit" className={`w-full py-5 rounded-[2rem] font-black shadow-2xl text-white uppercase tracking-widest text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${modalMode === 'BULK' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'}`}>
                                    <Save size={20}/> Guardar en Catálogo Maestro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* KARDEX MODAL */}
            {kardexItemId && (
                <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 flex-none">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><BarChart2 size={24}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Kardex Físico</h3>
                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{services.find(s => s.id === kardexItemId)?.name}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => downloadKardexCSV(kardexItemId)} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 px-6 text-[10px] font-black uppercase shadow-lg shadow-emerald-50"><Download size={18}/> Descargar Excel</button>
                                <button onClick={() => setKardexItemId(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><X size={24}/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 border-b">
                                    <tr><th className="p-6">Fecha / Hora</th><th className="p-6">Tipo</th><th className="p-6">Concepto</th><th className="p-6 text-right">Monto</th><th className="p-6">Usuario</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {getKardexData(kardexItemId).length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase italic tracking-[0.2em]">Sin actividad registrada</td></tr>
                                    ) : (
                                        getKardexData(kardexItemId).map((d, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6"><span className="font-bold text-slate-700 block">{new Date(d.date).toLocaleDateString()}</span><span className="text-[9px] text-slate-400 uppercase font-medium">{new Date(d.date).toLocaleTimeString()}</span></td>
                                                <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${d.type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{d.type}</span></td>
                                                <td className="p-6 text-slate-600 font-bold uppercase tracking-tight">{d.concept}</td>
                                                <td className={`p-6 text-right font-black text-sm ${d.type === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>{d.type === 'ENTRADA' ? '+' : '-'}{d.qty.toFixed(1)}</td>
                                                <td className="p-6"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{d.user.charAt(0)}</div><span className="font-bold text-slate-700 uppercase tracking-tighter text-[10px]">{d.user}</span></div></td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PACKAGING PROCESS MODAL */}
            {isPackagingModalOpen && selectedBatch && (
                <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative">
                        <button onClick={() => setIsPackagingModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors z-20"><X size={24}/></button>

                        <div className="p-8 pb-4">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-50"><Package size={28}/></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Proceso de Envasado</h3>
                                    <p className="text-xs text-indigo-600 font-black uppercase tracking-widest">Lote: <span className="font-mono">{selectedBatch.batchNumber}</span></p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Granel Disponible</p>
                                    <p className="text-3xl font-black text-indigo-700">{(selectedBatch.quantityProduced - selectedBatch.packagedVolume).toFixed(1)} <span className="text-sm">Kg/Lt</span></p>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Fórmula Base</p>
                                    <p className="text-sm font-black text-slate-700 truncate mt-2">{selectedBatch.productName}</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddPackaging} className="space-y-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Presentación a Generar (SKU)</label>
                                    <div className="relative">
                                        <Archive className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={20} />
                                        <select 
                                            required
                                            className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-indigo-600 outline-none font-black text-sm transition-all shadow-inner appearance-none"
                                            value={packagingSkuId}
                                            onChange={e => {
                                                setPackagingSkuId(e.target.value);
                                                const sku = packagedProducts.find(s => s.id === e.target.value);
                                                if (sku) setContainerSize(sku.packagedSize?.toString() || '');
                                            }}
                                        >
                                            <option value="">-- SELECCIONAR PRESENTACIÓN --</option>
                                            {packagedProducts.filter(sku => sku.consumesFromBulkId === selectedBatch.productId).map(sku => (
                                                <option key={sku.id} value={sku.id}>{sku.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Capacidad Unit. (Lt/Kg)</label>
                                        <input 
                                            type="number" step="0.01" required
                                            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-indigo-600 outline-none font-black text-2xl shadow-inner text-center"
                                            value={containerSize}
                                            onChange={e => setContainerSize(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">N° Unidades</label>
                                        <input 
                                            type="number" required
                                            className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-indigo-600 outline-none font-black text-2xl shadow-inner text-center"
                                            value={packagingQty}
                                            onChange={e => setPackagingQty(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {containerSize && packagingQty && (
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex justify-between items-center animate-fade-in">
                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Total a Descontar:</span>
                                        <span className="text-xl font-black text-indigo-700">{(parseFloat(containerSize) * parseFloat(packagingQty)).toFixed(1)} Kg/Lt</span>
                                    </div>
                                )}

                                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4 tracking-[0.2em]">
                                    <Archive size={24}/> CONFIRMAR ENVASADO
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
