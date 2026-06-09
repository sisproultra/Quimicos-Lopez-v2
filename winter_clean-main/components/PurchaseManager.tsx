import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import { Purchase, PurchaseItem, Service, Supplier } from '../types';
import { 
  Plus, Trash2, Save, ShoppingBag, Search, X, Calendar, User, 
  DollarSign, CreditCard, AlertTriangle, TrendingUp, Briefcase, 
  Store, Phone, MapPin, Loader2, FileText, CheckCircle, ArrowRight, Coins 
} from 'lucide-react';
import { searchClient } from '../services/clientService';

export const PurchaseManager: React.FC = () => {
  const { 
    services, 
    addPurchase, 
    receivePurchase, 
    purchases, 
    themeStyles, 
    currency: baseCurrency, 
    paymentMethods, 
    currentUser, 
    exchangeRate, 
    suppliers, 
    addSupplier, 
    apiToken 
  } = useContext(AppContext);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Active payment methods
  const activePaymentMethods = useMemo(() => paymentMethods.filter(pm => pm.isActive && !pm.deleted), [paymentMethods]);

  // Confirmation/Delete Modal
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  // New Purchase Form State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethodId, setPaymentMethodId] = useState(activePaymentMethods[0]?.id || '');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [purchaseExchangeRate, setPurchaseExchangeRate] = useState<number>(exchangeRate);
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [insumoSearch, setInsumoSearch] = useState('');

  // New Supplier Modal State
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState<Partial<Supplier>>({ docType: 'RUC', docNumber: '' });
  const [isSearchingSupplier, setIsSearchingSupplier] = useState(false);
  const [supplierApiError, setSupplierApiError] = useState<string | null>(null);

  // Reception/Stock intake Modal State
  const [selectedPurchaseForReceipt, setSelectedPurchaseForReceipt] = useState<Purchase | null>(null);
  const [receiptInvoiceNumber, setReceiptInvoiceNumber] = useState('');
  const [receiptExchangeRate, setReceiptExchangeRate] = useState<number>(exchangeRate);
  const [receiptItems, setReceiptItems] = useState<PurchaseItem[]>([]);
  const [receiptPaymentMethodId, setReceiptPaymentMethodId] = useState('');

  const availableInsumos = services.filter(s => s.type === 'INSUMO' && !s.deleted);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch || selectedSupplier) return [];
    return suppliers.filter(s => 
        !s.deleted && (
            s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || 
            s.docNumber.includes(supplierSearch)
        )
    );
  }, [suppliers, supplierSearch, selectedSupplier]);

  const handleAddInsumoToCart = (insumo: Service) => {
    const exists = cart.find(i => i.insumoId === insumo.id);
    if (exists) return;

    // Use current exchangeRate for defaults
    const initialCost = insumo.price || 0; 
    const initialCostUsd = initialCost / purchaseExchangeRate;

    setCart([...cart, {
      insumoId: insumo.id,
      insumoName: insumo.name,
      quantity: 1,
      cost: initialCost, 
      costUsd: initialCostUsd,
      subtotal: initialCost,
      subtotalUsd: initialCostUsd,
      unit: insumo.unit
    }]);
    setInsumoSearch('');
  };

  const updateCartItem = (id: string, updates: Partial<PurchaseItem>) => {
    setCart(prev => prev.map(item => {
      if (item.insumoId === id) {
        let newItem = { ...item, ...updates };
        if (newItem.quantity > 0) {
            if (purchaseCurrency === 'USD') {
                if (updates.subtotalUsd !== undefined || updates.quantity !== undefined) {
                    newItem.costUsd = newItem.subtotalUsd! / newItem.quantity;
                } else if (updates.costUsd !== undefined) {
                    newItem.subtotalUsd = newItem.costUsd! * newItem.quantity;
                }
                newItem.cost = newItem.costUsd! * purchaseExchangeRate;
                newItem.subtotal = newItem.subtotalUsd! * purchaseExchangeRate;
            } else {
                if (updates.subtotal !== undefined || updates.quantity !== undefined) {
                    newItem.cost = newItem.subtotal / newItem.quantity;
                } else if (updates.cost !== undefined) {
                    newItem.subtotal = newItem.cost! * newItem.quantity;
                }
                newItem.costUsd = newItem.cost / purchaseExchangeRate;
                newItem.subtotalUsd = newItem.subtotal / purchaseExchangeRate;
            }
        }
        return newItem;
      }
      return item;
    }));
  };

  const removeCartItem = (id: string) => {
    setCart(prev => prev.filter(i => i.insumoId !== id));
  };

  const purchaseTotal = useMemo(() => cart.reduce((sum, i) => sum + i.subtotal, 0), [cart]);
  const purchaseTotalUsd = useMemo(() => cart.reduce((sum, i) => sum + (i.subtotalUsd || 0), 0), [cart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !selectedSupplier) return;

    const finalExchangeRate = purchaseCurrency === 'USD' ? purchaseExchangeRate : exchangeRate;

    const newPurchase: Purchase = {
      id: `COM-${Date.now()}`,
      date: new Date(purchaseDate).toISOString(),
      supplierName: selectedSupplier.name,
      supplierId: selectedSupplier.id,
      items: cart.map(item => {
         let cost = item.cost;
         let costUsd = item.costUsd;
         let subtotal = item.subtotal;
         let subtotalUsd = item.subtotalUsd;

         if (purchaseCurrency === 'USD') {
            cost = (costUsd || 0) * finalExchangeRate;
            subtotal = (subtotalUsd || 0) * finalExchangeRate;
         } else {
            costUsd = cost / finalExchangeRate;
            subtotalUsd = subtotal / finalExchangeRate;
         }

         return {
            ...item,
            cost,
            costUsd,
            subtotal,
            subtotalUsd
         };
      }),
      total: purchaseCurrency === 'USD' 
         ? cart.reduce((sum, i) => sum + (i.subtotalUsd || 0), 0) * finalExchangeRate
         : purchaseTotal, 
      totalUsd: purchaseCurrency === 'USD' 
         ? purchaseTotalUsd 
         : purchaseTotal / finalExchangeRate,
      currency: purchaseCurrency,
      exchangeRate: finalExchangeRate,
      paymentMethodId,
      createdBy: currentUser?.firstName || 'Admin',
      status: 'pendiente', // starts as pending Orden de Compra!
      deleted: false
    };

    addPurchase(newPurchase);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCart([]);
    setSelectedSupplier(null);
    setSupplierSearch('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInsumoSearch('');
    setPurchaseCurrency('PEN');
    setPurchaseExchangeRate(exchangeRate);
    setPaymentMethodId(activePaymentMethods[0]?.id || '');
  };

  const handleSearchSupplierApi = async () => {
    if (!newSupplierData.docNumber || !apiToken) return;
    setIsSearchingSupplier(true);
    setSupplierApiError(null);
    try {
        const result = await searchClient(newSupplierData.docType as any, newSupplierData.docNumber, apiToken);
        if (result) {
            setNewSupplierData(prev => ({ ...prev, name: result.name, address: result.address }));
        } else {
            setSupplierApiError('No se encontraron datos.');
        }
    } catch (err) {
        setSupplierApiError('Error de conexión con API.');
    } finally {
        setIsSearchingSupplier(false);
    }
  };

  const handleSaveNewSupplier = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSupplierData.name || !newSupplierData.phone) return;
      const supplier: Supplier = {
          ...newSupplierData,
          id: Date.now().toString(),
          deleted: false
      } as Supplier;
      addSupplier(supplier);
      setSelectedSupplier(supplier);
      setSupplierSearch(supplier.name);
      setIsNewSupplierModalOpen(false);
      setNewSupplierData({ docType: 'RUC', docNumber: '' });
  };

  // Open modal to fulfil/receive the pending order
  const handleOpenReceiptModal = (purchase: Purchase) => {
    setSelectedPurchaseForReceipt(purchase);
    setReceiptInvoiceNumber('');
    setReceiptExchangeRate(purchase.exchangeRate || exchangeRate);
    setReceiptItems(JSON.parse(JSON.stringify(purchase.items))); // deep clone
    setReceiptPaymentMethodId(purchase.paymentMethodId || activePaymentMethods[0]?.id || '');
  };

  const updateReceiptItemField = (id: string, updates: Partial<PurchaseItem>) => {
    setReceiptItems(prev => prev.map(item => {
      if (item.insumoId === id) {
        let newItem = { ...item, ...updates };
        if (newItem.quantity > 0) {
          if (selectedPurchaseForReceipt?.currency === 'USD') {
            if (updates.subtotalUsd !== undefined || updates.quantity !== undefined) {
              newItem.costUsd = newItem.subtotalUsd! / newItem.quantity;
            } else if (updates.costUsd !== undefined) {
              newItem.subtotalUsd = newItem.costUsd! * newItem.quantity;
            }
            newItem.cost = newItem.costUsd! * receiptExchangeRate;
            newItem.subtotal = newItem.subtotalUsd! * receiptExchangeRate;
          } else {
            if (updates.subtotal !== undefined || updates.quantity !== undefined) {
              newItem.cost = newItem.subtotal / newItem.quantity;
            } else if (updates.cost !== undefined) {
              newItem.subtotal = newItem.cost! * newItem.quantity;
            }
            newItem.costUsd = newItem.cost / receiptExchangeRate;
            newItem.subtotalUsd = newItem.subtotal / receiptExchangeRate;
          }
        }
        return newItem;
      }
      return item;
    }));
  };

  const handleConfirmReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseForReceipt || !receiptInvoiceNumber) return;

    // Execute receiving action (App.tsx updates inventory state, purchase status, and financial expenses)
    receivePurchase(
      selectedPurchaseForReceipt.id,
      receiptInvoiceNumber,
      receiptExchangeRate,
      receiptItems,
      receiptPaymentMethodId
    );

    setSelectedPurchaseForReceipt(null);
  };

  // PDF Generator and Native Printer popup
  const handlePrintOrder = (p: Purchase) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const supplier = suppliers.find(s => s.id === p.supplierId);

    const html = `
      <html>
        <head>
          <title>Orden de Compra - ${p.id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
            .company-title { font-size: 24px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
            .company-details { font-size: 11px; color: #64748b; margin-top: 5px; }
            .doc-title { font-size: 24px; font-weight: 800; text-align: right; color: #010101; }
            .doc-number { font-size: 16px; font-weight: uppercase; color: #d97706; text-align: right; margin-top: 5px; font-family: monospace; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 35px; }
            .info-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #f8fafc; }
            .info-box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px; letter-spacing: 0.5px; }
            .info-text { font-size: 12px; }
            .info-label { font-weight: bold; color: #334155; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
            th { background-color: #f1f5f9; padding: 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; text-align: left; border-bottom: 2px solid #cbd5e1; color: #475569; }
            td { padding: 10px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
            .text-right { text-align: right; }
            .totals { display: flex; flex-direction: column; align-items: flex-end; margin-top: 15px; }
            .totals-row { display: flex; width: 280px; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #475569; }
            .totals-row.grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #334155; padding-top: 8px; margin-top: 8px; color: #1e3a8a; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px dotted #cbd5e1; padding-top: 15px; }
            .stamp { border: 1px dashed #cbd5e1; padding: 15px; width: 220px; text-align: center; margin: 30px auto 0 auto; border-radius: 6px; font-size: 11px; background-color: #fafafa; }
            @media print {
              body { padding: 10px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print();" style="background-color: #1e3a8a; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">🖨️ Imprimir Documento</button>
          </div>
          <div class="header">
            <div>
              <div class="company-title">QUÍMICOS LOPEZ E.I.R.L.</div>
              <div class="company-details">
                RUC: 20600000000<br/>
                Av. Principal 123, Urb. Industrial<br/>
                Lima, Perú<br/>
                Email: compras@quimicoslopez.com | Cel: 999 999 999
              </div>
            </div>
            <div>
              <div class="doc-title">ORDEN DE COMPRA</div>
              <div class="doc-number">${p.id}</div>
              <div style="font-size: 11px; text-align: right; margin-top: 4px; color: #475569;">
                Estado: <span style="font-weight: bold; color: ${p.status === 'recibido' ? '#10b981' : '#b45309'}">${p.status === 'recibido' ? 'INGRESADO / RECIBIDO' : 'PENDIENTE / SOLO ORDEN'}</span>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-box-title">DATOS DEL PROVEEDOR</div>
              <div class="info-text">
                <span class="info-label">Razón Social:</span> ${p.supplierName}<br/>
                <span class="info-label">RUC / Doc:</span> ${supplier?.docNumber || '--'}<br/>
                <span class="info-label">Teléfono:</span> ${supplier?.phone || '--'}<br/>
                <span class="info-label">Dirección:</span> ${supplier?.address || '--'}
              </div>
            </div>
            <div class="info-box">
              <div class="info-box-title">METADATOS DEL DOCUMENTO</div>
              <div class="info-text">
                <span class="info-label">Fecha de Orden:</span> ${new Date(p.date).toLocaleDateString()}<br/>
                <span class="info-label">Creador por:</span> ${p.createdBy}<br/>
                <span class="info-label">Moneda:</span> ${p.currency} (Cambio: S/ ${p.exchangeRate.toFixed(3)})<br/>
                ${p.invoiceNumber ? `<span class="info-label" style="color: #10b981">Factura de Compra:</span> <strong style="color: #10b981">${p.invoiceNumber}</strong><br/>` : ''}
                ${p.receivedDate ? `<span class="info-label">Fecha Recibido:</span> ${new Date(p.receivedDate).toLocaleDateString()}<br/>` : ''}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Ítem de Materia Prima / Insumo</th>
                <th>Cant. Solicitada</th>
                <th>U.M.</th>
                <th class="text-right">Costo Unit. (${p.currency === 'USD' ? 'USD' : 'S/'})</th>
                <th class="text-right">Subtotal (${p.currency === 'USD' ? 'USD' : 'S/'})</th>
              </tr>
            </thead>
            <tbody>
              ${p.items.map(item => `
                <tr>
                  <td><strong>${item.insumoName}</strong></td>
                  <td>${item.quantity}</td>
                  <td><span style="font-size: 10px; padding: 2px 5px; background-color: #f1f5f9; border-radius: 4px;">${item.unit || 'Und'}</span></td>
                  <td class="text-right">${p.currency === 'USD' ? `$ ${(item.costUsd || 0).toFixed(4)}` : `S/ ${item.cost.toFixed(4)}`}</td>
                  <td class="text-right">${p.currency === 'USD' ? `$ ${(item.subtotalUsd || 0).toFixed(2)}` : `S/ ${item.subtotal.toFixed(2)}`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${p.currency === 'USD' ? '$' : 'S/'} ${(p.currency === 'USD' ? p.items.reduce((sum, i) => sum + (i.subtotalUsd || 0), 0) : p.total).toFixed(2)}</span>
            </div>
            ${p.currency === 'USD' ? `
              <div class="totals-row">
                <span>Total USD:</span>
                <span>$ ${p.items.reduce((sum, i) => sum + (i.subtotalUsd || 0), 0).toFixed(2)}</span>
              </div>
              <div class="totals-row" style="color: #047857; font-weight: bold;">
                <span>Tipo Cambio USD/PEN:</span>
                <span>S/ ${p.exchangeRate.toFixed(3)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span>TOTAL (Soles S/):</span>
              <span>S/ ${p.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="stamp">
            <strong>FIRMADO LOGÍSTICA:</strong><br/><br/><br/>
            ________________________________<br/>
            Dpto de Abastecimiento Stock<br/>
            <strong>QUÍMICOS LOPEZ</strong>
          </div>

          <div class="footer">
            Este documento representa una Orden de Compra oficial emitida por QUÍMICOS LOPEZ E.I.R.L.<br/>
            Generado el: ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredPurchasesList = purchases.filter(p => 
    !p.deleted && (
      p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.id.includes(searchTerm) ||
      p.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={28} className="text-indigo-600" />
            Compras de Insumos
          </h2>
          <p className="text-slate-500">Gestione Ordenes de Compra del día, ingresos a stock real y deudas en cuentas por pagar.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }} 
          className={`${themeStyles.primary} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all`}
        >
          <Plus size={20} /> Generar Orden de Compra
        </button>
      </div>

      {/* SYSTEM DOLLAR EXCHANGE RATE ACCENT */}
      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between text-sm shadow-sm">
         <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <Coins size={18} className="text-emerald-600" />
            <span>Tasa de Cambio de referencia: 1 USD = S/ {exchangeRate.toFixed(3)}</span>
         </div>
         <span className="text-xs text-emerald-600 italic">Si opera en dólares, el sistema solicitará el tipo de cambio del día exacto de compra.</span>
      </div>

      {/* SEARCH FIELD */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 ring-blue-100 bg-white"
          placeholder="Buscar por código de Orden (COM-), proveedor o factura..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* PURCHASES LIST TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Código / Fecha</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">RUC / Doc.</th>
                <th className="p-4">Factura Ref.</th>
                <th className="p-4">Moneda</th>
                <th className="p-4">Estado OC</th>
                <th className="p-4 text-right">Monto (Soles)</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPurchasesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 italic">No hay registros de compras o de órdenes de compra.</td>
                </tr>
              ) : (
                filteredPurchasesList.map(purchase => {
                  const sup = suppliers.find(s => s.id === purchase.supplierId);
                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{purchase.id}</div>
                        <div className="text-xs text-slate-400">{new Date(purchase.date).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{purchase.supplierName}</td>
                      <td className="p-4 text-xs font-mono text-slate-500">{sup?.docNumber || '--'}</td>
                      <td className="p-4">
                        {purchase.invoiceNumber ? (
                          <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            #{purchase.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pendiente Ingreso</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border max-w-[42px] text-center uppercase ${purchase.currency === 'USD' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                              {purchase.currency}
                          </span>
                           {purchase.currency === 'USD' && (
                             <span className="text-[10px] text-slate-400 font-mono">TC: S/ {purchase.exchangeRate?.toFixed(3)}</span>
                           )}
                        </div>
                      </td>
                      <td className="p-4">
                        {purchase.status === 'recibido' || !purchase.status ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} /> Stock Ingresado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            Ord. Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800">
                        {baseCurrency} {purchase.total.toFixed(2)}
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex gap-2 justify-end">
                            {/* PRINT / EXPORT PDF BUTTON */}
                            <button 
                               onClick={() => handlePrintOrder(purchase)} 
                               className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                               title="Imprimir / Ver PDF de Orden"
                            >
                               <FileText size={18} />
                            </button>

                            {/* FULFILL / RECEIVE STOCK BUTTON (only for pending) */}
                            {purchase.status === 'pendiente' && (
                              <button 
                                 onClick={() => handleOpenReceiptModal(purchase)} 
                                 className="px-2.5 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-bold flex items-center gap-1 shadow-sm transition-all"
                                 title="Ingresar productos recibidos a Stock"
                              >
                                 <Plus size={14} /> Recibir Compra
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            <button onClick={() => setPurchaseToDelete(purchase)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Anular">
                              <Trash2 size={18}/>
                            </button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {purchaseToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Anular Compra?</h3>
            <p className="text-sm text-slate-500 mb-6">Esta operación no afectará el stock ingresado previamente pero anulará el registro contable.</p>
            <div className="flex gap-3">
              <button onClick={() => setPurchaseToDelete(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Cerrar</button>
              <button onClick={() => { purchaseToDelete.deleted = true; setPurchaseToDelete(null); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg transition-colors">Sí, Anular</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PURCHASE ORDER GENERATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            {/* Header section with brand left accent */}
            <div className="px-6 py-5 border-b border-slate-150 flex justify-between items-center bg-white border-l-4 border-[#51B01E]">
              <div>
                <h3 className="font-extrabold text-xl flex items-center gap-2.5 text-slate-900 tracking-tight">
                  <ShoppingBag className="text-[#51B01E]" size={22} />
                  <span>Generar Orden de Compra</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Materia Prima e Insumos Químicos</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col p-5 sm:p-6 space-y-5">
              
              {/* SUPPLIER + CURRENCY + DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-none bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-inner">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Insumo Proveedor</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input 
                        required
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] text-sm bg-white transition-all font-bold text-slate-700" 
                        placeholder="Buscar proveedor..."
                        value={supplierSearch}
                        onChange={e => {
                            setSupplierSearch(e.target.value);
                            if (selectedSupplier && e.target.value !== selectedSupplier.name) {
                                setSelectedSupplier(null);
                            }
                        }}
                      />
                      {filteredSuppliers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-b-xl z-[60] max-h-40 overflow-y-auto mt-1 p-1">
                          {filteredSuppliers.map(s => (
                            <button 
                              type="button"
                              key={s.id}
                              onClick={() => { setSelectedSupplier(s); setSupplierSearch(s.name); }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-sm font-extrabold text-slate-700 flex justify-between items-center transition-colors"
                            >
                              <span>{s.name}</span>
                              <span className="text-[10px] font-medium text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">RUC: {s.docNumber}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsNewSupplierModalOpen(true)}
                      className={`p-2.5 rounded-xl text-white shadow-md transition-all ${themeStyles.primary || 'bg-[#51B01E] hover:bg-[#439618]'} hover:brightness-110 active:scale-95 cursor-pointer`}
                      title="Crear nuevo proveedor"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Moneda de Compra</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 h-[42px] items-center">
                    <button 
                      type="button" 
                      onClick={() => setPurchaseCurrency('PEN')} 
                      className={`flex-1 h-full rounded-lg text-xs font-black tracking-wide uppercase transition-all duration-200 ${purchaseCurrency === 'PEN' ? 'bg-white shadow-sm text-[#51B01E]' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      PEN (S/)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPurchaseCurrency('USD')} 
                      className={`flex-1 h-full rounded-lg text-xs font-black tracking-wide uppercase transition-all duration-200 ${purchaseCurrency === 'USD' ? 'bg-emerald-600 shadow-sm text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      USD ($)
                    </button>
                  </div>
                  
                  {/* DOLLAR COST OF TODAY INPUT FIELD */}
                  {purchaseCurrency === 'USD' && (
                    <div className="mt-2.5 animate-fade-in bg-emerald-50/70 p-2 rounded-xl border border-emerald-150 flex items-center justify-between gap-3 shadow-inner">
                      <div className="min-w-0">
                         <label className="block text-[9px] font-black text-emerald-800 uppercase tracking-widest leading-none mb-0.5">Tipo de Cambio</label>
                         <span className="text-[10px] text-emerald-600 font-bold block leading-none">Dólar ($)</span>
                      </div>
                      <div className="relative w-24">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">S/</span>
                         <input 
                            type="number"
                            step="0.001"
                            required
                            className="w-full pl-6 pr-2 py-1 border border-emerald-250 rounded-lg font-black text-center text-xs bg-white text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                            value={purchaseExchangeRate}
                            onChange={e => setPurchaseExchangeRate(parseFloat(e.target.value) || exchangeRate)}
                         />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Fecha Emisión</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 h-[42px] border border-slate-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] text-sm font-bold text-slate-700 transition-all font-sans" 
                    value={purchaseDate} 
                    onChange={e => setPurchaseDate(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Condición de Pago Tentativa</label>
                  <select 
                    className="w-full px-4 py-2.5 h-[42px] border border-slate-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] text-sm font-bold text-slate-700 transition-all cursor-pointer" 
                    value={paymentMethodId} 
                    onChange={e => setPaymentMethodId(e.target.value)}
                  >
                    {activePaymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                  </select>
                </div>
              </div>

              {/* INSUMO SELECTOR SEARCH */}
              <div className="flex-none relative">
                <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Buscar y Añadir Insumo (Materia Prima)</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] bg-slate-50/20 text-sm font-semibold transition-all placeholder-slate-400" 
                    placeholder="Escriba filtro del insumo químico o material..." 
                    value={insumoSearch} 
                    onChange={e => setInsumoSearch(e.target.value)} 
                  />
                  {insumoSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl z-20 max-h-52 overflow-y-auto mt-2 p-1.5 divide-y divide-slate-100 divide-opacity-65 animate-fade-in">
                      {availableInsumos.filter(i => i.name.toLowerCase().includes(insumoSearch.toLowerCase()) || i.internalCode?.toLowerCase().includes(insumoSearch.toLowerCase())).map(i => (
                        <button 
                          key={i.id} 
                          type="button" 
                          onClick={() => handleAddInsumoToCart(i)} 
                          className="w-full text-left p-3 hover:bg-[#51B01E]/5 hover:text-[#51B01E] rounded-xl transition-all duration-205 flex justify-between items-center font-bold group"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-800 group-hover:text-slate-900 block truncate">{i.name}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                               <span className="font-mono bg-slate-100 group-hover:bg-white px-1.5 py-0.5 rounded text-slate-500">COD: {i.internalCode || 'S/C'}</span>
                               <span>•</span>
                               <span className="font-semibold text-slate-550">Stock actual: {i.stock} {i.unit}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 group-hover:bg-[#51B01E] group-hover:text-white rounded-xl text-xs font-black transition-all">
                             <Plus size={14} />
                             <span>AÑADIR</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SELECTED CART ITEMS FOR PO */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-inner flex flex-col min-h-[220px]">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-450 uppercase sticky top-0 z-10 border-b border-slate-250 select-none">
                    <tr>
                      <th className="p-3.5 pl-4">Materia Prima Insumo</th>
                      <th className="p-3.5 w-32 text-center">Cant. Solicitada</th>
                      <th className="p-3.5 w-40 text-center">Importe ({purchaseCurrency === 'USD' ? 'USD $' : 'S/'})</th>
                      <th className="p-3.5 w-40 text-center">Costo Est.</th>
                      <th className="p-3.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3.5 border border-slate-100 text-slate-350 shadow-inner">
                              <ShoppingBag size={24} />
                            </div>
                            <p className="text-slate-800 font-extrabold text-sm mb-1">Tu orden de compra está vacía</p>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed">Utiliza la barra de búsqueda de arriba para seleccionar e integrar insumos químicos o materia prima a solicitar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.insumoId} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-extrabold text-slate-800">{item.insumoName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">U. Medida: {item.unit || 'Und'}</div>
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 border border-slate-200 focus:border-[#51B01E] focus:ring focus:ring-[#51B01E]/10 rounded-xl text-center font-extrabold text-slate-700 bg-white" 
                              value={item.quantity} 
                              onChange={e => updateCartItem(item.insumoId, { quantity: parseFloat(e.target.value) || 0 })} 
                            />
                          </td>
                          <td className="p-3">
                            <input 
                              type="number" 
                              step="0.01" 
                              className={`w-full px-3 py-2 border border-slate-200 focus:border-[#51B01E] focus:ring focus:ring-[#51B01E]/10 rounded-xl text-right font-black ${purchaseCurrency === 'USD' ? 'text-emerald-700' : 'text-slate-800'} bg-white`} 
                              value={purchaseCurrency === 'USD' ? item.subtotalUsd : item.subtotal} 
                              onChange={e => {
                                 const val = parseFloat(e.target.value) || 0;
                                 updateCartItem(item.insumoId, purchaseCurrency === 'USD' ? { subtotalUsd: val } : { subtotal: val });
                              }} 
                            />
                          </td>
                          <td className="p-3">
                            <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-right font-mono font-black text-slate-500 text-xs">
                              {purchaseCurrency === 'USD' ? `$ ${item.costUsd?.toFixed(4)}` : `S/ ${item.cost.toFixed(4)}`}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              type="button" 
                              onClick={() => removeCartItem(item.insumoId)} 
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              title="Remover insumo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER VALUES & ACTIONS */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-t border-slate-150 pt-5 bg-white flex-none gap-4">
                <div className="bg-slate-100/50 px-5 py-3.5 rounded-2xl border border-slate-200/90 flex-1 flex items-center justify-between sm:justify-start gap-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block leading-3 mb-0.5">Monto Total Estimado</span>
                    <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${purchaseCurrency === 'USD' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {purchaseCurrency === 'USD' ? '$' : 'S/'} {(purchaseCurrency === 'USD' ? purchaseTotalUsd : purchaseTotal).toFixed(2)}
                    </h2>
                  </div>
                  {purchaseCurrency === 'USD' && (
                    <div className="pl-4 border-l border-slate-200 hidden xs:block">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Equivalente Aproximado</span>
                      <p className="text-xs font-mono font-black text-emerald-800">S/ {(purchaseTotalUsd * purchaseExchangeRate).toFixed(2)} <span className="text-[10px] font-medium text-slate-450 font-normal">(TC: {purchaseExchangeRate})</span></p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="flex-1 sm:flex-none px-6 py-3 border border-slate-250 rounded-xl font-black text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-all text-xs tracking-wider uppercase cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={cart.length === 0 || !selectedSupplier} 
                    className={`flex-1 sm:flex-none px-7 py-3 rounded-xl font-black text-xs tracking-wider uppercase text-white shadow-xl transition-all duration-300 ${
                       cart.length === 0 || !selectedSupplier 
                       ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-250/20' 
                       : `${themeStyles.primary || 'bg-[#51B01E] hover:bg-[#439618]'} hover:brightness-[1.08] active:scale-[0.98] cursor-pointer`
                    }`}
                  >
                    Finalizar Orden de Compra
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED STOCK INTAKE (RECEIPT) MODAL FOR PENDING ORDERS */}
      {selectedPurchaseForReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            {/* Header section with brand warning accent */}
            <div className="px-6 py-5 border-b border-slate-150 flex justify-between items-center bg-white border-l-4 border-amber-500">
              <div>
                <h3 className="font-extrabold text-lg sm:text-xl flex items-center gap-2.5 text-slate-900 tracking-tight">
                  <CheckCircle className="text-amber-500" size={22} />
                  <span>Confirmar Ingreso a Almacén y Stock</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                  Orden ID: <span className="font-mono text-slate-600 font-black">{selectedPurchaseForReceipt.id}</span> • Prov: <span className="text-slate-600 font-extrabold">{selectedPurchaseForReceipt.supplierName}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedPurchaseForReceipt(null)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReceiptSubmit} className="flex-1 overflow-hidden flex flex-col p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-5 bg-slate-50/50 rounded-2xl border border-slate-200/90 shadow-inner">
                
                {/* INVOICE NUMBER - REQUIRED */}
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Número de Factura / Boleta</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: F001-9876 o 001-2345"
                    className="w-full px-4 py-2.5 h-[42px] border border-slate-200 focus:border-[#51B01E] focus:ring focus:ring-[#51B01E]/10 rounded-xl outline-none font-black text-sm uppercase bg-white transition-all text-slate-800"
                    value={receiptInvoiceNumber}
                    onChange={e => setReceiptInvoiceNumber(e.target.value)}
                  />
                </div>

                {/* DOLLAR EXCHANGE RATE DYNAMIC INPUT FOR CURRENT INTAKE */}
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">
                    {selectedPurchaseForReceipt.currency === 'USD' ? 'Tipo de Cambio del día (S/) *' : 'Tasa Unidad (Informativo)'}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    disabled={selectedPurchaseForReceipt.currency !== 'USD'}
                    className={`w-full px-4 py-2.5 h-[42px] border rounded-xl font-mono font-black text-sm text-center transition-all ${
                      selectedPurchaseForReceipt.currency === 'USD' 
                        ? 'border-emerald-300 text-emerald-800 bg-white focus:border-[#51B01E] focus:ring focus:ring-[#51B01E]/10' 
                        : 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed select-none'
                    }`}
                    value={receiptExchangeRate}
                    onChange={e => setReceiptExchangeRate(parseFloat(e.target.value) || exchangeRate)}
                  />
                  {selectedPurchaseForReceipt.currency === 'USD' && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1.5 block leading-tight">Valor del dólar para registrar la obligación real</span>
                  )}
                </div>

                {/* FINAL PAYMENT METHOD */}
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-1.5">Condición de Pago de Facturación</label>
                  <select 
                    className="w-full px-4 py-2.5 h-[42px] border border-slate-200 rounded-xl bg-white outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] text-sm font-bold text-slate-700 transition-all cursor-pointer"
                    value={receiptPaymentMethodId} 
                    onChange={e => setReceiptPaymentMethodId(e.target.value)}
                  >
                    {activePaymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                  </select> 
                </div>
              </div>

              {/* REVIEW AND ADJUST RECEIVED QUANTITIES & COST */}
              <div className="flex-1 overflow-y-auto border border-dashed border-slate-250 rounded-2xl p-4 sm:p-5 bg-slate-50/20 shadow-inner flex flex-col gap-4">
                 <h4 className="text-[11px] font-black text-slate-450 uppercase tracking-wider select-none">Verificar Insumos y Precios Recibidos Físicamente</h4>
                 <div className="space-y-3.5">
                   {receiptItems.map((item) => (
                     <div key={item.insumoId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 hover:border-slate-350 transition-all">
                       <div className="flex-1 min-w-0">
                         <p className="font-extrabold text-slate-800 text-sm truncate">{item.insumoName}</p>
                         <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider mt-0.5">U. Medida: {item.unit || 'Und'}</p>
                       </div>
                       
                       <div className="flex items-center gap-4 flex-none">
                         <div className="w-28 flex-none">
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Cant. Recibida</label>
                           <input 
                             type="number"
                             className="w-full px-3 py-1.5 border border-slate-200 focus:border-amber-500 focus:ring focus:ring-amber-500/10 rounded-xl font-black text-center text-xs bg-white text-slate-800" 
                             value={item.quantity}
                             onChange={e => {
                               const val = parseFloat(e.target.value) || 0;
                               updateReceiptItemField(item.insumoId, { quantity: val });
                             }}
                           />
                         </div>
                         
                         <div className="w-32 flex-none">
                           <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                             Importe ({selectedPurchaseForReceipt.currency === 'USD' ? 'USD $' : 'S/' })
                           </label>
                           <input 
                             type="number" 
                             step="0.01"
                             className={`w-full px-3 py-1.5 border border-slate-200 focus:border-emerald-500 focus:ring focus:ring-emerald-500/10 rounded-xl font-black text-right text-xs bg-white ${selectedPurchaseForReceipt.currency === 'USD' ? 'text-emerald-700' : 'text-slate-800'}`}
                             value={selectedPurchaseForReceipt.currency === 'USD' ? item.subtotalUsd : item.subtotal}
                             onChange={e => {
                               const val = parseFloat(e.target.value) || 0;
                               updateReceiptItemField(item.insumoId, selectedPurchaseForReceipt.currency === 'USD' ? { subtotalUsd: val } : { subtotal: val });
                             }}
                           />
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>

              {/* FINAL SUM SUMMARY */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center border-t border-slate-150 pt-5 bg-white flex-none gap-4">
                 <div className="bg-slate-100/50 px-5 py-3 rounded-2xl border border-slate-200/90 flex-1 flex items-center justify-between sm:justify-start gap-4 h-[64px]">
                    <div>
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block leading-3 mb-0.5">Importe Total con TC de Hoy</span>
                      <strong className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        S/ {receiptItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)}
                      </strong>
                    </div>
                    {selectedPurchaseForReceipt.currency === 'USD' && (
                      <div className="pl-4 border-l border-slate-200 hidden xs:block">
                        <span className="text-[9px] font-black text-emerald-850 uppercase tracking-wider block">Monto en Dólares</span>
                        <span className="text-xs text-emerald-700 block font-black leading-normal">
                          $ {receiptItems.reduce((sum, i) => sum + (i.subtotalUsd || 0), 0).toFixed(2)} USD
                        </span>
                      </div>
                    )}
                 </div>

                 <div className="flex gap-2.5 w-full sm:w-auto h-[54px] sm:h-auto">
                   <button 
                     type="button" 
                     onClick={() => setSelectedPurchaseForReceipt(null)} 
                     className="flex-1 sm:flex-none px-6 py-3 border border-slate-250 rounded-xl font-black text-slate-700 hover:bg-slate-50 hover:text-slate-905 transition-all text-xs tracking-wider uppercase cursor-pointer"
                   >
                     Cancelar
                   </button>
                   <button 
                     type="submit" 
                     className="flex-1 sm:flex-none px-7 py-3 bg-emerald-600 text-white font-black hover:bg-emerald-700 hover:brightness-[1.08] shadow-xl rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-300"
                   >
                      <CheckCircle size={15} />
                      <span>Confirmar Ingreso</span>
                   </button>
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR PROVEEDOR RAPIDO */}
      {isNewSupplierModalOpen && (
          <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="text-indigo-500" /> Nuevo Proveedor
                      </h3>
                      <button onClick={() => setIsNewSupplierModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>

                  <form onSubmit={handleSaveNewSupplier} className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                          <select 
                            className="p-2 border rounded-xl bg-slate-50 text-xs font-bold font-sans"
                            value={newSupplierData.docType}
                            onChange={e => setNewSupplierData({...newSupplierData, docType: e.target.value as any})}
                          >
                              <option value="RUC">RUC</option>
                              <option value="DNI">DNI</option>
                          </select>
                          <div className="col-span-2 flex gap-2">
                            <input 
                                required
                                className="flex-1 p-2 border rounded-xl bg-slate-50 font-mono text-sm"
                                placeholder="Número..."
                                value={newSupplierData.docNumber}
                                onChange={e => setNewSupplierData({...newSupplierData, docNumber: e.target.value})}
                            />
                            <button type="button" onClick={handleSearchSupplierApi} className={`p-2 rounded-xl text-white ${themeStyles.primary}`}>{isSearchingSupplier ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}</button>
                          </div>
                      </div>
                      
                      {supplierApiError && <p className="text-[10px] text-red-500 font-bold">{supplierApiError}</p>}

                      <input required className="w-full p-3 border rounded-xl text-sm font-bold" placeholder="Razón Social" value={newSupplierData.name || ''} onChange={e => setNewSupplierData({...newSupplierData, name: e.target.value})} />
                      <input required className="w-full p-3 border rounded-xl text-sm" placeholder="Teléfono" value={newSupplierData.phone || ''} onChange={e => setNewSupplierData({...newSupplierData, phone: e.target.value})} />
                      <input className="w-full p-3 border rounded-xl text-sm" placeholder="Dirección" value={newSupplierData.address || ''} onChange={e => setNewSupplierData({...newSupplierData, address: e.target.value})} />

                      <button type="submit" className={`w-full py-4 rounded-xl text-white font-bold shadow-lg ${themeStyles.primary}`}>Guardar y Seleccionar</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
