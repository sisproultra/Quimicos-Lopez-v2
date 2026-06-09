
import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Purchase, PaymentMethod } from '../types';
import { Search, Wallet, Calendar, User, ArrowUpRight, AlertCircle, ShoppingBag } from 'lucide-react';

export const AccountsPayable: React.FC = () => {
    const { purchases, paymentMethods, currency, themeStyles } = useContext(AppContext);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar compras que fueron realizadas con métodos de pago de "Crédito" y ya están recibidas (ingresadas a stock)
    // Asumimos que los métodos de crédito tienen la palabra "Crédito" en su nombre
    const creditPurchases = useMemo(() => {
        return purchases.filter(p => {
            if (p.deleted) return false;
            if (p.status === 'pendiente') return false; // Solo compras recibidas
            const method = paymentMethods.find(m => m.id === p.paymentMethodId);
            const isCredit = method?.name.toLowerCase().includes('crédito');
            const matchesSearch = p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.includes(searchTerm) || p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            return isCredit && matchesSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [purchases, paymentMethods, searchTerm]);

    const totalDebt = useMemo(() => {
        return creditPurchases.reduce((acc, p) => acc + p.total, 0);
    }, [creditPurchases]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet size={28} className="text-orange-600" />
                        Cuentas por Pagar
                    </h2>
                    <p className="text-slate-500">Monitoreo de deudas vigentes por compra de insumos.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <p className="text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowUpRight size={12} /> Total Deuda a Proveedores
                        </p>
                        <h3 className="text-3xl font-black text-slate-800">{currency} {totalDebt.toFixed(2)}</h3>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-xl text-orange-600 relative z-10">
                        <AlertCircle size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Compras Pendientes</p>
                        <h3 className="text-3xl font-black text-slate-800">{creditPurchases.length}</h3>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl text-slate-400">
                        <ShoppingBag size={24} />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 ring-emerald-100 outline-none bg-white transition-all shadow-sm"
                    placeholder="Buscar por proveedor o código de compra..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                            <tr>
                                <th className="p-4">Código / Fecha</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Condición de Pago</th>
                                <th className="p-4 text-right">Total Soles</th>
                                <th className="p-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {creditPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                                        No hay cuentas por pagar registradas.
                                    </td>
                                </tr>
                            ) : (
                                creditPurchases.map(purchase => {
                                    const method = paymentMethods.find(m => m.id === purchase.paymentMethodId);
                                    return (
                                        <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-700">{purchase.id}</div>
                                                {purchase.invoiceNumber && (
                                                    <div className="text-xs font-semibold text-emerald-600 font-mono mt-0.5">
                                                        Factura: #{purchase.invoiceNumber}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                                    <Calendar size={10} /> {new Date(purchase.date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    {purchase.supplierName}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-100">
                                                    {method?.name || 'Crédito'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-black text-red-600 text-base">{currency} {purchase.total.toFixed(2)}</div>
                                                {purchase.currency === 'USD' && (
                                                    <div className="text-[10px] text-slate-400 font-bold">$ {purchase.totalUsd?.toFixed(2)}</div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                                    PENDIENTE
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-orange-800 text-sm flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p>
                    <strong>Nota:</strong> Estas deudas se registran automáticamente cuando realizas una "Compra de Insumo" seleccionando el método de pago <strong>Crédito</strong>. El total acumulado refleja el impacto negativo en tu flujo de caja futuro.
                </p>
            </div>
        </div>
    );
};
