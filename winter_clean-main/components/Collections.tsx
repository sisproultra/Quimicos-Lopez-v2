import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Sale, Customer, PaymentMethod, PaymentDetail } from '../types';
import { Search, Filter, DollarSign, User, MapPin, X, CreditCard, CheckCircle, Wallet, Calendar } from 'lucide-react';

export const Collections: React.FC = () => {
    const { sales, customers, paymentMethods, updateSale, themeStyles, currency, currentUser } = useContext(AppContext);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [collectingSale, setCollectingSale] = useState<Sale | null>(null);
    
    // Modal Form State
    const [payAmount, setPayAmount] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState('');

    // List of unique districts for the filter
    const districts = useMemo(() => {
        const unique = new Set(customers.map(c => c.district).filter(Boolean));
        return ['all', ...Array.from(unique)].sort();
    }, [customers]);

    // Active payment methods
    const activePaymentMethods = useMemo(() => paymentMethods.filter(pm => pm.isActive && !pm.deleted), [paymentMethods]);

    // Only "Pendiente" or "Parcial"
    const pendingSales = useMemo(() => {
        return sales.filter(s => 
            !s.deleted && 
            s.status !== 'cancelado' && 
            (s.paymentStatus === 'pendiente' || s.paymentStatus === 'parcial')
        ).map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            return { ...sale, district: customer?.district || 'Sin distrito' };
        }).filter(sale => {
            const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || sale.id.includes(searchTerm);
            const matchesDistrict = districtFilter === 'all' || sale.district === districtFilter;
            return matchesSearch && matchesDistrict;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customers, searchTerm, districtFilter]);

    const handleOpenCollect = (sale: Sale) => {
        setCollectingSale(sale);
        setPayAmount(sale.balance.toString()); // Default to total balance
        setSelectedMethodId(activePaymentMethods[0]?.id || '');
    };

    const handleCollectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectingSale || !payAmount) return;

        const amountNum = parseFloat(payAmount);
        if (isNaN(amountNum) || amountNum <= 0) return;

        const method = activePaymentMethods.find(pm => pm.id === selectedMethodId);
        
        const newPayment: PaymentDetail = {
            methodId: selectedMethodId,
            methodName: method?.name || 'Otro',
            amount: amountNum,
            date: new Date().toISOString(),
            collectedBy: currentUser?.firstName || 'Sistema',
            status: 'por_validar'
        };

        const newTotalPaid = collectingSale.totalPaid + amountNum;
        const newBalance = Math.max(0, collectingSale.total - newTotalPaid);
        let newStatus = collectingSale.paymentStatus;

        if (newBalance <= 0.05) newStatus = 'pagado';
        else newStatus = 'parcial';

        updateSale({
            ...collectingSale,
            payments: [...collectingSale.payments, newPayment],
            totalPaid: newTotalPaid,
            balance: newBalance,
            paymentStatus: newStatus as any
        });

        setCollectingSale(null);
        setPayAmount('');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign size={28} className="text-green-600" />
                        Cobranzas Pendientes
                    </h2>
                    <p className="text-slate-500">Gestión de cartera y recuperación de pagos parciales.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 ring-blue-100 outline-none"
                        placeholder="Buscar por cliente o ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none appearance-none"
                        value={districtFilter}
                        onChange={e => setDistrictFilter(e.target.value)}
                    >
                        <option value="all">Todos los distritos</option>
                        {districts.filter(d => d !== 'all').map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center justify-end">
                    <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 font-bold text-sm">
                        Pendientes: {pendingSales.length}
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                            <tr>
                                <th className="p-4">ID / Fecha</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Distrito</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-right">Acuenta</th>
                                <th className="p-4 text-right">Deuda</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {pendingSales.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-slate-400 italic">No se encontraron pedidos pendientes de cobro.</td>
                                </tr>
                            ) : (
                                pendingSales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">#{sale.id}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(sale.date).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{sale.customerName}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <MapPin size={12} />
                                                {(sale as any).district}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-medium text-slate-500">{currency} {sale.total.toFixed(2)}</td>
                                        <td className="p-4 text-right text-green-600 font-medium">+{currency} {sale.totalPaid.toFixed(2)}</td>
                                        <td className="p-4 text-right font-black text-red-600 text-base">{currency} {sale.balance.toFixed(2)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${sale.paymentStatus === 'pendiente' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                {sale.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleOpenCollect(sale)}
                                                className={`px-4 py-2 rounded-lg font-bold text-xs text-white shadow-sm transition-all hover:scale-105 active:scale-95 ${themeStyles.primary}`}
                                            >
                                                COBRAR
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Collection Modal */}
            {collectingSale && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Registrar Cobranza</h3>
                                <p className="text-xs text-slate-500">Orden #{collectingSale.id} - {collectingSale.customerName}</p>
                            </div>
                            <button onClick={() => setCollectingSale(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                        </div>

                        <form onSubmit={handleCollectSubmit} className="p-6 space-y-6">
                            {/* Summary Box */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Saldo Actual</p>
                                    <p className="text-2xl font-black text-blue-800">{currency} {collectingSale.balance.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Orden</p>
                                    <p className="text-lg font-bold text-slate-600">{currency} {collectingSale.total.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Monto a Cobrar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{currency}</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-2xl text-slate-800 outline-none focus:border-green-500 transition-all"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        max={collectingSale.balance + 0.05}
                                    />
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3">Método de Pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {activePaymentMethods.map(pm => (
                                        <button 
                                            key={pm.id}
                                            type="button"
                                            onClick={() => setSelectedMethodId(pm.id)}
                                            className={`p-3 rounded-xl border-2 font-bold text-xs flex items-center gap-2 transition-all ${selectedMethodId === pm.id ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                        >
                                            {pm.imageIcon ? (
                                                <img src={pm.imageIcon} className="w-5 h-5 object-contain" alt="" />
                                            ) : (
                                                <Wallet size={14} />
                                            )}
                                            {pm.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setCollectingSale(null)}
                                    className="flex-1 py-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-[2] py-4 rounded-xl bg-green-600 text-white font-bold text-lg shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} /> Registrar Cobro
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
                                Cobrado por: {currentUser?.firstName || 'Admin'}
                            </p>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
