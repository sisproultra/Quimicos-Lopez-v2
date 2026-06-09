



import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { CircleDollarSign, Unlock, Lock, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, User, Banknote, X, Plus, CreditCard } from 'lucide-react';
import { Sale, Expense, Income } from '../types';

export const CashControl: React.FC = () => {
    const { currentShift, openCashShift, closeCashShift, themeStyles: themeColors, currency, employees, addIncome, paymentMethods } = useContext(AppContext);
    
    // Local state for forms
    const [initialAmount, setInitialAmount] = useState<string>('');
    const [finalAmount, setFinalAmount] = useState<string>('');
    const [closingNotes, setClosingNotes] = useState<string>('');
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

    // Modal State for Details
    const [detailsModalType, setDetailsModalType] = useState<'sales' | 'nonCashSales' | 'expenses' | 'nonCashExpenses' | 'incomes' | null>(null);

    // Modal State for New Income (Extra Income)
    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [newIncomeDesc, setNewIncomeDesc] = useState('');
    const [newIncomeAmount, setNewIncomeAmount] = useState('');

    // Mock User (replace with actual auth context if available)
    const currentUser = employees.find(e => e.role === 'admin')?.firstName || 'Admin';

    const handleOpenShift = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(initialAmount);
        if (!isNaN(amount) && amount >= 0) {
            openCashShift(amount, currentUser);
        }
    };

    const handleCloseShift = () => {
        const amount = parseFloat(finalAmount);
        if (!isNaN(amount) && amount >= 0) {
            closeCashShift(amount, closingNotes, currentUser);
            setIsClosingModalOpen(false);
            setFinalAmount('');
            setClosingNotes('');
        }
    };

    const handleAddIncome = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(newIncomeAmount);
        if (newIncomeDesc && amount > 0) {
            const newIncome: Income = {
                id: Date.now().toString(),
                description: newIncomeDesc,
                amount: amount,
                date: new Date().toISOString()
            };
            addIncome(newIncome);
            setNewIncomeDesc('');
            setNewIncomeAmount('');
            setIsIncomeModalOpen(false);
        }
    };

    // --- Details Render Helpers ---
    const renderDetailsModal = () => {
        if (!detailsModalType || !currentShift) return null;

        let title = '';
        let content = null;

        if (detailsModalType === 'sales') {
            title = 'Detalle de Ventas en Efectivo';
            const salesList = currentShift.salesDetails || [];
            content = (
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Orden</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3 text-right">Efectivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {salesList.length === 0 ? (
                                 <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin ventas en efectivo</td></tr>
                             ) : (
                                 salesList.map(s => {
                                     const cashPaid = s.payments
                                        .filter(p => p.methodName.toLowerCase() === 'efectivo')
                                        .reduce((sum, p) => sum + p.amount, 0);
                                     
                                     const change = s.change > 0 ? s.change : 0;
                                     const netCash = Math.max(0, cashPaid - change);

                                     return (
                                        <tr key={s.id}>
                                            <td className="p-3 text-xs text-slate-500">{new Date(s.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-3 font-mono text-xs">#{s.id}</td>
                                            <td className="p-3 text-sm font-medium">{s.customerName}</td>
                                            <td className="p-3 text-right font-bold text-green-600">+{currency} {netCash.toFixed(2)}</td>
                                        </tr>
                                     )
                                 })
                             )}
                        </tbody>
                    </table>
                </div>
            );
        } else if (detailsModalType === 'nonCashSales') {
             title = 'Detalle Ventas Digitales / Banco';
             const salesList = currentShift.nonCashSalesDetails || [];
             content = (
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Orden</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Método</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {salesList.length === 0 ? (
                                 <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin ventas digitales</td></tr>
                             ) : (
                                 salesList.map(s => {
                                     // Filter only non-cash payments for this row logic
                                     const nonCashPayments = s.payments.filter(p => p.methodName.toLowerCase() !== 'efectivo');
                                     
                                     // If multiple non-cash payments in one order, list them
                                     return nonCashPayments.map((p, pIdx) => (
                                         <tr key={`${s.id}-${pIdx}`}>
                                            <td className="p-3 text-xs text-slate-500">{new Date(s.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                            <td className="p-3 font-mono text-xs">#{s.id}</td>
                                            <td className="p-3 text-sm font-medium">{s.customerName}</td>
                                            <td className="p-3 text-sm text-blue-600 font-bold">{p.methodName}</td>
                                            <td className="p-3 text-right font-bold text-slate-700">{currency} {p.amount.toFixed(2)}</td>
                                         </tr>
                                     ));
                                 })
                             )}
                        </tbody>
                    </table>
                </div>
             );
        } else if (detailsModalType === 'expenses') {
            title = 'Detalle de Gastos en Efectivo';
            const expenseList = currentShift.expensesDetails || [];
            content = (
                <div className="overflow-auto max-h-[60vh]">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {expenseList.length === 0 ? (
                                 <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin gastos en efectivo</td></tr>
                             ) : (
                                 expenseList.map(e => (
                                    <tr key={e.id}>
                                        <td className="p-3 text-xs text-slate-500">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="p-3">
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${e.type === 'FIJO' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {e.type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm">
                                            <p className="font-medium text-slate-700">{e.description}</p>
                                            <p className="text-xs text-slate-400">{e.category} {e.staffName ? `• ${e.staffName}` : ''}</p>
                                        </td>
                                        <td className="p-3 text-right font-bold text-red-600">-{currency} {e.amount.toFixed(2)}</td>
                                    </tr>
                                 ))
                             )}
                        </tbody>
                    </table>
                </div>
            )
        } else if (detailsModalType === 'nonCashExpenses') {
            title = 'Detalle de Gastos Digitales';
            const expenseList = currentShift.nonCashExpensesDetails || [];
            content = (
                <div className="overflow-auto max-h-[60vh]">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3">Método</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {expenseList.length === 0 ? (
                                 <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin gastos digitales</td></tr>
                             ) : (
                                 expenseList.map(e => {
                                    const pm = paymentMethods.find(p => p.id === e.paymentMethodId);
                                    return (
                                    <tr key={e.id}>
                                        <td className="p-3 text-xs text-slate-500">{new Date(e.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="p-3">
                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${e.type === 'FIJO' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {e.type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm">
                                            <p className="font-medium text-slate-700">{e.description}</p>
                                            <p className="text-xs text-slate-400">{e.category} {e.staffName ? `• ${e.staffName}` : ''}</p>
                                        </td>
                                        <td className="p-3 text-sm text-indigo-600 font-bold">{pm?.name || '-'}</td>
                                        <td className="p-3 text-right font-bold text-indigo-700">-{currency} {e.amount.toFixed(2)}</td>
                                    </tr>
                                 )})
                             )}
                        </tbody>
                    </table>
                </div>
            )
        } else if (detailsModalType === 'incomes') {
            title = 'Otros Ingresos de Efectivo';
            const incomeList = currentShift.incomesDetails || [];
            content = (
                <div className="overflow-auto max-h-[60vh]">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                             {incomeList.length === 0 ? (
                                 <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sin otros ingresos</td></tr>
                             ) : (
                                 incomeList.map(i => (
                                    <tr key={i.id}>
                                        <td className="p-3 text-xs text-slate-500">{new Date(i.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="p-3 text-sm font-medium text-slate-700">{i.description}</td>
                                        <td className="p-3 text-right font-bold text-teal-600">+{currency} {i.amount.toFixed(2)}</td>
                                    </tr>
                                 ))
                             )}
                        </tbody>
                    </table>
                </div>
            )
        }

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">{title}</h3>
                        <button onClick={() => setDetailsModalType(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                    </div>
                    <div className="flex-1 bg-white">
                        {content}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                        <button onClick={() => setDetailsModalType(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100">Cerrar</button>
                    </div>
                </div>
            </div>
        );
    };


    // VIEW: CLOSED (Show Open Form)
    if (!currentShift) {
        return (
            <div className="h-full flex items-center justify-center p-4 bg-slate-100">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Caja Cerrada</h2>
                    <p className="text-slate-500 mb-8">Debe realizar la apertura de caja para comenzar las operaciones del día.</p>
                    
                    <form onSubmit={handleOpenShift} className="space-y-4 text-left">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Monto Inicial en Caja</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">{currency}</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    autoFocus
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 ${themeColors.ring} focus:outline-none font-bold text-xl text-slate-800`}
                                    placeholder="0.00"
                                    value={initialAmount}
                                    onChange={e => setInitialAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit"
                            className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 ${themeColors.primary}`}
                        >
                            <Unlock size={20} /> ABRIR CAJA
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // VIEW: OPEN (Monitor)
    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CircleDollarSign size={28} className="text-green-600" />
                        Control de Caja
                    </h2>
                    <p className="text-slate-500">Monitor de efectivo en tiempo real.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                     <button 
                        onClick={() => setIsIncomeModalOpen(true)}
                        className="flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-teal-100 transition-colors"
                     >
                        <Plus size={18} /> Ingreso Extra
                     </button>
                     <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User size={16} />
                            <span>{currentShift.openedBy}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-200"></div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock size={16} />
                            <span>Apertura: {new Date(currentShift.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Initial */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Fondo Inicial</p>
                        <h3 className="text-xl font-bold text-slate-800">{currency} {currentShift.initialAmount.toFixed(2)}</h3>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                        <Banknote size={20} />
                    </div>
                </div>

                {/* Cash Sales */}
                <button 
                    onClick={() => setDetailsModalType('sales')}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between relative overflow-hidden group hover:border-green-300 transition-all text-left"
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-3 -mt-3 z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-green-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowDownRight size={12} /> Ventas Efectivo
                        </p>
                        <h3 className="text-xl font-bold text-green-700">{currency} {currentShift.totalCashSales.toFixed(2)}</h3>
                        <span className="text-[10px] text-green-500 underline decoration-dashed mt-1 inline-block">Ver detalles</span>
                    </div>
                    <div className="p-2 bg-green-100 rounded-xl text-green-600 relative z-10 group-hover:bg-green-200 transition-colors">
                        <CircleDollarSign size={20} />
                    </div>
                </button>

                 {/* Non-Cash Sales (Cards/Digital) */}
                 <button 
                    onClick={() => setDetailsModalType('nonCashSales')}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between relative overflow-hidden group hover:border-blue-300 transition-all text-left"
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50 rounded-bl-full -mr-3 -mt-3 z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowDownRight size={12} /> Ventas Digitales
                        </p>
                        <h3 className="text-xl font-bold text-blue-700">{currency} {currentShift.totalNonCashSales.toFixed(2)}</h3>
                        <span className="text-[10px] text-blue-500 underline decoration-dashed mt-1 inline-block">Ver detalles</span>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-xl text-blue-600 relative z-10 group-hover:bg-blue-200 transition-colors">
                        <CreditCard size={20} />
                    </div>
                </button>

                 {/* Other Income */}
                 <button 
                    onClick={() => setDetailsModalType('incomes')}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-teal-100 flex items-center justify-between relative overflow-hidden group hover:border-teal-300 transition-all text-left"
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-teal-50 rounded-bl-full -mr-3 -mt-3 z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-teal-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowDownRight size={12} /> Otros Ingresos
                        </p>
                        <h3 className="text-xl font-bold text-teal-700">{currency} {currentShift.totalOtherIncome.toFixed(2)}</h3>
                        <span className="text-[10px] text-teal-500 underline decoration-dashed mt-1 inline-block">Ver detalles</span>
                    </div>
                    <div className="p-2 bg-teal-100 rounded-xl text-teal-600 relative z-10 group-hover:bg-teal-200 transition-colors">
                        <Plus size={20} />
                    </div>
                </button>

                {/* Cash Expenses - RENAMED */}
                <button 
                    onClick={() => setDetailsModalType('expenses')}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between relative overflow-hidden group hover:border-orange-300 transition-all text-left"
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-orange-50 rounded-bl-full -mr-3 -mt-3 z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowUpRight size={12} /> Gastos Efectivo
                        </p>
                        <h3 className="text-xl font-bold text-orange-700">{currency} {currentShift.totalCashExpenses.toFixed(2)}</h3>
                        <span className="text-[10px] text-orange-500 underline decoration-dashed mt-1 inline-block">Ver detalles</span>
                    </div>
                    <div className="p-2 bg-orange-100 rounded-xl text-orange-600 relative z-10 group-hover:bg-orange-200 transition-colors">
                        <ArrowUpRight size={20} />
                    </div>
                </button>

                {/* Non-Cash Expenses - NEW */}
                <button 
                    onClick={() => setDetailsModalType('nonCashExpenses')}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-between relative overflow-hidden group hover:border-indigo-300 transition-all text-left"
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full -mr-3 -mt-3 z-0 group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ArrowUpRight size={12} /> Gastos Digitales
                        </p>
                        <h3 className="text-xl font-bold text-indigo-700">{currency} {currentShift.totalNonCashExpenses.toFixed(2)}</h3>
                        <span className="text-[10px] text-indigo-500 underline decoration-dashed mt-1 inline-block">Ver detalles</span>
                    </div>
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 relative z-10 group-hover:bg-indigo-200 transition-colors">
                        <CreditCard size={20} />
                    </div>
                </button>
            </div>

            {/* Total Balance Card */}
            <div className="bg-slate-800 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div>
                    <p className="text-slate-400 font-medium mb-1 uppercase tracking-widest text-xs">Saldo Esperado en Caja (Efectivo)</p>
                    <h1 className="text-5xl font-bold">{currency} {((currentShift.expectedAmount || 0)).toFixed(2)}</h1>
                    <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                        <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">
                            {currentShift.initialAmount} (Ini) + {currentShift.totalCashSales} (Vtas Efec) + {currentShift.totalOtherIncome} (Otros) - {currentShift.totalCashExpenses} (Gts Efec)
                        </span>
                    </p>
                </div>

                <button 
                    onClick={() => setIsClosingModalOpen(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <Lock size={20} /> CERRAR CAJA
                </button>
            </div>
            
            {/* Details Modal */}
            {renderDetailsModal()}

            {/* Income Modal */}
            {isIncomeModalOpen && (
                 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                         <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-teal-50">
                            <h3 className="font-bold text-teal-800">Registrar Ingreso Extra</h3>
                            <button onClick={() => setIsIncomeModalOpen(false)} className="text-teal-500 hover:text-teal-700"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddIncome} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Concepto</label>
                                <input 
                                    required
                                    placeholder="Ej. Venta de cartón, Propina..."
                                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none`}
                                    value={newIncomeDesc}
                                    onChange={e => setNewIncomeDesc(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Monto ({currency})</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    required
                                    className={`w-full px-4 py-2 border border-slate-200 rounded-lg ${themeColors.ring} outline-none font-bold text-lg`}
                                    value={newIncomeAmount}
                                    onChange={e => setNewIncomeAmount(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors">
                                Registrar Ingreso
                            </button>
                        </form>
                    </div>
                 </div>
            )}

            {/* Closing Modal */}
            {isClosingModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="bg-slate-50 p-6 border-b border-slate-100 text-center">
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Cierre de Caja</h3>
                            <p className="text-slate-500 text-sm">Confirme los montos físicos contados.</p>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase">Sistema espera (Efectivo)</p>
                                <p className="text-2xl font-bold text-slate-800">{currency} {(currentShift.expectedAmount || 0).toFixed(2)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Monto Real en Caja (Contado)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">{currency}</span>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        autoFocus
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 ${themeColors.ring} focus:outline-none font-bold text-xl text-slate-800`}
                                        placeholder="0.00"
                                        value={finalAmount}
                                        onChange={e => setFinalAmount(e.target.value)}
                                    />
                                </div>
                                {finalAmount && (
                                    <div className={`mt-2 text-center text-sm font-bold ${(parseFloat(finalAmount) - (currentShift.expectedAmount || 0)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        Diferencia: {currency} {(parseFloat(finalAmount) - (currentShift.expectedAmount || 0)).toFixed(2)}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Notas / Observaciones</label>
                                <textarea 
                                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-100 resize-none h-24"
                                    placeholder="Ej. Faltante por error en vuelto..."
                                    value={closingNotes}
                                    onChange={e => setClosingNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button 
                                onClick={() => setIsClosingModalOpen(false)}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCloseShift}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg transition-colors"
                            >
                                Confirmar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};