import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Sale, SaleStatus, PaymentDetail, PickupRequest, PaymentMethod } from '../types';
import { Truck, QrCode, CheckCircle, Package, MapPin, Camera, X, ArrowRight, Phone, Search, Map, Box, ClipboardList, Plus, Trash2, CreditCard, AlertTriangle, Smartphone, Banknote, QrCode as QrIcon, Clock, Wallet } from 'lucide-react';

// Status Configuration
const STATUS_CONFIG: Record<SaleStatus, { label: string, color: string, icon: any, actionLabel?: string, actionColor?: string }> = {
    'pendiente': { label: 'Pendientes', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: ClipboardList, actionLabel: 'Preparar', actionColor: 'bg-blue-600' },
    'en_preparacion': { label: 'En Prep.', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Box, actionLabel: 'Despachar', actionColor: 'bg-purple-600' },
    'despachado': { label: 'Despachado', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Package, actionLabel: 'Iniciar Ruta', actionColor: 'bg-indigo-600' },
    'en_ruta': { label: 'En Ruta', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: Truck, actionLabel: 'Entregar', actionColor: 'bg-green-600' },
    'entregado': { label: 'Entregado', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
    'cancelado': { label: 'Cancelado', color: 'text-red-700 bg-red-50 border-red-200', icon: X },
    'por_lavar': { label: 'Por Lavar', color: 'text-slate-500 bg-slate-50', icon: Package },
    'lavado': { label: 'Lavado', color: 'text-slate-500 bg-slate-50', icon: Package },
};

// LOGICAL ORDER OF OPERATIONS
const ORDERED_TABS: SaleStatus[] = ['pendiente', 'en_preparacion', 'despachado', 'en_ruta', 'entregado'];

export const Logistics: React.FC = () => {
    const { sales, updateSale, currency, paymentMethods, customers, pickupRequests, deletePickupRequest } = useContext(AppContext);
    
    // Default to 'pendiente' to see new orders first
    const [activeTab, setActiveTab] = useState<SaleStatus>('pendiente');
    
    const [qrInput, setQrInput] = useState('');
    const [deliveryModal, setDeliveryModal] = useState<Sale | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Active payment methods
    const activePaymentMethods = useMemo(() => paymentMethods.filter(pm => pm.isActive && !pm.deleted), [paymentMethods]);

    // Pickup Delete Confirmation
    const [pickupToDelete, setPickupToDelete] = useState<PickupRequest | null>(null);
    
    // Delivery Modal States
    const [proofPhoto, setProofPhoto] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethodId, setPaymentMethodId] = useState<string>('');
    
    // Mixed Payment State
    const [tempPayments, setTempPayments] = useState<PaymentDetail[]>([]);

    // Filter Logic
    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            if (s.deleted) return false;
            const matchesTab = s.status === activeTab;
            const matchesSearch = s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
            return matchesTab && matchesSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, activeTab, searchTerm]);

    const handleQrScan = (e: React.FormEvent) => {
        e.preventDefault();
        const sale = sales.find(s => s.id === qrInput && !s.deleted);
        if (!sale) {
            alert('Pedido no encontrado');
            return;
        }

        if (sale.status !== activeTab && ORDERED_TABS.includes(sale.status)) {
            setActiveTab(sale.status);
        }

        if (sale.status === 'pendiente') {
             updateSale({ ...sale, status: 'en_preparacion' });
             setActiveTab('en_preparacion');
        } else if (sale.status === 'en_preparacion') {
             updateSale({ ...sale, status: 'despachado' });
             setActiveTab('despachado');
        } else if (sale.status === 'despachado') {
            updateSale({ ...sale, status: 'en_ruta', dispatchedAt: new Date().toISOString() });
            setActiveTab('en_ruta'); 
        } else if (sale.status === 'en_ruta') {
            openDeliveryModal(sale);
        } else {
            alert(`El pedido #${sale.id} está en estado: ${STATUS_CONFIG[sale.status].label}`);
        }
        setQrInput('');
    };

    const handleActionClick = (sale: Sale) => {
        if (sale.status === 'pendiente') {
            updateSale({ ...sale, status: 'en_preparacion' });
        } else if (sale.status === 'en_preparacion') {
            updateSale({ ...sale, status: 'despachado' }); 
        } else if (sale.status === 'despachado') {
            updateSale({ ...sale, status: 'en_ruta', dispatchedAt: new Date().toISOString() });
            setActiveTab('en_ruta');
        } else if (sale.status === 'en_ruta') {
            openDeliveryModal(sale);
        }
    };

    const openDeliveryModal = (sale: Sale) => {
        setDeliveryModal(sale);
        setPaymentAmount(''); // Start at zero/empty
        setTempPayments([]); // Reset mixed payments
        setProofPhoto(null);
        setPaymentMethodId(activePaymentMethods[0]?.id || '');
    };

    const handleAddPartialPayment = () => {
        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) return;

        const method = activePaymentMethods.find(pm => pm.id === paymentMethodId);
        
        const newPayment: PaymentDetail = {
            methodId: paymentMethodId,
            methodName: method?.name || 'Desconocido',
            amount: amount,
            date: new Date().toISOString()
        };

        setTempPayments([...tempPayments, newPayment]);
        setPaymentAmount(''); // Clear input for next entry
    };

    const removePartialPayment = (index: number) => {
        const newPayments = [...tempPayments];
        newPayments.splice(index, 1);
        setTempPayments(newPayments);
    };

    const handleConfirmDelivery = () => {
        if (!deliveryModal) return;
        
        // Include partial payments AND whatever is currently in the input (if user forgot to click add but typed it)
        let finalPayments = [...deliveryModal.payments, ...tempPayments];
        let addedAmount = tempPayments.reduce((sum, p) => sum + p.amount, 0);

        const currentInputAmount = parseFloat(paymentAmount);
        if (!isNaN(currentInputAmount) && currentInputAmount > 0) {
            const method = activePaymentMethods.find(pm => pm.id === paymentMethodId);
            finalPayments.push({
                methodId: paymentMethodId,
                methodName: method?.name || 'Desconocido',
                amount: currentInputAmount,
                date: new Date().toISOString()
            });
            addedAmount += currentInputAmount;
        }

        const newTotalPaid = deliveryModal.totalPaid + addedAmount;
        const newBalance = deliveryModal.total - newTotalPaid;
        
        updateSale({
            ...deliveryModal,
            status: 'entregado',
            deliveredAt: new Date().toISOString(),
            deliveryProofPhoto: proofPhoto || undefined,
            payments: finalPayments,
            totalPaid: newTotalPaid,
            balance: newBalance,
            paymentStatus: newBalance <= 0.1 ? 'pagado' : (newTotalPaid > 0 ? 'parcial' : 'pendiente')
        });

        setDeliveryModal(null);
        setProofPhoto(null);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setProofPhoto(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const getCustomerDetails = (customerId: string) => {
        return customers.find(c => c.id === customerId);
    };

    const openMap = (address: string) => {
        const encoded = encodeURIComponent(address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
    };

    // Calculations for Modal
    const tempTotalPaid = tempPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = deliveryModal ? deliveryModal.balance - tempTotalPaid : 0;

    const PaymentMethodIcon = ({ pm, size = 16 }: { pm: PaymentMethod, size?: number }) => {
        if (pm.imageIcon) {
          return <img src={pm.imageIcon} className="rounded-sm object-contain" style={{ width: size, height: size }} alt="" />;
        }
        switch(pm.icon) {
          case 'Smartphone': return <Smartphone size={size} />;
          case 'Banknote': return <Banknote size={size} />;
          case 'QrCode': return <QrIcon size={size} />;
          case 'Clock': return <Clock size={size} />;
          case 'Wallet': return <Wallet size={size} />;
          default: return <CreditCard size={size} />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 relative">
            {/* 1. Sticky Header: Scanner & Search */}
            <div className="bg-white p-3 shadow-sm z-20 sticky top-0 border-b border-slate-200">
                <form onSubmit={handleQrScan} className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <QrCode className="text-slate-400" size={18} />
                        </div>
                        <input 
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 ring-indigo-500 focus:bg-white transition-all text-sm"
                            placeholder="Escanear QR / ID"
                            value={qrInput}
                            onChange={e => setQrInput(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-slate-800 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform">
                        <ArrowRight size={20} />
                    </button>
                </form>
                
                {/* Search Filter */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                        placeholder="Filtrar por cliente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* 2. Tabs - WRAPPING FLEX LAYOUT FOR MOBILE VISIBILITY */}
            <div className="bg-white border-b border-slate-200 shadow-sm z-10 p-2">
                <div className="flex flex-wrap gap-2 justify-center">
                    {ORDERED_TABS.map((status, index) => {
                        const config = STATUS_CONFIG[status];
                        const count = sales.filter(s => s.status === status && !s.deleted).length;
                        const isActive = activeTab === status;
                        
                        return (
                            <button
                                key={status}
                                onClick={() => setActiveTab(status)}
                                className={`flex-1 min-w-[28%] flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all border relative
                                    ${isActive 
                                        ? `${config.color} border-current shadow-md scale-[1.02] z-10` 
                                        : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-800 text-white rounded-full text-[9px] flex items-center justify-center font-bold shadow-sm">
                                        {index + 1}
                                    </div>
                                )}
                                <config.icon size={18} className="mb-1" />
                                <span className="text-[9px] font-bold uppercase tracking-tight leading-none text-center whitespace-nowrap">{config.label}</span>
                                {count > 0 && (
                                    <span className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isActive ? 'bg-white/40' : 'bg-slate-100 text-slate-600'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. List Content (Desktop Grid Optimized) */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-100 pb-24">
                {filteredSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                        <div className="p-3 bg-white rounded-full mb-2 shadow-sm border border-slate-200">
                            <Package size={32} className="text-slate-300" />
                        </div>
                        <p className="font-medium text-sm text-slate-500">Sin pedidos en <span className="font-bold text-slate-700">{STATUS_CONFIG[activeTab].label}</span></p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredSales.map(sale => {
                            const config = STATUS_CONFIG[sale.status];
                            const customer = getCustomerDetails(sale.customerId);
                            const isPaid = sale.paymentStatus === 'pagado';
                            
                            return (
                                <div key={sale.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2 relative overflow-hidden active:scale-[0.99] md:active:scale-100 transition-transform h-fit">
                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${config.color.split(' ')[0].replace('text', 'bg')}`}></div>

                                    <div className="flex justify-between items-start pl-2">
                                        <div className="min-w-0 flex-1 mr-2">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-mono font-bold text-slate-400 text-[10px]">#{sale.id}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{sale.customerName}</h3>
                                            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5 truncate">
                                                <MapPin size={10} className="flex-shrink-0" />
                                                <span className="truncate">{customer?.address || 'Sin dirección'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="font-bold text-base text-slate-800">{currency} {sale.total.toFixed(2)}</div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {sale.paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg ml-2 border border-slate-100 line-clamp-2">
                                        {sale.items.map(i => `${i.quantity} ${i.serviceName}`).join(', ')}
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 ml-2 mt-1">
                                        <a href={`tel:${customer?.phone}`} className="col-span-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center p-2.5 transition-colors">
                                            <Phone size={18} />
                                        </a>
                                        
                                        <button 
                                            onClick={() => customer?.address && openMap(customer.address)}
                                            className={`col-span-1 rounded-lg flex items-center justify-center p-2.5 transition-colors ${customer?.address ? 'bg-slate-100 hover:bg-slate-200 text-blue-600' : 'bg-slate-50 text-slate-300'}`}
                                            disabled={!customer?.address}
                                        >
                                            <Map size={18} />
                                        </button>

                                        {config.actionLabel && (
                                            <button 
                                                onClick={() => handleActionClick(sale)}
                                                className={`col-span-2 ${config.actionColor || 'bg-slate-800'} text-white rounded-lg font-bold text-xs shadow-md flex items-center justify-center gap-2 active:scale-95 md:hover:scale-105 transition-all`}
                                            >
                                                {sale.status === 'en_ruta' ? <CheckCircle size={16}/> : <ArrowRight size={16}/>}
                                                {config.actionLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delivery Modal - REDESIGNED FOR BETTER UX ON PC */}
            {deliveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                        onClick={() => setDeliveryModal(null)}
                    ></div>
                    
                    {/* Modal Content - Expanded Width for PC */}
                    <div className="relative bg-white w-full max-w-md md:max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all">
                        
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                    <Truck size={20} />
                                </div>
                                Entrega #{deliveryModal.id}
                            </h3>
                            <button onClick={() => setDeliveryModal(null)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body - Grid Layout for Desktop */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                                
                                {/* LEFT COL: Order Context & Evidence */}
                                <div className="space-y-6">
                                    {/* Summary Card */}
                                    <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group h-fit">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0 transition-transform group-hover:scale-110"></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Cliente</p>
                                                    <p className="font-bold text-lg text-slate-800 leading-tight">{deliveryModal.customerName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Total</p>
                                                    <p className="font-bold text-lg text-indigo-600">{currency} {deliveryModal.total.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                <span className="text-sm font-medium text-slate-600">Saldo Pendiente:</span>
                                                <span className="text-3xl font-black text-red-500">{currency} {Math.max(0, remainingBalance).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Proof Section - Moved to Left Column on Desktop */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <Camera size={16} className="text-slate-400"/> Evidencia (Opcional)
                                        </h4>
                                        <label className={`block w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group h-32 md:h-40
                                            ${proofPhoto ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-slate-50'}`}
                                        >
                                            {proofPhoto ? (
                                                <>
                                                    <img src={proofPhoto} className="w-full h-full object-cover opacity-80" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-white font-bold text-sm flex items-center gap-2"><Camera size={16}/> Cambiar Foto</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <div className="bg-white p-3 rounded-full inline-block mb-2 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors shadow-sm">
                                                        <Camera size={24} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500">Subir foto de entrega</p>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                        </label>
                                    </div>
                                </div>

                                {/* RIGHT COL: Payment & Processing */}
                                <div className="space-y-6 flex flex-col">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <CreditCard size={16} className="text-slate-400"/> Registro de Pago
                                        </h4>
                                        
                                        <div className="flex gap-2 mb-3">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currency}</span>
                                                <input 
                                                    type="number" 
                                                    inputMode="decimal"
                                                    className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold text-slate-800 bg-white shadow-sm"
                                                    value={paymentAmount}
                                                    onChange={e => setPaymentAmount(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleAddPartialPayment}
                                                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                                                className="bg-slate-800 text-white w-12 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 shadow-md active:scale-95 transition-all hover:bg-slate-700"
                                            >
                                                <Plus size={24} />
                                            </button>
                                        </div>

                                        {/* Method Chips */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {activePaymentMethods.map(pm => (
                                                <button 
                                                    key={pm.id}
                                                    onClick={() => setPaymentMethodId(pm.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${paymentMethodId === pm.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                                >
                                                    <PaymentMethodIcon pm={pm} />
                                                    {pm.name}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Added Payments List */}
                                        {tempPayments.length > 0 && (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    Pagos a registrar ahora
                                                </div>
                                                <div className="divide-y divide-slate-50">
                                                    {tempPayments.map((p, idx) => (
                                                        <div key={idx} className="flex justify-between items-center p-3 text-sm">
                                                            <span className="font-medium text-slate-700">{p.methodName}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-green-600">+{currency} {p.amount.toFixed(2)}</span>
                                                                <button onClick={() => removePartialPayment(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-indigo-50 px-3 py-2 border-t border-indigo-100 flex justify-between items-center">
                                                    <span className="text-xs font-bold text-indigo-800">Total a Pagar:</span>
                                                    <span className="font-bold text-indigo-700">{currency} {tempTotalPaid.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0 flex justify-end">
                            <button 
                                onClick={handleConfirmDelivery}
                                className="w-full md:w-auto md:px-12 py-3.5 bg-green-600 text-white rounded-xl font-bold text-base shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} /> Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pickup Delete Modal */}
            {pickupToDelete && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Solicitud?</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            ¿Estás seguro de eliminar la solicitud de <span className="font-bold text-slate-800">{pickupToDelete.clientName}</span>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setPickupToDelete(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    deletePickupRequest(pickupToDelete.id);
                                    setPickupToDelete(null);
                                }}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
