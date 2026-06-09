import React, { useContext, useState, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import { Customer, Service, Quotation, QuotationItem } from '../types';
import { 
  Search, Plus, Minus, Trash2, Calendar, FileText, Printer, CheckCircle, 
  ArrowRight, X, ChevronDown, Check, Eye, Send, FileCheck, Info, FileEdit,
  LayoutGrid, List
} from 'lucide-react';

export const QuotationManager: React.FC = () => {
  const { 
    customers, services, quotations, addQuotation, updateQuotation, deleteQuotation,
    setActiveQuotationForPOS, setCurrentView, themeStyles: themeColors, currency 
  } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  // Create / Edit Quotation Mode
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  
  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('7');
  
  // Item selection states
  const [productSearch, setProductSearch] = useState('');
  
  // Preview print states
  const [previewQuote, setPreviewQuote] = useState<Quotation | null>(null);
  const [printFormat, setPrintFormat] = useState<'a4' | '80mm'>('a4');

  // Filtered quotations (skip deleted ones)
  const activeQuotations = useMemo(() => {
    return quotations.filter(q => !q.deleted);
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return activeQuotations.filter(q => {
      const matchSearch = q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.includes(searchTerm);
      const matchStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [activeQuotations, searchTerm, statusFilter]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    return customers.filter(c => 
      !c.deleted && (
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.docNumber?.includes(customerSearch) ||
        c.phone?.includes(customerSearch)
      )
    );
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    return services.filter(p => 
      !p.deleted && (
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.internalCode?.toLowerCase().includes(productSearch.toLowerCase())
      )
    );
  }, [services, productSearch]);

  // Handle Items in Form
  const addItemToQuote = (product: Service) => {
    setQuoteItems(prev => {
      const exists = prev.find(i => i.serviceId === product.id);
      if (exists) {
        return prev.map(i => i.serviceId === product.id 
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } 
          : i
        );
      } else {
        return [...prev, {
          serviceId: product.id,
          serviceName: product.name,
          quantity: 1,
          price: product.price,
          subtotal: product.price,
          unit: product.unit
        }];
      }
    });
    setProductSearch('');
  };

  const updateItemQty = (productId: string, delta: number) => {
    setQuoteItems(prev => prev.map(i => {
      if (i.serviceId === productId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty, subtotal: newQty * i.price };
      }
      return i;
    }));
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setQuoteItems(prev => prev.map(i => {
      if (i.serviceId === productId) {
        return { ...i, price: newPrice, subtotal: i.quantity * newPrice };
      }
      return i;
    }));
  };

  const removeItemFromQuote = (productId: string) => {
    setQuoteItems(prev => prev.filter(i => i.serviceId !== productId));
  };

  const quoteTotal = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [quoteItems]);

  const handleOpenCreate = () => {
    setEditingQuotation(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setQuoteItems([]);
    setNotes('');
    setValidDays('7');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (quote: Quotation) => {
    setEditingQuotation(quote);
    const existingCust = customers.find(c => c.id === quote.customerId) || {
      id: quote.customerId,
      name: quote.customerName,
      docType: quote.customerDocType as any,
      docNumber: quote.customerDocNumber,
      address: quote.customerAddress,
      phone: ''
    } as Customer;
    setSelectedCustomer(existingCust);
    setCustomerSearch('');
    setQuoteItems(quote.items);
    setNotes(quote.notes || '');
    
    // Calculate valid days
    try {
      const diffTime = Math.abs(new Date(quote.validUntil).getTime() - new Date(quote.date).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setValidDays(diffDays.toString());
    } catch {
      setValidDays('7');
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveQuotation = () => {
    if (!selectedCustomer || quoteItems.length === 0) return;

    const today = new Date();
    const validDate = new Date();
    validDate.setDate(today.getDate() + parseInt(validDays));

    const quotationData: Quotation = {
      id: editingQuotation ? editingQuotation.id : `COT-${Date.now().toString().slice(-6)}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerDocType: selectedCustomer.docType,
      customerDocNumber: selectedCustomer.docNumber,
      customerAddress: selectedCustomer.address,
      items: quoteItems,
      total: quoteTotal,
      date: editingQuotation ? editingQuotation.date : today.toISOString(),
      validUntil: validDate.toISOString(),
      notes: notes,
      status: editingQuotation ? editingQuotation.status : 'borrador'
    };

    if (editingQuotation) {
      updateQuotation(quotationData);
    } else {
      addQuotation(quotationData);
    }

    setIsCreateModalOpen(false);
  };

  const handleConvertToSale = (quote: Quotation) => {
    // 1. Load context actively
    setActiveQuotationForPOS(quote);
    // 2. Head to POS
    setCurrentView('pos');
  };

  // Professional print logic
  const handlePrint = (quote: Quotation, format: 'a4' | '80mm') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor habilite las ventanas emergentes para imprimir la cotización.");
      return;
    }

    const subtotal = quote.total / 1.18;
    const igv = quote.total - subtotal;

    let itemsHtml = quote.items.map((item, idx) => {
      if (format === 'a4') {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-size: 13px;">${idx + 1}</td>
            <td style="padding: 10px; font-size: 13px;"><strong>${item.serviceName}</strong></td>
            <td style="padding: 10px; font-size: 13px; text-align: center;">${item.unit}</td>
            <td style="padding: 10px; font-size: 13px; text-align: right;">${item.quantity}</td>
            <td style="padding: 10px; font-size: 13px; text-align: right;">${currency} ${item.price.toFixed(2)}</td>
            <td style="padding: 10px; font-size: 13px; text-align: right; font-weight: bold;">${currency} ${item.subtotal.toFixed(2)}</td>
          </tr>
        `;
      } else {
        return `
          <div style="font-size: 12px; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px;">
            <div style="font-weight: bold;">${item.serviceName}</div>
            <div style="display: flex; justify-content: space-between;">
              <span>${item.quantity} ${item.unit} x ${currency}${item.price.toFixed(2)}</span>
              <span style="font-weight: bold;">${currency}${item.subtotal.toFixed(2)}</span>
            </div>
          </div>
        `;
      }
    }).join('');

    let docHtml = '';

    if (format === 'a4') {
      docHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cotización ${quote.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 40px; background-color: #fff; }
            .header-table { width: 100%; margin-bottom: 30px; }
            .logo-container { width: 45%; }
            .logo { height: 75px; object-contain: contain; }
            .company-info { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 10px; }
            .quote-card { width: 50%; text-align: right; }
            .quote-box { display: inline-block; border: 2px solid #51B01E; border-radius: 12px; padding: 20px; text-align: center; background-color: #fcfdfa; }
            .quote-box h1 { margin: 0; font-size: 20px; color: #51B01E; letter-spacing: 1px; }
            .quote-box h2 { margin: 5px 0 0 0; font-size: 22px; color: #1e293b; }
            .quote-info-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
            .quote-info-table td { padding: 8px 12px; font-size: 13px; vertical-align: top; }
            .info-label { font-weight: bold; color: #475569; width: 15%; background: #f8fafc; border: 1px solid #e2e8f0; }
            .info-value { border: 1px solid #e2e8f0; width: 35%; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background-color: #51B01E; color: white; padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .totals-container { display: flex; justify-content: space-between; align-items: flex-start; }
            .conditions { width: 55%; font-size: 11px; color: #64748b; line-height: 1.6; }
            .conditions h4 { font-size: 12px; color: #475569; margin: 0 0 6px 0; text-transform: uppercase; }
            .totals { width: 40%; }
            .totals-table { width: 100%; border-collapse: collapse; }
            .totals-table td { padding: 8px 10px; font-size: 14px; text-align: right; }
            .totals-table .total-row td { font-size: 18px; font-weight: bold; color: #51B01E; border-top: 2px solid #e2e8f0; }
            .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; }
            .btn-print { position: fixed; bottom: 20px; right: 20px; background-color: #51B01E; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            @media print { .btn-print { display: none; } }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Imprimir Cotización</button>

          <table class="header-table">
            <tr>
              <td class="logo-container">
                <img src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" alt="Logo Lopez" class="logo" />
                <div class="company-info">
                  <strong>QUÍMICOS E INVERSIONES LÓPEZ S.A.C.</strong><br/>
                  Parque Industrial Mz C Lte 4, Ate - Lima<br/>
                  RUC: 20601234567 • Cel: 999-555-0987<br/>
                  Email: ventas@quimicoslopez.pe
                </div>
              </td>
              <td class="quote-card">
                <div class="quote-box">
                  <h1>COTIZACIÓN</h1>
                  <h2>N° ${quote.id}</h2>
                </div>
              </td>
            </tr>
          </table>

          <table class="quote-info-table">
            <tr>
              <td class="info-label">CLIENTE</td>
              <td class="info-value"><strong>${quote.customerName}</strong></td>
              <td class="info-label">NÓM. COTIZACIÓN</td>
              <td class="info-value">#${quote.id}</td>
            </tr>
            <tr>
              <td class="info-label">DOC./RUC</td>
              <td class="info-value">${quote.customerDocNumber || 'Sin documento'} (${quote.customerDocType || 'RUC'})</td>
              <td class="info-label">EMISIÓN</td>
              <td class="info-value">${new Date(quote.date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td class="info-label">DIRECCIÓN</td>
              <td class="info-value">${quote.customerAddress || 'No especificada'}</td>
              <td class="info-label">VALIDEZ</td>
              <td class="info-value">Hasta el ${new Date(quote.validUntil).toLocaleDateString()}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: left;">N°</th>
                <th style="width: 50%; text-align: left;">Insumo / Producto</th>
                <th style="width: 10%; text-align: center;">Unidad</th>
                <th style="width: 10%; text-align: right;">Cantidad</th>
                <th style="width: 10%; text-align: right;">Prec. Unit</th>
                <th style="width: 15%; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="conditions">
              <h4>CONDICIONES COMERCIALES</h4>
              <ul>
                <li>Precios expresados en moneda nacional (Soles ${currency}).</li>
                <li>La presente cotización incluye IGV (18%).</li>
                <li>Forma de pago: Contado contra entrega, salvo acuerdos previos de crédito.</li>
                <li>Validez de la oferta: Hasta la fecha indicada. Sujeto a cambios de stock internacional.</li>
                <li>Nota: ${quote.notes || 'Sin anotaciones adicionales.'}</li>
              </ul>
              <div style="margin-top: 40px; border-top: 1px dotted #cbd5e1; width: 170px; text-align: center; padding-top: 5px; font-size: 10px;">
                Despachador Autorizado
              </div>
            </div>
            
            <div class="totals">
              <table class="totals-table">
                <tr>
                  <td>SUBTOTAL:</td>
                  <td style="font-weight: 500;">${currency} ${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>I.G.V. (18%):</td>
                  <td style="font-weight: 500;">${currency} ${igv.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL NETO:</td>
                  <td>${currency} ${quote.total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="footer">
            ¡Gracias por confiar en Química López! Proveedor industrial líder en insumos de alta calidad.
          </div>
        </body>
        </html>
      `;
    } else {
      docHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cotización ${quote.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 10px; width: 280px; font-size: 12px; margin: 0; background-color: #fff; }
            .header { text-align: center; margin-bottom: 12px; }
            .header h3 { margin: 4px 0; font-size: 15px; }
            .logo { height: 45px; object-contain: contain; margin-bottom: 5px; }
            .dashed { border-top: 1.5px dashed #000; margin: 8px 0; }
            .info-line { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
            .bold { font-weight: bold; }
            .items { margin: 10px 0; }
            .total-section { margin-top: 10px; }
            .total-line { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .grand-total { font-size: 14px; font-weight: bold; }
            .conditions { font-size: 10px; margin-top: 15px; line-height: 1.4; text-align: center; }
            .btn-print { display: block; width: 100%; text-align: center; background-color: #000; color: #fff; border: none; padding: 10px; border-radius: 4px; font-weight: bold; margin-bottom: 15px; cursor: pointer; }
            @media print { .btn-print { display: none; } }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">Imprimir Ticket 80mm</button>

          <div class="header">
            <img src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" alt="Lopo Logo" class="logo" /><br/>
            <strong>QUÍMICOS LOPEZ S.A.C.</strong><br/>
            Parque Industrial Ate, Lima<br/>
            RUC: 20601234567
          </div>

          <div class="dashed"></div>
          <div style="text-align: center; font-weight: bold; font-size: 13px;">COTIZACIÓN: N° ${quote.id}</div>
          <div class="dashed"></div>

          <div class="info-line"><span>CLIENTE:</span><span class="bold">${quote.customerName}</span></div>
          ${quote.customerDocNumber ? `<div class="info-line"><span>RUC/DNI:</span><span>${quote.customerDocNumber}</span></div>` : ''}
          <div class="info-line"><span>FECHA:</span><span>${new Date(quote.date).toLocaleDateString()}</span></div>
          <div class="info-line"><span>VALIDEZ:</span><span>${new Date(quote.validUntil).toLocaleDateString()}</span></div>

          <div class="dashed"></div>
          <div class="bold" style="margin-bottom: 8px;">DETALLE DE COMPRA:</div>
          <div class="items">
            ${itemsHtml}
          </div>

          <div class="dashed"></div>
          <div class="total-section">
            <div class="total-line">
              <span>SUBTOTAL:</span>
              <span>${currency} ${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-line">
              <span>I.G.V. (18%):</span>
              <span>${currency} ${igv.toFixed(2)}</span>
            </div>
            <div class="total-line grand-total">
              <span>TOTAL NETO:</span>
              <span>${currency} ${quote.total.toFixed(2)}</span>
            </div>
          </div>

          <div class="dashed"></div>
          <div class="conditions">
            Precios Incluyen IGV (18%)<br/>
            Este documento NO es un comprobante de pago electrónico.<br/>
            Nota: ${quote.notes || 'Ninguna.'}<br/>
            ¡Gracias por su preferencia!
          </div>
        </body>
        </html>
      `;
    }

    printWindow.document.write(docHtml);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrador': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'enviada': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'aceptada': return 'bg-green-50 text-[#51B01E] border-[#51B01E]/30';
      case 'rechazada': return 'bg-red-50 text-[#FF1021] border-[#FF1021]/20';
      case 'vencida': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.toUpperCase();
  };

  return (
    <div className="p-6 bg-slate-50 space-y-6 animate-fade-in text-slate-800">
      
      {/* 1. Header and metrics block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Cotizaciones</h2>
          <p className="text-sm text-slate-500 font-medium">Crea, imprime cotizaciones profesionales y conviértelas en Notas de Pedido</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-[#51B01E] text-white hover:brightness-110 active:scale-95 px-5 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
        >
          <Plus size={18} /> Nueva Cotización
        </button>
      </div>

      {/* 2. Filters & Searches */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] text-sm font-semibold transition-all"
            placeholder="Buscar por cliente o ID de cotización..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2.5 items-center">
          <select
            className="border border-slate-200 rounded-xl p-3 h-[46px] text-sm bg-white font-bold text-slate-700 cursor-pointer outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] transition-all"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Ver Estados</option>
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
            <option value="vencida">Vencida</option>
          </select>

          {/* View switcher: Grid vs Table */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 h-[46px] select-none">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 h-full rounded-lg flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black uppercase ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-[#51B01E]' 
                  : 'text-slate-450 hover:text-slate-650'
              }`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 h-full rounded-lg flex items-center gap-1.5 justify-center transition-all cursor-pointer text-xs font-black uppercase ${
                viewMode === 'table' 
                  ? 'bg-white shadow-sm text-[#51B01E]' 
                  : 'text-slate-450 hover:text-slate-650'
              }`}
              title="Vista de Tabla"
            >
              <List size={15} />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Quotations List Grid or Table */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <FileText size={48} className="text-slate-350 mb-3.5" />
          <h3 className="font-extrabold text-slate-800 text-lg">No se encontraron cotizaciones</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm leading-relaxed font-semibold">Empieza creando una nueva cotización comercial para tus clientes.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotations.map(quote => (
            <div key={quote.id} className="bg-white border border-slate-200 hover:border-slate-350 hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between transition-all duration-200">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-bold text-xs text-slate-450 bg-slate-50 border border-slate-150 rounded px-2.5 py-1">
                    #{quote.id}
                  </span>
                  <select
                    value={quote.status}
                    onChange={(e) => {
                      updateQuotation({ ...quote, status: e.target.value as any });
                    }}
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded border cursor-pointer outline-none transition-all ${getStatusColor(quote.status)}`}
                  >
                    <option value="borrador">Borrador</option>
                    <option value="enviada">Enviada</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="vencida">Vencida</option>
                  </select>
                </div>

                <h3 className="font-extrabold text-slate-800 text-base leading-tight mb-1" title={quote.customerName}>
                  {quote.customerName}
                </h3>
                {quote.customerDocNumber && (
                  <span className="text-[11px] font-semibold text-slate-400 block mb-3">
                    {quote.customerDocType || 'Doc'}: {quote.customerDocNumber}
                  </span>
                )}

                <div className="border-t border-slate-100 pt-3 mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Emisión:</span>
                    <span className="font-semibold text-slate-700">{new Date(quote.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vencimiento:</span>
                    <span className="font-semibold text-red-650">{new Date(quote.validUntil).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span className="font-semibold text-slate-700">{quote.items.reduce((s,i) => s + i.quantity, 0)} unidades</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Monto Cotizado</span>
                  <span className="text-xl font-extrabold text-[#51B01E]">{currency} {quote.total.toFixed(2)}</span>
                </div>

                {/* Actions buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(quote)}
                    className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    title="Editar Cotización"
                  >
                    <FileEdit size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setPreviewQuote(quote);
                    }}
                    className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    title="Previsualizar"
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    onClick={() => handlePrint(quote, 'a4')}
                    className="p-2 border border-[#51B01E]/20 text-[#51B01E] hover:bg-[#51B01E]/5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                    title="Imprimir A4"
                  >
                    <Printer size={16} />
                  </button>

                  <button
                    onClick={() => handleConvertToSale(quote)}
                    className="p-2 bg-[#51B01E] text-white hover:brightness-110 rounded-lg flex items-center justify-center transition-all col-span-1 shadow-sm cursor-pointer"
                    title="Convertir a Despacho / Venta"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW MODE */
        <div className="bg-white border border-slate-200 rounded-[20px] shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-450 uppercase border-b border-slate-150 tracking-wider sticky top-0 select-none">
                <tr>
                  <th className="p-4 pl-6 w-24">Folio / ID</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 w-36">Fech. Emisión</th>
                  <th className="p-4 w-36">Vencimiento</th>
                  <th className="p-4 w-28 text-center">Items</th>
                  <th className="p-4 w-40 text-right pr-6">Monto Total</th>
                  <th className="p-4 w-32">Estado</th>
                  <th className="p-4 pr-6 text-right w-44">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50/50 transition-all duration-150 group">
                    <td className="p-4 pl-6">
                      <span className="font-mono font-black text-xs text-slate-500 bg-slate-100/70 border border-slate-200 px-2 py-1 rounded">
                        #{quote.id}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm group-hover:text-[#51B01E] transition-colors">{quote.customerName}</div>
                      {quote.customerDocNumber && (
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5 font-mono">
                          {quote.customerDocType || 'DOC'}: {quote.customerDocNumber}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">
                      {new Date(quote.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-xs font-bold text-red-600">
                      {new Date(quote.validUntil).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-xs font-black text-slate-600 text-center bg-slate-50/30">
                      {quote.items.reduce((s, i) => s + i.quantity, 0)} uds
                    </td>
                    <td className="p-4 font-black text-[#51B01E] text-sm text-right pr-6">
                      {currency} {quote.total.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <select
                        value={quote.status}
                        onChange={(e) => {
                          updateQuotation({ ...quote, status: e.target.value as any });
                        }}
                        className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer outline-none transition-all ${getStatusColor(quote.status)}`}
                      >
                        <option value="borrador">Borrador</option>
                        <option value="enviada">Enviada</option>
                        <option value="aceptada">Aceptada</option>
                        <option value="rechazada">Rechazada</option>
                        <option value="vencida">Vencida</option>
                      </select>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(quote)}
                          className="p-2 border border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Editar Cotización"
                        >
                          <FileEdit size={14} />
                        </button>

                        <button
                          onClick={() => setPreviewQuote(quote)}
                          className="p-2 border border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Previsualizar"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => handlePrint(quote, 'a4')}
                          className="p-2 border border-[#51B01E]/20 text-[#51B01E] hover:bg-[#51B01E]/5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Imprimir A4"
                        >
                          <Printer size={14} />
                        </button>

                        <button
                          onClick={() => handleConvertToSale(quote)}
                          className="p-2 bg-[#51B01E] text-white hover:brightness-110 active:scale-95 rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer"
                          title="Convertir a Despacho / Venta"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CREATE / EDIT OVERLAY MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {editingQuotation ? `Editar Cotización #${editingQuotation.id}` : 'Generar Nueva Cotización'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Cotiza insumos químicos y productos personalizados para empresas cliente</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-1.5 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-all"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Content Form Body */}
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-slate-50/50">
              
              {/* Left Column (Customer Selector, Products search, Info) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 1. Customer Selection Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                    <span>1.</span> Seleccionar Cliente
                  </h4>
                  {selectedCustomer ? (
                    <div className="flex justify-between items-center bg-[#51B01E]/5 p-3 rounded-lg border border-[#51B01E]/10">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{selectedCustomer.name}</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {selectedCustomer.docType || 'DOC'}: {selectedCustomer.docNumber || 'Sin documento'}
                        </span>
                      </div>
                      <button 
                        onClick={() => setSelectedCustomer(null)} 
                        className="text-[#FF1021] bg-white p-1.5 border border-[#FF1021]/15 rounded-full shadow-sm hover:bg-red-50"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 ring-[#51B01E]/20"
                        placeholder="Buscar cliente por RUC, nombre..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                      {customerSearch && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl max-h-40 overflow-y-auto z-[110] rounded-b-lg mt-1">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">No se encontraron clientes</div>
                          ) : (
                            filteredCustomers.map(c => (
                              <div 
                                key={c.id} 
                                className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-100 last:border-0"
                                onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                              >
                                <div className="font-bold text-slate-700">{c.name}</div>
                                <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                                  <span>{c.docNumber}</span>
                                  <span>•</span>
                                  <span>{c.address || 'Sin dirección'}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Product Search List */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[320px]">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2 flex-none">
                    <span>2.</span> Añadir Insumos / Productos
                  </h4>
                  <div className="relative mb-3 flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 ring-[#51B01E]/20"
                      placeholder="Filtrar por código o nombre..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredProducts.map(prod => (
                      <div key={prod.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between gap-2.5 hover:bg-[#51B01E]/5 transition-colors">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-slate-800 leading-tight block truncate">{prod.name}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold">
                            COD: {prod.internalCode || '-'} • STOCK: {prod.stock || 0} {prod.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">{currency} {prod.price.toFixed(2)}</span>
                          <button
                            onClick={() => addItemToQuote(prod)}
                            className="bg-[#51B01E] text-white p-1 hover:brightness-110 active:scale-90 rounded-md transition-all shadow-sm"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (Items Added, Price Adjust, Notes & Period) */}
              <div className="lg:col-span-7 flex flex-col h-[52vh] lg:h-auto bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <h4 className="font-extrabold text-slate-800 text-sm mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 flex-none">
                  <span>Productos en la Cotización</span>
                  <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-xs">{quoteItems.length} items</span>
                </h4>

                {/* Items List (Editable Table) */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {quoteItems.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                      <FileText size={36} className="opacity-60 mb-2" />
                      <p className="text-xs font-medium text-slate-400">Aún no hay productos ingresados</p>
                    </div>
                  ) : (
                    quoteItems.map((item) => (
                      <div key={item.serviceId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-800 text-xs leading-snug block">{item.serviceName}</span>
                            <span className="text-[10px] text-slate-400 font-bold">Unidad: {item.unit}</span>
                          </div>
                          <button 
                            onClick={() => removeItemFromQuote(item.serviceId)}
                            className="text-[#FF1021] hover:bg-red-50 p-1.5 rounded-full"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Adjusters */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 min-w-[200px]">
                          {/* Qty Adjustment */}
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Cantidad</label>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => updateItemQty(item.serviceId, -1)}
                                className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-600 font-bold"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="font-bold text-xs text-slate-800 w-8 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateItemQty(item.serviceId, 1)}
                                className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-600 font-bold"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>

                          {/* Price Adjuster with Custom Reduced overrides requested in feature 3 */}
                          <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Precio Unit. (Editar)</label>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-1">
                              <span className="text-[11px] font-bold text-slate-400">{currency}</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full text-xs font-bold text-slate-800 border-none outline-none bg-transparent p-0"
                                value={item.price}
                                onChange={(e) => updateItemPrice(item.serviceId, parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Inner Total representation */}
                        <div className="text-right text-[11px] font-bold text-slate-400">
                          Total: <strong className="text-slate-700">{currency} {item.subtotal.toFixed(2)}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Validity Period & Notes */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-3 flex-none">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Días de Validez</label>
                      <select 
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold bg-white outline-none"
                        value={validDays}
                        onChange={e => setValidDays(e.target.value)}
                      >
                        <option value="3">3 días</option>
                        <option value="5">5 días</option>
                        <option value="7">7 días</option>
                        <option value="15">15 días</option>
                        <option value="30">30 días</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Total Cotizado</label>
                      <div className="text-xl font-black text-[#51B01E] pt-1">
                        {currency} {quoteTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Notas Comerciales</label>
                    <textarea 
                      className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:ring-1 ring-[#51B01E]/40"
                      rows={2}
                      placeholder="Anotar detalles de entrega, descuentos extraordinarios..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Bottom Save actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-slate-500 text-sm font-semibold hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveQuotation}
                disabled={!selectedCustomer || quoteItems.length === 0}
                className={`px-5 py-2 rounded-xl font-bold text-sm text-white shadow flex items-center gap-1.5 ${(!selectedCustomer || quoteItems.length === 0) ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#51B01E] hover:brightness-110 active:scale-95'}`}
              >
                <FileCheck size={16} /> Guardar Cotización
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">Previsualizar Cotización N° {previewQuote.id}</h3>
                <p className="text-xs text-slate-400 font-semibold">Selecciona el formato de impresión que deseas utilizar</p>
              </div>
              <button 
                onClick={() => setPreviewQuote(null)} 
                className="p-1.5 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Format toggle tabs */}
            <div className="flex border-b border-slate-100 bg-white">
              <button
                onClick={() => setPrintFormat('a4')}
                className={`flex-1 py-3 text-xs font-black text-center border-b-2 uppercase leading-none ${printFormat === 'a4' ? 'border-[#51B01E] text-[#51B01E] bg-[#51B01E]/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Documento A4 Corporativo
              </button>
              <button
                onClick={() => setPrintFormat('80mm')}
                className={`flex-1 py-3 text-xs font-black text-center border-b-2 uppercase leading-none ${printFormat === '80mm' ? 'border-[#51B01E] text-[#51B01E] bg-[#51B01E]/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Ticket Térmico 80mm
              </button>
            </div>

            {/* Preview Sheet Card Container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
              {printFormat === 'a4' ? (
                /* Interactive mock A4 Sheet */
                <div className="bg-white w-[595px] min-h-[500px] shadow-lg border border-slate-200 p-8 flex flex-col justify-between text-[#1e293b]">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-[60%] text-left">
                        <img 
                          src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" 
                          alt="Lopot logo" 
                          className="h-12 w-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-[9px] text-slate-400 mt-2 font-semibold">
                          <strong>QUÍMICOS E INVERSIONES LÓPEZ S.A.C.</strong><br/>
                          Parque Industrial Mz C Lte 4, Ate - Lima<br/>
                          RUC: 20601234567 • Cel: 999-555-0987
                        </div>
                      </div>
                      <div className="border-2 border-[#51B01E] rounded-xl p-3 text-center bg-[#51B01E]/5">
                        <span className="text-[10px] font-bold text-[#51B01E] tracking-widest block font-sans">COTIZACIÓN</span>
                        <span className="text-sm font-black text-[#1e293b]">N° {previewQuote.id}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 border border-slate-200 p-3 bg-slate-50 rounded-lg text-[10px] mb-5">
                      <div>
                        <strong>CLIENTE:</strong> {previewQuote.customerName}<br/>
                        <strong>RUC/DNI:</strong> {previewQuote.customerDocNumber || 'Sin documento'}<br/>
                        <strong>DIRECCIÓN:</strong> {previewQuote.customerAddress || 'No registrada'}
                      </div>
                      <div className="text-right">
                        <strong>EMISIÓN:</strong> {new Date(previewQuote.date).toLocaleDateString()}<br/>
                        <strong>VALIDEZ HASTA:</strong> {new Date(previewQuote.validUntil).toLocaleDateString()}<br/>
                        <strong>CORREO:</strong> ventas@quimicoslopez.pe
                      </div>
                    </div>

                    {/* List */}
                    <table className="w-full text-left border-collapse text-[11px] mb-6">
                      <thead>
                        <tr className="bg-[#51B01E] text-white">
                          <th className="p-2">Item</th>
                          <th className="p-2">Insumo / Descripción</th>
                          <th className="p-2 text-center">Unid.</th>
                          <th className="p-2 text-right">Cant.</th>
                          <th className="p-2 text-right">Unitario</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewQuote.items.map((it, idx) => (
                          <tr key={it.serviceId} className="border-b border-slate-100 last:border-0">
                            <td className="p-2 text-slate-400 font-semibold">{idx + 1}</td>
                            <td className="p-2 font-bold">{it.serviceName}</td>
                            <td className="p-2 text-center">{it.unit}</td>
                            <td className="p-2 text-right">{it.quantity}</td>
                            <td className="p-2 text-right">{currency} {it.price.toFixed(2)}</td>
                            <td className="p-2 text-right font-bold text-slate-700">{currency} {it.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Conditions & totals */}
                  <div className="border-t border-slate-200 pt-4 flex justify-between items-start text-[10px] text-slate-400 mt-4 leading-normal">
                    <div className="w-[55%]">
                      <strong className="text-slate-600 block mb-1">TÉRMINOS COMERCIALES:</strong>
                      • Precios incluyen IGV (18%).<br/>
                      • Validez: hasta la fecha delimitada.<br/>
                      • Nota: {previewQuote.notes || 'Sin observaciones.'}
                    </div>
                    <div className="w-[40%] text-right font-medium space-y-1 text-slate-600 text-[11px]">
                      <div className="flex justify-between">
                        <span>SUB-TOTAL:</span>
                        <span>{currency} {(previewQuote.total / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>I.G.V. (18%):</span>
                        <span>{currency} {(previewQuote.total - previewQuote.total / 1.18).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[#51B01E] border-t border-slate-200 pt-1">
                        <span>TOTAL NETO:</span>
                        <span>{currency} {previewQuote.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Ticket Format */
                <div className="bg-white w-[260px] min-h-[400px] shadow-lg border border-slate-200 p-4 font-mono text-[10px] text-black">
                  <div className="text-center mb-3">
                    <img 
                      src="https://i.ibb.co/G4kXfrPz/logosinfondolopoez.png" 
                      alt="Brand Logo" 
                      className="h-10 w-auto object-contain mx-auto" 
                      referrerPolicy="no-referrer"
                    /><br/>
                    <strong>QUÍMICOS LOPEZ S.A.C.</strong><br/>
                    Parque Industrial Ate, Lima<br/>
                    RUC: 20601234567
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 my-2"></div>
                  <div className="text-center font-bold text-xs uppercase mb-1">Cotización: N° {previewQuote.id}</div>
                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="space-y-1 my-2">
                    <div>CLIENTE: <span className="font-bold">{previewQuote.customerName}</span></div>
                    {previewQuote.customerDocNumber && <div>DOC/RUC: {previewQuote.customerDocNumber}</div>}
                    <div>EMISIÓN: {new Date(previewQuote.date).toLocaleDateString()}</div>
                    <div>VALIDEZ: {new Date(previewQuote.validUntil).toLocaleDateString()}</div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>
                  <div className="font-bold mb-2">DETALLE DE ITEMS:</div>
                  <div className="space-y-3">
                    {previewQuote.items.map((it) => (
                      <div key={it.serviceId} className="border-b border-dotted border-slate-200 pb-1.5 last:border-0">
                        <div className="font-bold">{it.serviceName}</div>
                        <div className="flex justify-between">
                          <span>{it.quantity} {it.unit} x {currency}{it.price.toFixed(2)}</span>
                          <span className="font-bold">{currency}{it.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span>SUBTOTAL:</span><span>{currency} {(previewQuote.total / 1.18).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>I.G.V. (18%):</span><span>{currency} {(previewQuote.total - previewQuote.total / 1.18).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-sm"><span>TOTAL NETO:</span><span>{currency} {previewQuote.total.toFixed(2)}</span></div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2.5"></div>
                  <div className="text-center text-[9px] text-slate-500 line-clamp-3">
                    * Precios con IGV incluido.<br/>
                    * Esto no representa un comprobante contable fiscal.<br/>
                    Nota: {previewQuote.notes || 'Ninguna.'}
                  </div>
                </div>
              )}
            </div>

            {/* Print actions footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <button 
                onClick={() => setPreviewQuote(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                onClick={() => handlePrint(previewQuote, printFormat)}
                className="px-5 py-2 bg-[#51B01E] hover:brightness-110 active:scale-95 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={16} /> Enviar a Impresora
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
