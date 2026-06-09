import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Sale, PaymentDetail, Expense, PaymentMethod } from '../types';
import { Search, Filter, Printer, CheckCircle, Scale, Calendar, User, Wallet, FileText, Check, X, AlertTriangle, MinusCircle, Camera, Eye, Smartphone, Banknote, QrCode as QrIcon, Clock, CreditCard } from 'lucide-react';

interface LiquidationItem {
    saleId: string;
    customerName: string;
    payment: PaymentDetail;
    paymentIndex: number;
}

export const Liquidations: React.FC = () => {
    const { sales, updateSale, themeStyles, currency, employees, ticketConfig, expenses, updateExpense, paymentMethods } = useContext(AppContext);
    
    // Tabs: Cobros vs Gastos
    const [activeSection, setActiveSection] = useState<'payments' | 'expenses'>('payments');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [collectorFilter, setCollectorFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'por_validar' | 'confirmado' | 'all'>('por_validar');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Modal state for confirmation
    const [itemToConfirm, setItemToConfirm] = useState<LiquidationItem | null>(null);
    const [expenseToConfirm, setExpenseToConfirm] = useState<Expense | null>(null);
    const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);

    // Flatten all payments from all sales into a liquidation list
    const liquidations: LiquidationItem[] = useMemo(() => {
        const list: LiquidationItem[] = [];
        sales.filter(s => !s.deleted && s.status !== 'cancelado').forEach(sale => {
            sale.payments.forEach((payment, idx) => {
                const payDate = (payment.date || sale.date).split('T')[0];
                const matchesDate = payDate >= startDate && payDate <= endDate;
                const matchesCollector = collectorFilter === 'all' || payment.collectedBy === collectorFilter;
                const matchesStatus = statusFilter === 'all' || (payment.status || 'por_validar') === statusFilter;
                const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || sale.id.includes(searchTerm);

                if (matchesDate && matchesCollector && matchesStatus && matchesSearch) {
                    list.push({
                        saleId: sale.id,
                        customerName: sale.customerName,
                        payment,
                        paymentIndex: idx
                    });
                }
            });
        });
        return list.sort((a, b) => new Date(b.payment.date || '').getTime() - new Date(a.payment.date || '').getTime());
    }, [sales, startDate, endDate, collectorFilter, statusFilter, searchTerm]);

    const filteredExpenses: Expense[] = useMemo(() => {
        return expenses.filter(e => {
            if (e.deleted) return false;
            const expDate = e.date.split('T')[0];
            const matchesDate = expDate >= startDate && expDate <= endDate;
            const matchesCollector = collectorFilter === 'all' || e.staffName === collectorFilter;
            const matchesStatus = statusFilter === 'all' || (e.status || 'confirmado') === statusFilter;
            const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.includes(searchTerm);
            return matchesDate && matchesCollector && matchesStatus && matchesSearch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, startDate, endDate, collectorFilter, statusFilter, searchTerm]);

    const handleConfirmPayment = () => {
        if (!itemToConfirm) return;
        
        const sale = sales.find(s => s.id === itemToConfirm.saleId);
        if (!sale) return;

        const updatedPayments = [...sale.payments];
        updatedPayments[itemToConfirm.paymentIndex] = {
            ...updatedPayments[itemToConfirm.paymentIndex],
            status: 'confirmado'
        };

        updateSale({
            ...sale,
            payments: updatedPayments
        });
        
        setItemToConfirm(null);
    };

    const handleConfirmExpense = () => {
        if (!expenseToConfirm) return;
        updateExpense({
            ...expenseToConfirm,
            status: 'confirmado'
        });
        setExpenseToConfirm(null);
    };

    const PaymentMethodIcon = ({ pmId, size = 14 }: { pmId: string, size?: number }) => {
        const pm = paymentMethods.find(p => p.id === pmId);
        if (!pm) return <CreditCard size={size} />;
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

    const handlePrintReport = (format: 'a4' | '80mm') => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const totalPayments = liquidations.reduce((acc, curr) => acc + curr.payment.amount, 0);
        const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
        const netTotal = totalPayments - totalExpenses;

        const collectorLabel = collectorFilter === 'all' ? 'Todos' : collectorFilter;
        
        const logoHtml = ticketConfig.logoUrl ? `<img src="${ticketConfig.logoUrl}" style="max-height: 60px; margin-bottom: 10px;" />` : '';

        const styles = format === 'a4' ? `
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background: #f8fafc; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
            .summary { margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
            .total-row { font-size: 18px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            .final-delivery { font-size: 24px; color: #1e293b; }
            .text-red { color: #dc2626; }
            .text-green { color: #16a34a; }
        ` : `
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; font-size: 12px; }
            .header { text-align: center; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item { display: flex; justify-content: space-between; margin: 2px 0; }
            .bold { font-weight: bold; }
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reporte de Liquidación</title>
                    <style>${styles}</style>
                </head>
                <body>
                    <div class="header">
                        ${logoHtml}
                        <h1 style="font-size: ${format === 'a4' ? '24px' : '16px'}">LIQUIDACIÓN DE CAJA</h1>
                        <p>Periodo: ${startDate} al ${endDate}</p>
                        <p>Responsable: ${collectorLabel}</p>
                    </div>
                    ${format === 'a4' ? `
                        <h3>RESUMEN DE COBROS</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha/Hora</th>
                                    <th>Orden</th>
                                    <th>Cliente</th>
                                    <th>Metodo</th>
                                    <th>Monto</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${liquidations.map(l => `
                                    <tr>
                                        <td>${new Date(l.payment.date || '').toLocaleString()}</td>
                                        <td>#${l.saleId}</td>
                                        <td>${l.customerName}</td>
                                        <td>${l.payment.methodName}</td>
                                        <td>${currency} ${l.payment.amount.toFixed(2)}</td>
                                        <td>${l.payment.status === 'confirmado' ? 'Confirmado' : 'Pendiente'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <h3 style="margin-top: 30px;">RESUMEN DE GASTOS EN RUTA</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha/Hora</th>
                                    <th>Descripción</th>
                                    <th>Metodo</th>
                                    <th>Monto</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredExpenses.map(e => {
                                    const pm = paymentMethods.find(p => p.id === e.paymentMethodId);
                                    return `
                                    <tr>
                                        <td>${new Date(e.date).toLocaleString()}</td>
                                        <td>${e.description}</td>
                                        <td>${pm?.name || 'Efectivo'}</td>
                                        <td class="text-red">-${currency} ${e.amount.toFixed(2)}</td>
                                        <td>${e.status === 'confirmado' ? 'Confirmado' : 'Pendiente'}</td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <p class="bold">COBROS:</p>
                        ${liquidations.map(l => `
                            <div class="item">
                                <span>#${l.saleId} ${l.customerName.slice(0, 15)}</span>
                                <span class="bold">${currency} ${l.payment.amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                        <div class="divider"></div>
                        <p class="bold">GASTOS:</p>
                        ${filteredExpenses.map(e => `
                            <div class="item">
                                <span>${e.description.slice(0, 15)}</span>
                                <span class="bold">-${currency} ${e.amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    `}
                    <div class="divider"></div>
                    <div class="summary">
                        <div class="total-row">
                            <span>TOTAL COBRADO:</span>
                            <span class="text-green">${currency} ${totalPayments.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>TOTAL GASTOS:</span>
                            <span class="text-red">-${currency} ${totalExpenses.toFixed(2)}</span>
                        </div>
                        <div class="divider"></div>
                        <div class="total-row final-delivery">
                            <span>MONTO A ENTREGAR:</span>
                            <span class="bold">${currency} ${netTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="header" style="margin-top: 30px;">
                        <p>__________________________</p>
                        <p>Firma Responsable</p>
                    </div>
                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Scale size={28} className="text-indigo-600" />
                        Liquidación de Cobros y Gastos
                    </h2>
                    <p className="text-slate-500">Validación de ingresos de cobranza y gastos realizados en ruta.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handlePrintReport('80mm')} className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-700">
                        <Printer size={16} /> Ticket 80mm
                    </button>
                    <button onClick={() => handlePrintReport('a4')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50">
                        <FileText size={16} /> Reporte A4
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 ring-indigo-100 outline-none"
                            placeholder="Buscar cliente, ID o gasto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 ring-indigo-100 outline-none appearance-none"
                            value={collectorFilter}
                            onChange={e => setCollectorFilter(e.target.value)}
                        >
                            <option value="all">Cualquier Responsable</option>
                            {employees.filter(e => !e.deleted).map(e => (
                                <option key={e.id} value={e.firstName}>{e.firstName} {e.lastName}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white focus:ring-2 ring-indigo-100 outline-none appearance-none"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                        >
                            <option value="por_validar">Por Validar</option>
                            <option value="confirmado">Confirmados</option>
                            <option value="all">Ver Todos</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 p-2 border rounded-xl text-xs font-bold" />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 p-2 border rounded-xl text-xs font-bold" />
                    </div>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveSection('payments')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'payments' ? 'bg-white shadow text-indigo-700' : 'text-slate-50'}`}
                >
                    <Wallet size={16} /> Validar Cobros
                </button>
                <button 
                    onClick={() => setActiveSection('expenses')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSection === 'expenses' ? 'bg-white shadow text-red-600' : 'text-slate-50'}`}
                >
                    <MinusCircle size={16} /> Validar Gastos
                </button>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {activeSection === 'payments' ? (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b">
                                <tr>
                                    <th className="p-4">Fecha / Hora</th>
                                    <th className="p-4">Cobrador</th>
                                    <th className="p-4">Cliente / Orden</th>
                                    <th className="p-4">Método</th>
                                    <th className="p-4 text-right">Monto</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {liquidations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-10 text-center text-slate-400 italic">No hay cobros que coincidan con los filtros.</td>
                                    </tr>
                                ) : (
                                    liquidations.map((item, idx) => (
                                        <tr key={`${item.saleId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="text-slate-700 font-medium">{new Date(item.payment.date || '').toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-400">{new Date(item.payment.date || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                                        {item.payment.collectedBy?.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-600">{item.payment.collectedBy}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{item.customerName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">#{item.saleId}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <PaymentMethodIcon pmId={item.payment.methodId} />
                                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold border">
                                                        {item.payment.methodName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-black text-slate-800">
                                                {currency} {item.payment.amount.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {item.payment.status === 'confirmado' ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-green-200 inline-flex items-center gap-1">
                                                        <Check size={10} strokeWidth={4} /> Confirmado
                                                    </span>
                                                ) : (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-orange-200 animate-pulse">
                                                        Por Validar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {(item.payment.status || 'por_validar') === 'por_validar' && (
                                                    <button 
                                                        onClick={() => setItemToConfirm(item)}
                                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
                                                        title="Confirmar Recepción"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b">
                                <tr>
                                    <th className="p-4">Fecha / Hora</th>
                                    <th className="p-4">Responsable</th>
                                    <th className="p-4">Gasto / Detalle</th>
                                    <th className="p-4">Método</th>
                                    <th className="p-4 text-right">Monto</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-10 text-center text-slate-400 italic">No hay gastos que coincidan con los filtros.</td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((expense) => {
                                        const pm = paymentMethods.find(p => p.id === expense.paymentMethodId);
                                        return (
                                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="text-slate-700 font-medium">{new Date(expense.date).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-slate-400">{new Date(expense.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-bold">
                                                        {expense.staffName?.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-600">{expense.staffName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{expense.description}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">#{expense.id}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {pm && <PaymentMethodIcon pmId={pm.id} />}
                                                    <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold border">
                                                        {pm?.name || 'Efectivo'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-black text-red-600">
                                                -{currency} {expense.amount.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {expense.status === 'confirmado' ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-green-200 inline-flex items-center gap-1">
                                                        <Check size={10} strokeWidth={4} /> Confirmado
                                                    </span>
                                                ) : (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border border-orange-200 animate-pulse">
                                                        Por Validar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    {expense.photos && expense.photos.length > 0 && (
                                                        <button 
                                                            onClick={() => setViewPhotos(expense.photos!)}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                                                            title="Ver Evidencia"
                                                        >
                                                            <Camera size={18} />
                                                        </button>
                                                    )}
                                                    {(expense.status || 'por_validar') === 'por_validar' && (
                                                        <button 
                                                            onClick={() => setExpenseToConfirm(expense)}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
                                                            title="Validar Gasto"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Footer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-emerald-100 text-[10px] font-bold uppercase mb-1">Total Cobros</p>
                        <h3 className="text-2xl font-black">{currency} {liquidations.reduce((acc, curr) => acc + curr.payment.amount, 0).toFixed(2)}</h3>
                    </div>
                </div>
                
                <div className="bg-rose-600 p-4 rounded-2xl text-white shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-rose-100 text-[10px] font-bold uppercase mb-1">Total Gastos</p>
                        <h3 className="text-2xl font-black">{currency} {filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</h3>
                    </div>
                </div>

                <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-lg flex items-center justify-between md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Monto Neto a Entregar</p>
                        <h3 className="text-3xl font-black">{currency} {(liquidations.reduce((acc, curr) => acc + curr.payment.amount, 0) - filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)}</h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl relative z-10">
                        <Wallet size={24} />
                    </div>
                </div>
            </div>

            {/* Confirmation Modals */}
            {itemToConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center border-b-4 border-indigo-600">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar Pago</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            ¿Estás seguro de que deseas confirmar la recepción de <span className="font-bold text-slate-800">{currency} {itemToConfirm.payment.amount.toFixed(2)}</span> de <span className="font-bold text-slate-800">{itemToConfirm.customerName}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setItemToConfirm(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmPayment} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {expenseToConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center border-b-4 border-red-600">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MinusCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Validar Gasto</h3>
                        <p className="text-slate-500 mb-6 text-sm">
                            ¿Deseas validar el gasto de <span className="font-bold text-red-600">{currency} {expenseToConfirm.amount.toFixed(2)}</span> realizado por <span className="font-bold text-slate-800">{expenseToConfirm.staffName}</span> por motivo de <span className="font-bold">"{expenseToConfirm.description}"</span>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setExpenseToConfirm(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmExpense} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg transition-colors">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photos Viewer Modal */}
            {viewPhotos && (
                <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera size={20}/> Evidencia del Gasto</h3>
                            <button onClick={() => setViewPhotos(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {viewPhotos.map((photo, idx) => (
                                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                    <img src={photo} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-slate-50 text-right border-t">
                            <button onClick={() => setViewPhotos(null)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
