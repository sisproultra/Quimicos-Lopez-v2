
import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { AppContext } from '../App';
import { FileText, Download, Printer, Filter, Search, ArrowRight, ArrowLeft, Package, Droplets, Calendar, CreditCard, DollarSign, ChevronDown } from 'lucide-react';
import { Service, Sale, ProductionLog, WasteLog } from '../types';

type ReportType = 'kardex_product' | 'kardex_supply' | 'sales' | 'receivable';

interface Transaction {
    date: string;
    type: 'IN' | 'OUT';
    concept: string;
    quantity: number;
    balance?: number; // Calculated on the fly
    refId?: string;
}

export const ReportsPanel: React.FC = () => {
    const { 
        sales, services, productionLogs, wasteLogs, 
        themeStyles: themeColors, currency, ticketConfig
    } = useContext(AppContext);

    const [activeReport, setActiveReport] = useState<ReportType>('kardex_product');
    
    // Filters
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Print Menu State
    const [showPrintMenu, setShowPrintMenu] = useState(false);
    const printMenuRef = useRef<HTMLDivElement>(null);

    // Close print menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
                setShowPrintMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Data processing ---

    const products = useMemo(() => services.filter(s => !s.deleted && s.type === 'PRODUCTO_TERMINADO'), [services]);
    const supplies = useMemo(() => services.filter(s => !s.deleted && s.type === 'INSUMO'), [services]);

    const generateKardexProduct = (productId: string) => {
        if (!productId) return [];
        
        const txs: Transaction[] = [];

        // 1. Production (IN)
        productionLogs.forEach(log => {
            if (log.productId === productId) {
                txs.push({
                    date: log.date,
                    type: 'IN',
                    concept: `Producción Lote: ${log.batchNumber}`,
                    quantity: log.quantityProduced,
                    refId: log.id
                });
            }
        });

        // 2. Sales (OUT)
        sales.forEach(sale => {
            if (sale.status !== 'cancelado' && !sale.deleted) {
                sale.items.forEach(item => {
                    if (item.serviceId === productId) {
                        txs.push({
                            date: sale.date,
                            type: 'OUT',
                            concept: `Venta #${sale.id} - ${sale.customerName}`,
                            quantity: item.quantity,
                            refId: sale.id
                        });
                    }
                });
            }
        });

        // 3. Waste (OUT)
        wasteLogs.forEach(log => {
            if (log.productId === productId) {
                txs.push({
                    date: log.date,
                    type: 'OUT',
                    concept: `Merma: ${log.reason}`,
                    quantity: log.quantity,
                    refId: log.id
                });
            }
        });

        // Sort by date ASC
        txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let balance = 0;
        return txs.map(t => {
            if (t.type === 'IN') balance += t.quantity;
            else balance -= t.quantity;
            return { ...t, balance };
        }).filter(t => {
            const d = new Date(t.date).toISOString().split('T')[0];
            return d >= startDate && d <= endDate;
        });
    };

    const generateKardexSupply = (supplyId: string) => {
        if (!supplyId) return [];
        const txs: Transaction[] = [];

        const productsUsingSupply = products.filter(p => p.recipe?.some(r => r.id === supplyId));
        
        productionLogs.forEach(log => {
             const productDef = productsUsingSupply.find(p => p.id === log.productId);
             if (productDef && productDef.recipe) {
                 const ingredient = productDef.recipe.find(r => r.id === supplyId);
                 if (ingredient) {
                     const qtyUsed = log.quantityProduced * ingredient.quantity;
                     txs.push({
                         date: log.date,
                         type: 'OUT',
                         concept: `Uso en Prod: ${productDef.name} (Lote ${log.batchNumber})`,
                         quantity: qtyUsed,
                         refId: log.id
                     });
                 }
             }
        });

        txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let balance = 0; // Relative change
        return txs.map(t => {
            balance -= t.quantity;
            return { ...t, balance };
        }).filter(t => {
            const d = new Date(t.date).toISOString().split('T')[0];
            return d >= startDate && d <= endDate;
        });
    };

    const generateSalesReport = () => {
        return sales.filter(s => {
            const d = new Date(s.date).toISOString().split('T')[0];
            return d >= startDate && d <= endDate && !s.deleted && s.status !== 'cancelado';
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const generateReceivableReport = () => {
        return sales.filter(s => {
            return !s.deleted && s.status !== 'cancelado' && s.balance > 0.1; // Tolerance
        }).sort((a, b) => b.balance - a.balance);
    };

    // --- PRINT LOGIC ---

    const printReport = (format: 'a4' | '80mm' | '58mm') => {
        setShowPrintMenu(false);
        const shopName = ticketConfig.shopName || 'Empresa';
        let title = '';
        let subtitle = `Del ${startDate} al ${endDate}`;
        let htmlContent = '';
        
        // CSS Styles
        const cssA4 = `
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 16px; color: #666; margin-bottom: 20px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; }
            .right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f0f0f0; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            .logo-container { text-align: center; margin-bottom: 10px; }
            .logo-container img { max-height: 80px; }
        `;

        const cssTicket = `
            @page { margin: 0; }
            body { font-family: 'Courier New', monospace; padding: 10px; width: ${format}; margin: 0 auto; color: #000; }
            h1 { font-size: 14px; text-align: center; margin: 0 0 5px 0; font-weight: bold; }
            h2 { font-size: 10px; text-align: center; margin: 0 0 10px 0; font-weight: normal; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item { margin-bottom: 5px; font-size: 10px; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
            .footer { text-align: center; font-size: 9px; margin-top: 10px; }
            .logo-container { text-align: center; margin-bottom: 5px; }
            .logo-container img { max-height: 50px; filter: grayscale(100%); }
        `;

        const styles = format === 'a4' ? cssA4 : cssTicket;
        const logoHtml = ticketConfig.logoUrl ? `<div class="logo-container"><img src="${ticketConfig.logoUrl}" alt="Logo" /></div>` : '';

        // Build Content based on Report Type
        if (activeReport === 'kardex_product' || activeReport === 'kardex_supply') {
            const isProd = activeReport === 'kardex_product';
            const itemsList = isProd ? products : supplies;
            const item = itemsList.find(i => i.id === selectedItemId);
            
            if (!item) {
                alert("Seleccione un item primero");
                return;
            }

            title = `Kardex: ${item.name}`;
            const data = isProd ? generateKardexProduct(selectedItemId) : generateKardexSupply(selectedItemId);
            const totalIn = data.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.quantity, 0);
            const totalOut = data.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.quantity, 0);

            if (format === 'a4') {
                htmlContent = `
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Concepto</th>
                                <th class="right">Cant.</th>
                                <th class="right">Saldo Ref.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(d => `
                                <tr>
                                    <td>${new Date(d.date).toLocaleDateString()} ${new Date(d.date).toLocaleTimeString()}</td>
                                    <td>${d.type === 'IN' ? 'ENTRADA' : 'SALIDA'}</td>
                                    <td>${d.concept}</td>
                                    <td class="right">${d.type === 'IN' ? '+' : '-'}${d.quantity.toFixed(2)}</td>
                                    <td class="right">${d.balance?.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="3">TOTALES</td>
                                <td class="right">Ent: ${totalIn} | Sal: ${totalOut}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                htmlContent = `
                    <div class="divider"></div>
                    <div class="row bold">
                        <span>MOVIMIENTO</span>
                        <span>CANT</span>
                    </div>
                    <div class="divider"></div>
                    ${data.map(d => `
                        <div class="item">
                            <div>${new Date(d.date).toLocaleDateString()} ${new Date(d.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                            <div>${d.concept}</div>
                            <div class="row">
                                <span>${d.type === 'IN' ? 'ENTRADA' : 'SALIDA'}</span>
                                <span class="bold">${d.type === 'IN' ? '+' : '-'}${d.quantity.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="divider"></div>
                    <div class="row bold">
                        <span>TOTAL ENTRADAS:</span>
                        <span>${totalIn.toFixed(2)}</span>
                    </div>
                    <div class="row bold">
                        <span>TOTAL SALIDAS:</span>
                        <span>${totalOut.toFixed(2)}</span>
                    </div>
                `;
            }

        } else if (activeReport === 'sales') {
            title = 'Reporte de Ventas';
            const data = generateSalesReport();
            const totalAmount = data.reduce((acc, s) => acc + s.total, 0);

            if (format === 'a4') {
                htmlContent = `
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>N° Orden</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th class="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(s => `
                                <tr>
                                    <td>${new Date(s.date).toLocaleDateString()}</td>
                                    <td>#${s.id}</td>
                                    <td>${s.customerName}</td>
                                    <td>${s.status.toUpperCase()}</td>
                                    <td class="right">${currency} ${s.total.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="4">TOTAL VENTAS</td>
                                <td class="right">${currency} ${totalAmount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                htmlContent = `
                    <div class="divider"></div>
                    ${data.map(s => `
                        <div class="item">
                            <div class="row">
                                <span>${new Date(s.date).toLocaleDateString()}</span>
                                <span class="bold">#${s.id}</span>
                            </div>
                            <div>${s.customerName}</div>
                            <div class="row">
                                <span>${s.status}</span>
                                <span class="bold">${currency} ${s.total.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="divider"></div>
                    <div class="row bold" style="font-size: 12px">
                        <span>TOTAL:</span>
                        <span>${currency} ${totalAmount.toFixed(2)}</span>
                    </div>
                `;
            }

        } else if (activeReport === 'receivable') {
            title = 'Cuentas por Cobrar';
            subtitle = `Al ${new Date().toLocaleDateString()}`;
            const data = generateReceivableReport();
            const totalDebt = data.reduce((acc, s) => acc + s.balance, 0);

            if (format === 'a4') {
                htmlContent = `
                    <table>
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th class="right">Total</th>
                                <th class="right">Acuenta</th>
                                <th class="right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(s => `
                                <tr>
                                    <td>#${s.id}</td>
                                    <td>${new Date(s.date).toLocaleDateString()}</td>
                                    <td>${s.customerName}</td>
                                    <td class="right">${currency} ${s.total.toFixed(2)}</td>
                                    <td class="right">${currency} ${s.totalPaid.toFixed(2)}</td>
                                    <td class="right" style="color:red; font-weight:bold;">${currency} ${s.balance.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="5">TOTAL POR COBRAR</td>
                                <td class="right" style="color:red;">${currency} ${totalDebt.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                htmlContent = `
                    <div class="divider"></div>
                    ${data.map(s => `
                        <div class="item">
                            <div class="row">
                                <span class="bold">#${s.id}</span>
                                <span>${new Date(s.date).toLocaleDateString()}</span>
                            </div>
                            <div>${s.customerName}</div>
                            <div class="row">
                                <span>Total: ${s.total.toFixed(2)}</span>
                                <span class="bold" style="color:black">Debe: ${currency} ${s.balance.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                    <div class="divider"></div>
                    <div class="row bold" style="font-size: 12px">
                        <span>TOTAL DEUDA:</span>
                        <span>${currency} ${totalDebt.toFixed(2)}</span>
                    </div>
                `;
            }
        }

        // Open Window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        <style>${styles}</style>
                    </head>
                    <body>
                        ${logoHtml}
                        <h1>${shopName}</h1>
                        <h1>${title}</h1>
                        <h2>${subtitle}</h2>
                        ${htmlContent}
                        <div class="footer">
                            Generado el ${new Date().toLocaleString()}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 500);
        }
    };

    // --- Render Logic ---

    const renderKardex = (isProduct: boolean) => {
        const items = isProduct ? products : supplies;
        const currentItem = items.find(i => i.id === selectedItemId);
        const movements = isProduct 
            ? generateKardexProduct(selectedItemId) 
            : generateKardexSupply(selectedItemId);

        const totalIn = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + m.quantity, 0);
        const totalOut = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + m.quantity, 0);

        return (
            <div className="space-y-4">
                {/* Item Selector */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Seleccionar {isProduct ? 'Producto' : 'Insumo'}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 ring-blue-100 bg-white"
                            value={selectedItemId}
                            onChange={e => setSelectedItemId(e.target.value)}
                        >
                            <option value="">-- Seleccione --</option>
                            {items.map(i => (
                                <option key={i.id} value={i.id}>{i.name} (Stock Actual: {i.stock} {i.unit})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedItemId && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                             <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    {isProduct ? <Package size={18} /> : <Droplets size={18} />} 
                                    Kardex: {currentItem?.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Del {new Date(startDate).toLocaleDateString()} al {new Date(endDate).toLocaleDateString()}
                                </p>
                             </div>
                             <div className="flex gap-4 text-sm">
                                 <div className="text-green-600 font-bold">Entradas: +{totalIn}</div>
                                 <div className="text-red-600 font-bold">Salidas: -{totalOut}</div>
                             </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white text-xs uppercase text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3">Concepto</th>
                                        <th className="p-3 text-right">Cantidad</th>
                                        <th className="p-3 text-right">Saldo Ref.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {movements.length === 0 ? (
                                        <tr><td colSpan={5} className="p-6 text-center text-slate-400">Sin movimientos en este periodo</td></tr>
                                    ) : (
                                        movements.map((m, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 whitespace-nowrap">{new Date(m.date).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${m.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {m.type === 'IN' ? 'ENTRADA' : 'SALIDA'}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-700 font-medium">{m.concept}</td>
                                                <td className={`p-3 text-right font-bold ${m.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {m.type === 'IN' ? '+' : '-'}{m.quantity.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right font-mono text-slate-500">
                                                    {m.balance?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSalesList = () => {
        const data = generateSalesReport();
        const totalSales = data.reduce((acc, s) => acc + s.total, 0);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign size={18} /> Reporte de Ventas
                        </h3>
                        <p className="text-xs text-slate-500">
                            {data.length} Transacciones
                        </p>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-bold">
                        Total: {currency} {totalSales.toFixed(2)}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-xs uppercase text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Pedido</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {data.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-400">Sin ventas en este periodo</td></tr>
                            ) : (
                                data.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-50">
                                        <td className="p-3 whitespace-nowrap">{new Date(sale.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-mono font-bold">#{sale.id}</td>
                                        <td className="p-3">{sale.customerName}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs uppercase font-bold border border-slate-200">
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-700">{currency} {sale.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReceivables = () => {
        const data = generateReceivableReport();
        const totalPending = data.reduce((acc, s) => acc + s.balance, 0);

        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <CreditCard size={18} /> Cuentas por Cobrar
                        </h3>
                        <p className="text-xs text-slate-500">
                            {data.length} Pedidos con deuda
                        </p>
                    </div>
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold">
                        Por Cobrar: {currency} {totalPending.toFixed(2)}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-xs uppercase text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="p-3">Pedido</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3 text-right">Acuenta</th>
                                <th className="p-3 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {data.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-slate-400">¡Excelente! No hay deudas pendientes.</td></tr>
                            ) : (
                                data.map(sale => (
                                    <tr key={sale.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold">#{sale.id}</td>
                                        <td className="p-3 whitespace-nowrap">{new Date(sale.date).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium">{sale.customerName}</td>
                                        <td className="p-3 text-right text-slate-500">{currency} {sale.total.toFixed(2)}</td>
                                        <td className="p-3 text-right text-green-600">{currency} {sale.totalPaid.toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold text-red-600">{currency} {sale.balance.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-2">
            
            {/* Sidebar Menu */}
            <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                <h2 className="text-xl font-bold text-slate-800 px-2 mb-2 flex items-center gap-2">
                    <FileText size={24} className={themeColors.text} /> Reportes
                </h2>
                
                {[
                    { id: 'kardex_product', label: 'Kardex Productos', icon: Package },
                    { id: 'kardex_supply', label: 'Kardex Insumos', icon: Droplets },
                    { id: 'sales', label: 'Reporte Ventas', icon: DollarSign },
                    { id: 'receivable', label: 'Ctas. por Cobrar', icon: CreditCard },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { setActiveReport(item.id as ReportType); setSelectedItemId(''); }}
                        className={`text-left px-4 py-3 rounded-xl font-medium flex items-center gap-3 transition-all ${
                            activeReport === item.id 
                            ? `${themeColors.primary} text-white shadow-md` 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <item.icon size={18} /> {item.label}
                    </button>
                ))}

                <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-1">
                        <Filter size={12}/> Filtros de Fecha
                    </p>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 relative" ref={printMenuRef}>
                    <button 
                        onClick={() => setShowPrintMenu(!showPrintMenu)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                    >
                        <Printer size={18} /> Imprimir <ChevronDown size={14} />
                    </button>
                    
                    {showPrintMenu && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-20 animate-fade-in">
                            <button 
                                onClick={() => printReport('a4')}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                            >
                                <FileText size={16} /> Documento A4
                            </button>
                            <button 
                                onClick={() => printReport('80mm')}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                            >
                                <Printer size={16} /> Ticket 80mm
                            </button>
                            <button 
                                onClick={() => printReport('58mm')}
                                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Printer size={16} /> Ticket 58mm
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">
                        {activeReport === 'kardex_product' && 'Kardex Físico - Productos Terminados'}
                        {activeReport === 'kardex_supply' && 'Kardex Físico - Insumos'}
                        {activeReport === 'sales' && 'Historial de Ventas'}
                        {activeReport === 'receivable' && 'Cuentas Pendientes por Cobrar'}
                    </h3>
                    <p className="text-slate-500 text-sm">Generado el {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}</p>
                </div>

                {activeReport === 'kardex_product' && renderKardex(true)}
                {activeReport === 'kardex_supply' && renderKardex(false)}
                {activeReport === 'sales' && renderSalesList()}
                {activeReport === 'receivable' && renderReceivables()}

            </div>
        </div>
    );
};
