
import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { DollarSign, BarChart2, PieChart } from 'lucide-react';
import { ExpenseManager } from './ExpenseManager';

export const FinanceManager: React.FC = () => {
    const { sales, currency, themeStyles } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<'summary' | 'expenses'>('summary');

    const activeSales = sales.filter(s => s.status !== 'cancelado' && !s.deleted);
    const totalDebt = activeSales.reduce((acc, s) => acc + s.balance, 0);
    const totalCollected = activeSales.reduce((acc, s) => acc + s.totalPaid, 0);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center flex-none">
                <h2 className="text-2xl font-bold text-slate-800">Panel Financiero</h2>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('summary')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'summary' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BarChart2 size={18} /> Resumen & Cobranza
                    </button>
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'expenses' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <DollarSign size={18} /> Gestión de Gastos
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'summary' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
                                <p className="text-slate-500 font-bold uppercase text-xs">Cuentas por Cobrar</p>
                                <h3 className="text-3xl font-bold text-red-600 mt-2">{currency} {totalDebt.toFixed(2)}</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                                <p className="text-slate-500 font-bold uppercase text-xs">Cobrado Total</p>
                                <h3 className="text-3xl font-bold text-green-600 mt-2">{currency} {totalCollected.toFixed(2)}</h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">Estado de Deudas por Pedido</div>
                            <table className="w-full text-left">
                                <thead className="bg-white text-xs uppercase text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="p-4">Pedido</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-right">Total</th>
                                        <th className="p-4 text-right">Pagado</th>
                                        <th className="p-4 text-right">Deuda</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {activeSales.map(sale => (
                                        <tr key={sale.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-mono font-bold">#{sale.id}</td>
                                            <td className="p-4">{sale.customerName}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                                    ${sale.paymentStatus === 'pagado' ? 'bg-green-100 text-green-700' : 
                                                    sale.paymentStatus === 'parcial' ? 'bg-orange-100 text-orange-700' : 
                                                    'bg-red-100 text-red-700'}`}>
                                                    {sale.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">{currency} {sale.total.toFixed(2)}</td>
                                            <td className="p-4 text-right text-green-600">{currency} {sale.totalPaid.toFixed(2)}</td>
                                            <td className="p-4 text-right font-bold text-red-600">{currency} {sale.balance.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="animate-fade-in">
                        <ExpenseManager />
                    </div>
                )}
            </div>
        </div>
    );
};
