import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../App';
import { Customer, SaleItem, Service, Sale, Quotation } from '../types';
import { Search, User, ShoppingCart, Plus, Minus, Trash2, Save, X, ChevronUp, Package, ShoppingBag, CheckCircle, AlertCircle, FileText, LayoutGrid, List, Phone, MapPin, Smartphone, Banknote, QrCode, Clock, Wallet, CreditCard, Calendar, Eye, Loader2, ArrowDown } from 'lucide-react';
import { searchClient, reservarSiguienteCorrelativo, sendCPEToVisioner7 } from '../services/clientService';
import { generateUUID } from '../services/api';
import { numeroALetras } from './SalesHistory';

export const Pos: React.FC = () => {
  const { 
    customers, services, sales, addSale, updateSale, getNextOrderNumber, 
    themeStyles: themeColors, currency, activeQuotationForPOS, setActiveQuotationForPOS,
    apiToken, addCustomer, zones, paymentMethods, exchangeRate, ticketConfig
  } = useContext(AppContext);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);
  
  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Success Message State
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Error Message State (Stock)
  const [showError, setShowError] = useState<string | null>(null);

  // Billing & Retrofecha (Electronic Invoicing up to 2 days override)
  const [documentType, setDocumentType] = useState<'BOLETA' | 'FACTURA' | 'NOTA_PEDIDO'>('NOTA_PEDIDO');
  const [saleCurrency, setSaleCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [emissionDate, setEmissionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isRetrofechaEnabled, setIsRetrofechaEnabled] = useState(false);

  // Módulo de pagos (Checkout Modal)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentCondition, setPaymentCondition] = useState<'CONTADO' | 'CRÉDITO'>('CONTADO');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [receivedCash, setReceivedCash] = useState<string>('');
  const [initialPayment, setInitialPayment] = useState<string>('0');
  const [creditDays, setCreditDays] = useState<'15' | '30' | '45' | '60' | '90'>('15');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [errorTitle, setErrorTitle] = useState("Atención");

  // Post-Sale Modal and CPE immediate generation states
  const [isPostSaleModalOpen, setIsPostSaleModalOpen] = useState(false);
  const [activePostSale, setActivePostSale] = useState<Sale | null>(null);
  const [postSaleLoading, setPostSaleLoading] = useState(false);
  const [postSaleError, setPostSaleError] = useState<string | null>(null);
  const [postSaleSuccessMsg, setPostSaleSuccessMsg] = useState<string | null>(null);

  const emitCPEImmediately = async (sale: Sale) => {
    setPostSaleLoading(true);
    setPostSaleError(null);
    setPostSaleSuccessMsg(null);
    
    try {
      const docType = sale.documentType;
      if (!docType || docType === 'NOTA_PEDIDO') {
        setPostSaleLoading(false);
        return; // No CPE emission needed for local tickets
      }
      
      const isFactura = docType === 'FACTURA';
      const codTipoDoc = isFactura ? "01" : "03";
      const serie = isFactura ? "F001" : "B001";
      
      const reservedNum = sale.sunatDocumentNumber || await reservarSiguienteCorrelativo(codTipoDoc, serie);
      
      const totalNum = sale.total || 0;
      const igvRate = 0.18;
      const totalGravadas = totalNum / (1 + igvRate);
      const totalIgv = totalNum - totalGravadas;
      
      // Determinar tipo de documento del cliente
      const docNumber = sale.clientDocNumber || "00000000";
      let clientDocType = "0"; // Sin documento
      if (docNumber.length === 8) {
        clientDocType = "1"; // DNI
      } else if (docNumber.length === 11) {
        clientDocType = "6"; // RUC
      }
      
      // Formatear items para el detalle de CPE
      const cpeItems = sale.items.map((item, idx) => {
        const qty = item.quantity || 1;
        const unitPrice = item.price || 0.0;
        const totalWithTax = unitPrice * qty;
        const valUnit = unitPrice / (1 + igvRate);
        const impDet = valUnit * qty;
        const igvDet = totalWithTax - impDet;
        
        return {
          txtITEM: (idx + 1).toString(),
          txtUNIDAD_MEDIDA_DET: "NIU",
          txtCANTIDAD_DET: qty.toFixed(2),
          txtPRECIO_DET: unitPrice.toFixed(2),
          txtIMPORTE_DET: totalWithTax.toFixed(2),
          txtIGV: igvDet.toFixed(2),
          POR_IGV: "18.00",
          txtVALOR_IGV_DET: "0.18",
          txtVALOR_IMPORTE_DET: impDet.toFixed(2),
          txtVALOR_PRECIO_DET: valUnit.toFixed(6),
          txtVALOR_VENTA_DET: impDet.toFixed(2),
          txtVALOR_UNITARIO_DET: valUnit.toFixed(6),
          txtDSC_DET: "0.00",
          txtCOD_TIPO_OPERACION: "10",
          txtCODIGO_DET: item.serviceId || `SERV${idx+1}`,
          txtDESCRIPCION_DET: item.serviceName || "SERVICIO DE LAVANDERIA",
          txtPRECIO_SIN_IGV_DET: valUnit.toFixed(2),
          txtPRECIO_TIPO_CODIGO: "01"
        };
      });
      
      const payload = {
        txtTIPO_OPERACION: "0101",
        txtTOTAL_GRAVADAS: totalGravadas.toFixed(2),
        txtTOTAL_INAFECTA: "0.00",
        txtTOTAL_EXONERADAS: "0.00",
        txtTOTAL_GRATUITAS: "0.00",
        txtSUB_TOTAL: totalGravadas.toFixed(2),
        txtTOTAL_DESCUENTO: "0.00",
        txtPOR_IGV: "18.00",
        txtTOTAL_IGV: totalIgv.toFixed(2),
        txtTOTAL: totalNum.toFixed(2),
        txtSUB_TOTAL_PERCEPCIONES: "0.00",
        txtPOR_PERCEPCIONES: "0.00",
        txtBI_PERCEPCIONES: "0.00",
        txtTOTAL_PERCEPCIONES: "0.00",
        txtPOR_RETENCIONES: "0.00",
        txtBI_RETENCIONES: "0.00",
        txtTOTAL_RETENCIONES: "0.00",
        txtTOTAL_BONIFICACIONES: "0.00",
        txtTOTAL_EXPORTACION: "0.00",
        txtCOD_MEDIO_PAGO: "",
        txtCTA_BANCARIA_BN: "",
        txtCODIGO_DETRACCION: "",
        txtPOR_DETRACCION: "0.00",
        txtTOTAL_DETRACCIONES: "0.00",
        txtTOTAL_ISC: "0.00",
        txtTOTAL_OTR_IMP: "0.00",
        txtICBP_BOLSA: "0.00",
        txtTOTAL_LETRAS: numeroALetras(totalNum, sale.currency === 'USD' ? 'USD' : 'PEN'),
        txtNRO_COMPROBANTE: reservedNum,
        txtFECHA_DOCUMENTO: new Date().toISOString().split('T')[0],
        txtCOD_TIPO_DOCUMENTO: codTipoDoc,
        txtCOD_MONEDA: sale.currency === 'USD' ? "USD" : "PEN",
        txtTIPO_TIPO_CAMBIO: "02",
        txtCOMPRA_TIPO_CAMBIO: sale.currency === 'USD' ? (sale.exchangeRate || 3.75).toFixed(2) : "1.00",
        txtVENTA_TIPO_CAMBIO: sale.currency === 'USD' ? (sale.exchangeRate || 3.75).toFixed(2) : "1.05",
        txtNRO_DOCUMENTO_CLIENTE: docNumber,
        txtRAZON_SOCIAL_CLIENTE: sale.customerName || "CLIENTE GENERICO",
        txtTIPO_DOCUMENTO_CLIENTE: clientDocType,
        txtDIRECCION_CLIENTE: "LIMA LIMA",
        txtDIRECCION_ENTREGA: "",
        txtFORMA_PAGO: sale.balance > 0 ? "Credito" : "Contado",
        txtMONTO_PENDIENTE: sale.balance.toFixed(2),
        txtCUOTAS: [],
        txtUSUARIO_SOL_EMPRESA: ticketConfig?.solUser || "MODDATOS",
        txtPASS_SOL_EMPRESA: ticketConfig?.solPassword || "moddatos",
        txtCONTRA: ticketConfig?.signaturePassword || "123456",
        txtPAS_FIRMA: ticketConfig?.signaturePassword || "123456",
        txtTIPO_PROCESO: ticketConfig?.productionMode ? "1" : "3",
        txtNRO_DOCUMENTO_EMPRESA: ticketConfig?.ruc || "",
        txtRUC_EMPRESA: ticketConfig?.ruc || "",
        txtEMPRESA_RUC: ticketConfig?.ruc || "",
        txtRuc: ticketConfig?.ruc || "",
        txtRUC: ticketConfig?.ruc || "",
        txtNRO_DOCUMENTO_EMISOR: ticketConfig?.ruc || "",
        txtRAZON_SOCIAL_EMPRESA: ticketConfig?.shopName || "Químicos e Inversiones López",
        txtNOMBRE_COMERCIAL_EMPRESA: ticketConfig?.shopName || "Químicos e Inversiones López",
        txtDIRECCION_EMPRESA: ticketConfig?.address || "LIMA CENTRO",
        detalle: cpeItems
      };
      
      const res = await sendCPEToVisioner7(payload, apiToken);
      
      if (res && (res.respuesta === 'OK' || res.success || res.url_pdf || res.pdf || res.cod_sunat === "0" || res.cod_sunat === 0)) {
        const url_pdf_original = res.url_pdf || res.pdf || "https://example.com/mock-pdf.pdf";
        const finalPdfUrl = url_pdf_original.replace('http://', 'https://');
        const updatedSale: Sale = {
          ...sale,
          sunatStatus: 'ACEPTADO_SUNAT',
          sunatPdfUrl: finalPdfUrl,
          sunatXmlUrl: res.url_xml || res.xml || "",
          sunatCdrUrl: res.url_cdr || res.cdr || "",
          sunatResponseCode: res.cod_sunat || res.codigo_respuesta || "0",
          sunatResponseDescription: res.msj_sunat || res.descripcion_respuesta || "Aceptado",
          sunatDocumentNumber: reservedNum
        };
        await updateSale(updatedSale);
        setActivePostSale(updatedSale);
        setPostSaleSuccessMsg(`Comprobante ${reservedNum} emitido con éxito.`);
        
        try {
          window.open(finalPdfUrl, '_blank', 'noopener,noreferrer');
        } catch (e) {
          console.warn("Pop-up blocker blocked auto-open of SUNAT PDF", e);
        }
      } else {
        throw new Error(res?.descripcion_respuesta || res?.message || "Error devuelto por la API de SUNAT.");
      }
    } catch (err: any) {
      console.error(err);
      setPostSaleError(err.message || "Error desconocido al emitir el comprobante.");
    } finally {
      setPostSaleLoading(false);
    }
  };

  const getDisplayCurrencySymbol = () => {
    return saleCurrency === 'USD' ? '$' : 'S/';
  };

  const getDisplayPrice = (priceInSoles: number) => {
    if (saleCurrency === 'USD') {
      return priceInSoles / exchangeRate;
    }
    return priceInSoles;
  };

  const PaymentMethodIcon = ({ pm, size = 18 }: { pm: any, size?: number }) => {
    if (pm.imageIcon) {
      return <img src={pm.imageIcon} className="rounded-md object-contain" style={{ width: size, height: size }} alt={pm.name} referrerPolicy="no-referrer" />;
    }
    switch(pm.icon) {
      case 'Smartphone': return <Smartphone size={size} />;
      case 'Banknote': return <Banknote size={size} />;
      case 'QrCode': return <QrCode size={size} />;
      case 'Clock': return <Clock size={size} />;
      case 'Wallet': return <Wallet size={size} />;
      case 'Package': return <Package size={size} />;
      default: return <CreditCard size={size} />;
    }
  };

  // New Customer Modal State
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isSearchingClient, setIsSearchingClient] = useState(false);
  const [searchClientError, setSearchClientError] = useState<string | null>(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    docType: 'DNI' as 'DNI' | 'RUC' | 'SIN_DOCUMENTO',
    docNumber: '',
    name: '',
    phone: '',
    address: '',
    email: '',
    zone: 'NORTE',
    department: '',
    province: '',
    district: '',
    ubigeo: '',
    sunatStatus: '',
    sunatCondition: ''
  });

  useEffect(() => {
    if (zones && zones.length > 0) {
      setNewCustomerForm(prev => ({ ...prev, zone: zones[0] }));
    }
  }, [zones]);

  useEffect(() => {
    if (!isNewCustomerModalOpen) {
      setSearchClientError(null);
    }
  }, [isNewCustomerModalOpen]);

  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      const active = paymentMethods.find(pm => pm.isActive && !pm.deleted);
      if (active) {
        setSelectedPaymentMethodId(active.id);
      } else {
        setSelectedPaymentMethodId(paymentMethods[0].id);
      }
    }
  }, [paymentMethods]);

  const handleQueryDecolecta = async () => {
    const { docType, docNumber } = newCustomerForm;
    if (docType === 'SIN_DOCUMENTO') {
        setSearchClientError("No es necesario buscar en Decolecta para clientes sin documento.");
        return;
    }
    if (!docNumber) {
        setSearchClientError("Por favor, ingrese un número de documento");
        return;
    }
    if (docType === 'DNI' && docNumber.length !== 8) {
        setSearchClientError("El DNI debe contener exactamente 8 dígitos");
        return;
    }
    if (docType === 'RUC' && docNumber.length !== 11) {
        setSearchClientError("El RUC debe contener exactamente 11 dígitos");
        return;
    }

    setIsSearchingClient(true);
    setSearchClientError(null);
    try {
        const result = await searchClient(docType as 'DNI' | 'RUC', docNumber, apiToken);
        console.log("[POS Query Result]", result);
        if (result) {
            setNewCustomerForm(prev => ({
                ...prev,
                name: result.name || '',
                address: result.address || '',
                department: result.departamento || result.department || '',
                province: result.provincia || result.province || '',
                district: result.distrito || result.district || '',
                ubigeo: result.ubigeo || '',
                sunatStatus: result.sunatStatus || '',
                sunatCondition: result.sunatCondition || ''
            }));
        } else {
            setSearchClientError("No se obtuvieron registros para el documento proporcionado.");
        }
    } catch (err: any) {
        console.error("Error al consultar Decolecta:", err);
        setSearchClientError(err.message || "Error al realizar la consulta del documento con Decolecta.");
    } finally {
        setIsSearchingClient(false);
    }
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name) {
        setSearchClientError("La Razón Social o el Nombre Completo es obligatorio");
        return;
    }

    const newCustomer: Customer = {
        id: generateUUID(),
        name: newCustomerForm.name.toUpperCase(),
        phone: newCustomerForm.phone,
        docType: newCustomerForm.docType === 'SIN_DOCUMENTO' ? undefined : (newCustomerForm.docType as any),
        docNumber: newCustomerForm.docType === 'SIN_DOCUMENTO' ? '' : newCustomerForm.docNumber,
        address: newCustomerForm.address.toUpperCase(),
        department: newCustomerForm.department,
        province: newCustomerForm.province,
        district: newCustomerForm.district,
        ubigeo: newCustomerForm.ubigeo,
        sunatStatus: newCustomerForm.sunatStatus,
        sunatCondition: newCustomerForm.sunatCondition,
        email: newCustomerForm.email,
        zone: newCustomerForm.zone,
        deleted: false
    };

    addCustomer(newCustomer);
    setSelectedCustomer(newCustomer);
    setIsNewCustomerModalOpen(false);
    
    // Reset form
    setNewCustomerForm({
        docType: 'DNI',
        docNumber: '',
        name: '',
        phone: '',
        address: '',
        email: '',
        zone: zones[0] || 'NORTE',
        department: '',
        province: '',
        district: '',
        ubigeo: '',
        sunatStatus: '',
        sunatCondition: ''
    });
  };

  // Historic prices search
  const [histClientId, setHistClientId] = useState('');
  const [histProductId, setHistProductId] = useState('');
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Pre-load active quotations loaded from QuotationManager
  useEffect(() => {
    if (activeQuotationForPOS) {
      const cust = customers.find(c => c.id === activeQuotationForPOS.customerId);
      if (cust) {
        setSelectedCustomer(cust);
      } else {
        setSelectedCustomer({
          id: activeQuotationForPOS.customerId,
          name: activeQuotationForPOS.customerName,
          docType: activeQuotationForPOS.customerDocType as any,
          docNumber: activeQuotationForPOS.customerDocNumber,
          address: activeQuotationForPOS.customerAddress,
          phone: '',
          deleted: false
        });
      }
      
      const loadedCart: SaleItem[] = activeQuotationForPOS.items.map(item => ({
        serviceId: item.serviceId,
        serviceName: item.serviceName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));
      setCart(loadedCart);
    }
  }, [activeQuotationForPOS, customers]);

  // Find past sales for client to see past price charged (Requirement 2)
  const historicalClientSales = useMemo(() => {
    const targetCustId = histClientId || (selectedCustomer ? selectedCustomer.id : '');
    if (!targetCustId) return [];

    const matches: { date: string; prodId: string; productName: string; qty: number; price: number }[] = [];
    
    sales.forEach(sale => {
      if (!sale.deleted && sale.customerId === targetCustId) {
        sale.items.forEach(item => {
          if (!histProductId || item.serviceId === histProductId) {
            matches.push({
              date: sale.date,
              prodId: item.serviceId,
              productName: item.serviceName,
              qty: item.quantity,
              price: item.price
            });
          }
        });
      }
    });

    return matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, histClientId, histProductId, selectedCustomer]);

  const handleApplyHistoricalPrice = (prodId: string, price: number) => {
    const originalProd = services.find(s => s.id === prodId && !s.deleted);
    if (!originalProd) return;

    const inCart = cart.find(item => item.serviceId === prodId);
    if (inCart) {
      setCart(prev => prev.map(item => item.serviceId === prodId
        ? { ...item, price: price, subtotal: item.quantity * price }
        : item
      ));
    } else {
      setCart(prev => [...prev, {
        serviceId: originalProd.id,
        serviceName: originalProd.name,
        quantity: 1,
        price: price,
        subtotal: price
      }]);
    }
    alert(`Se aplicó el precio histórico de ${currency} ${price.toFixed(2)} para ${originalProd.name}`);
  };

  // Filter finished products only for sale (PACKAGED SKUs only)
  const productsForSale = services.filter(s => s.type === 'PRODUCTO_TERMINADO' && s.subtype !== 'BULK' && !s.deleted);
  
  const filteredProducts = productsForSale.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.internalCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Last 5 recently created/modified customers for quick empty-search recommendations
  const recentCustomers = useMemo(() => {
      return customers.filter(c => !c.deleted).slice(-5).reverse();
  }, [customers]);

  const getCartItem = (serviceId: string) => cart.find(i => i.serviceId === serviceId);

  const updateCartItem = (product: Service, delta: number) => {
      // STOCK VALIDATION logic
      if (delta > 0 && product.trackStock) {
          const currentItem = cart.find(i => i.serviceId === product.id);
          const currentQty = currentItem ? currentItem.quantity : 0;
          const availableStock = product.stock || 0;

          if (currentQty + delta > availableStock) {
              setShowError(`Stock insuficiente. Solo quedan ${availableStock} ${product.unit}`);
              setTimeout(() => setShowError(null), 2000);
              return; // Stop execution
          }
      }

      setCart(prev => {
          const existingIdx = prev.findIndex(i => i.serviceId === product.id);
          
          if (existingIdx >= 0) {
              const currentItem = prev[existingIdx];
              const newQty = currentItem.quantity + delta;

              if (newQty <= 0) {
                  return prev.filter((_, i) => i !== existingIdx);
              }

              const newCart = [...prev];
              newCart[existingIdx] = {
                  ...currentItem,
                  quantity: newQty,
                  subtotal: newQty * currentItem.price
              };
              return newCart;
          } else if (delta > 0) {
              return [...prev, {
                  serviceId: product.id,
                  serviceName: product.name,
                  quantity: 1,
                  price: product.price,
                  subtotal: product.price
              }];
          }
          return prev;
      });
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  // Global Keyboard hook for Wedge-mode Barcode Scanner of Products
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
      
      const currentTime = Date.now();
      
      // If delay between keystrokes is human-level (e.g. > 50ms), buffer resets
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      // Handle barcode scanner finishing scan with Enter action
      if (e.key === 'Enter') {
        const potentialCode = buffer.trim();
        if (potentialCode.length >= 3) {
          // Look up product matching the scanned internalCode or EAN
          const foundProd = services.find(s => 
            s.type === 'PRODUCTO_TERMINADO' && 
            s.subtype !== 'BULK' && 
            !s.deleted && 
            (s.internalCode?.toLowerCase() === potentialCode.toLowerCase() || s.ean === potentialCode)
          );

          if (foundProd) {
            e.preventDefault();
            const isOutOfStock = foundProd.trackStock && (foundProd.stock || 0) <= 0;
            if (!isOutOfStock) {
              // Verify available stock
              const currentItem = cart.find(i => i.serviceId === foundProd.id);
              const currentQty = currentItem ? currentItem.quantity : 0;
              const availableStock = foundProd.stock || 0;

              if (foundProd.trackStock && currentQty + 1 > availableStock) {
                setShowError(`Stock insuficiente para ${foundProd.name}. Quedan ${availableStock} ${foundProd.unit}`);
                setTimeout(() => setShowError(null), 2500);
              } else {
                updateCartItem(foundProd, 1);
                
                // Show a nice visual confirmation toast
                const toast = document.createElement('div');
                toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-[150] animate-fade-in flex items-center gap-2 border border-slate-700";
                toast.innerHTML = `<span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>⚡ Escaneado: <b>${foundProd.name}</b> agregado</span>`;
                document.body.appendChild(toast);
                setTimeout(() => {
                  toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
                  setTimeout(() => toast.remove(), 500);
                }, 2000);
              }
            } else {
              setShowError(`El producto ${foundProd.name} escaneado no tiene stock.`);
              setTimeout(() => setShowError(null), 2500);
            }
            buffer = '';
            if (isInput) {
              target.blur();
            }
            return;
          }
        }
        buffer = '';
        return;
      }

      // Record any alphanumeric printable characters typed rapidly
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [services, cart, updateCartItem]);

  // Handle outside click to close customer search suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setIsCustomerFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Handler for Enter presses in search input (e.g. if the barcode scanner focuses search first)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchTerm.trim();
      if (!query) return;

      const foundProd = services.find(s => 
        s.type === 'PRODUCTO_TERMINADO' && 
        s.subtype !== 'BULK' && 
        !s.deleted && 
        (
          s.internalCode?.toLowerCase() === query.toLowerCase() || 
          s.ean === query ||
          s.name.toLowerCase() === query.toLowerCase()
        )
      );

      if (foundProd) {
        e.preventDefault();
        const isOutOfStock = foundProd.trackStock && (foundProd.stock || 0) <= 0;
        if (!isOutOfStock) {
          const currentItem = cart.find(i => i.serviceId === foundProd.id);
          const currentQty = currentItem ? currentItem.quantity : 0;
          const availableStock = foundProd.stock || 0;

          if (foundProd.trackStock && currentQty + 1 > availableStock) {
            setErrorTitle("Stock Insuficiente");
            setShowError(`Stock insuficiente para ${foundProd.name}. Solo quedan ${availableStock} ${foundProd.unit}`);
            setTimeout(() => setShowError(null), 2500);
          } else {
            updateCartItem(foundProd, 1);
            setSearchTerm(''); // Clear on successful scan addition
            
            const toast = document.createElement('div');
            toast.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-[150] animate-fade-in flex items-center gap-2 border border-slate-700";
            toast.innerHTML = `<span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>⚡ Agregado: <b>${foundProd.name}</b></span>`;
            document.body.appendChild(toast);
            setTimeout(() => {
              toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
              setTimeout(() => toast.remove(), 500);
            }, 2000);
          }
        } else {
          setErrorTitle("Sin Stock");
          setShowError(`El producto ${foundProd.name} no cuenta con stock.`);
          setTimeout(() => setShowError(null), 2500);
        }
      }
    }
  };

  const isRucValid = (ruc?: string) => {
    if (!ruc) return false;
    const cleanRuc = ruc.trim().replace(/\D/g, '');
    return cleanRuc.length === 11 && (cleanRuc.startsWith('10') || cleanRuc.startsWith('20') || cleanRuc.startsWith('15') || cleanRuc.startsWith('17'));
  };

  const handleOpenCheckout = () => {
    if (!selectedCustomer) {
      setErrorTitle("Seleccione Cliente");
      setShowError("Por favor, seleccione un cliente antes de registrar la venta.");
      setTimeout(() => setShowError(null), 3000);
      return;
    }

    if (cart.length === 0) {
      setErrorTitle("Carrito Vacío");
      setShowError("Por favor, agregue al menos un producto al carrito.");
      setTimeout(() => setShowError(null), 3000);
      return;
    }

    // 1. Validate Factura with valid RUC
    if (documentType === 'FACTURA') {
      if (!isRucValid(selectedCustomer.docNumber)) {
        setErrorTitle("RUC Obligatorio");
        setShowError("Para emitir una Factura se requiere obligatoriamente un cliente con un número de RUC válido de 11 dígitos (que empiece con 10 o 20).");
        setTimeout(() => setShowError(null), 5000);
        return;
      }
    }

    // 2. Validate Boleta > 700 with DNI / RUC
    if (documentType === 'BOLETA') {
      const totalAmountSoles = cart.reduce((sum, i) => sum + i.subtotal, 0);
      if (totalAmountSoles > 700) {
        const docNum = selectedCustomer.docNumber || '';
        const cleanDoc = docNum.trim().replace(/\D/g, '');
        const hasValidId = cleanDoc.length === 8 || cleanDoc.length === 11;
        
        if (!hasValidId || selectedCustomer.name === 'Clientes Varios' || selectedCustomer.id === 'default-cash') {
          setErrorTitle("Identificación Requerida");
          setShowError("De acuerdo a la SUNAT, para Boletas que superen los S/ 700.00 soles, es obligatorio identificar al cliente con su DNI (8 dígitos) o RUC (11 dígitos).");
          setTimeout(() => setShowError(null), 6000);
          return;
        }
      }
    }

    // Initialize checkout inputs
    const totalToPay = getDisplayPrice(cartTotal);
    setReceivedCash(totalToPay.toFixed(2));
    setInitialPayment('0');
    setPaymentCondition('CONTADO');
    setSaleNotes(activeQuotationForPOS?.notes || '');
    setIsCheckoutModalOpen(true);
  };

  const handleSaveOrder = async () => {
      if (!selectedCustomer || cart.length === 0) return;
      
      const totalSoles = cart.reduce((sum, i) => sum + i.subtotal, 0);
      const totalInSelectedCurrency = getDisplayPrice(totalSoles);
      
      // Custom timestamp matching specified retrofecha day if enabled; otherwise, real time now
      let saleDate = new Date().toISOString();
      if (isRetrofechaEnabled && emissionDate) {
         const now = new Date();
         const timeString = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
         saleDate = new Date(`${emissionDate}T${timeString}`).toISOString();
      }
      const igv = totalInSelectedCurrency - (totalInSelectedCurrency / 1.18);

      // Construct payment details
      let salePayments: PaymentDetail[] = [];
      let totalPaid = 0;
      let balance = totalInSelectedCurrency;

      if (paymentCondition === 'CONTADO') {
         const methodObj = paymentMethods.find(m => m.id === selectedPaymentMethodId);
         const methodName = methodObj ? methodObj.name : 'Efectivo';
         
         salePayments = [{
            methodId: selectedPaymentMethodId,
            methodName: methodName,
            amount: totalInSelectedCurrency, // Standard paid amount is the total
            date: saleDate
         }];
         totalPaid = totalInSelectedCurrency;
         balance = 0;
      } else {
         // CRÉDITO
         salePayments = [];
         totalPaid = 0;
         balance = totalInSelectedCurrency;
      }

      // Compute change if CONTADO and receivedCash > total
      const received = parseFloat(receivedCash) || totalInSelectedCurrency;
      const change = paymentCondition === 'CONTADO' ? Math.max(0, received - totalInSelectedCurrency) : 0;

      let calculatedDueDate: string | undefined = undefined;
      if (paymentCondition === 'CRÉDITO') {
         const daysNum = parseInt(creditDays) || 15;
         const baseDate = (isRetrofechaEnabled && emissionDate) ? new Date(emissionDate + 'T12:05:00Z') : new Date();
         baseDate.setDate(baseDate.getDate() + daysNum);
         calculatedDueDate = baseDate.toISOString().split('T')[0];
      }

      // Map cart items into selected currency
      const saleItems: SaleItem[] = cart.map(item => ({
         ...item,
         price: getDisplayPrice(item.price),
         subtotal: getDisplayPrice(item.subtotal)
      }));

      // --- DISPENSADOR ATÓMICO MULTIUSUARIO ---
      const randomUuid = generateUUID(); // ID is now a random UUID!
      let internalCorr = '';
      let reservedDocNum: string | undefined = undefined;
      try {
         // 1. Correlativo Interno Obligatorio para todas las ventas
         internalCorr = await reservarSiguienteCorrelativo('CI', 'INT1');
         
         // 2. Correlativo Oficial de acuerdo al tipo de documento
         if (documentType === 'FACTURA') {
            reservedDocNum = await reservarSiguienteCorrelativo('01', 'F001');
         } else if (documentType === 'BOLETA') {
            reservedDocNum = await reservarSiguienteCorrelativo('03', 'B001');
         } else if (documentType === 'NOTA_PEDIDO') {
            reservedDocNum = await reservarSiguienteCorrelativo('NV', 'NV01');
         }
      } catch (err) {
         console.error("Error al obtener correlativos atómicos, fallback de seguridad:", err);
         internalCorr = getNextOrderNumber();
      }

      // Separación de serie y número
      let documentSeries: string | undefined = undefined;
      let documentNumber: string | undefined = undefined;
      if (reservedDocNum && reservedDocNum.includes('-')) {
         const parts = reservedDocNum.split('-');
         documentSeries = parts[0];
         documentNumber = parts[1];
      }

      const sale: Sale = {
          id: randomUuid,
          internalCorrelative: internalCorr, // Separate column and always ascending
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          items: saleItems,
          total: totalInSelectedCurrency,
          currency: saleCurrency,
          exchangeRate: saleCurrency === 'USD' ? exchangeRate : undefined,
          status: 'pendiente', 
          paymentStatus: paymentCondition === 'CONTADO' ? 'pagado' : 'pendiente',
          date: saleDate, // Emission backdate
          documentType: documentType, // BOLETA | FACTURA | NOTA_PEDIDO
          clientDocNumber: selectedCustomer.docNumber,
          netAmount: totalInSelectedCurrency / 1.18,
          taxAmount: igv,
          payments: salePayments,
          totalPaid: totalPaid,
          balance: balance,
          change: change > 0 ? change : undefined,
          scheduledDeliveryDate: saleDate,
          creditDays: paymentCondition === 'CRÉDITO' ? parseInt(creditDays) : undefined,
          dueDate: calculatedDueDate,
          notes: saleNotes,
          sunatDocumentNumber: reservedDocNum,
          documentSeries: documentSeries,
          documentNumber: documentNumber
      };

      await addSale(sale);
      
      console.group(`%c🛒 [PUNTO DE VENTA] VENTA REGISTRADA CON ÉXITO (#${sale.internalCorrelative || sale.id})`, "color: #4f46e5; font-weight: bold; font-size: 11px;");
      console.log("Comprobante:", sale.documentType);
      console.log("Número Referencia SUNAT:", sale.sunatDocumentNumber || "No aplica (Nota de Venta)");
      console.log("Cliente:", sale.customerName, `(DNI/RUC: ${sale.clientDocNumber || 'N/A'})`);
      console.log("Moneda:", sale.currency);
      console.log("Total:", sale.total.toFixed(2));
      console.log("Detalle de Items:", sale.items);
      console.log("Objeto Venta completo:", sale);
      console.groupEnd();

      // Open Post-Sale Modal immediately so the user gets real-time feedback and PDF view
      setActivePostSale(sale);
      setIsPostSaleModalOpen(true);

      // Trigger SUNAT CPE generation immediately if it's BOLETA or FACTURA
      if (sale.documentType === 'BOLETA' || sale.documentType === 'FACTURA') {
         emitCPEImmediately(sale);
      } else {
         // It's a NOTA_PEDIDO, so success message is simple
         setPostSaleSuccessMsg(`Nota de Venta #${sale.internalCorrelative || sale.id} registrada con éxito.`);
      }

      // Reset POS cart and state so it's clean and ready for the next client while the current receipt/CPE processes
      setCart([]);
      setSelectedCustomer(null);
      setIsMobileCartOpen(false);
      setIsCheckoutModalOpen(false);
      
      // Clear loaded quotation reference
      if (activeQuotationForPOS) {
        setActiveQuotationForPOS(null);
      }
      
      setDocumentType('NOTA_PEDIDO'); // Default to NOTA_PEDIDO
      setSaleCurrency('PEN'); // Default to S/
      setEmissionDate(new Date().toISOString().split('T')[0]);
      setIsRetrofechaEnabled(false);
      setCreditDays('15');
      setSaleNotes('');
  };

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartItemsCount = cart.reduce((c, i) => c + i.quantity, 0);

  // --- RENDER HELPERS ---
  const renderCustomerSelector = () => {
      const query = customerSearch.trim().toLowerCase();
      
      const normalizeText = (text: string) => {
          return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      };

      const matching = query 
        ? customers.filter(c => {
            if (c.deleted) return false;
            const normQuery = normalizeText(query);
            const normName = normalizeText(c.name || '');
            const normDoc = (c.docNumber || '').toLowerCase();
            const normPhone = (c.phone || '').toLowerCase();
            return normName.includes(normQuery) || normDoc.includes(normQuery) || normPhone.includes(normQuery);
          }).slice(0, 10)
        : [];

      return (
          <div className="customer-search-container bg-white p-4.5 rounded-2xl shadow-sm border border-slate-200/80 mb-4 animate-fade-in relative z-[60]">
               <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#51B01E] rounded-l-2xl"></div>
               <div className="flex justify-between items-center mb-3.5 pl-1">
                   <h3 className="text-[10px] font-black text-slate-505 uppercase tracking-wider flex items-center gap-1.5 select-none animate-pulse">
                       <User size={14} className="text-[#51B01E]" /> Cliente Facturado
                   </h3>
                   <button 
                       type="button"
                       onClick={() => setIsNewCustomerModalOpen(true)}
                       className="text-[9px] font-extrabold uppercase tracking-wide text-[#51B01E] bg-[#51B01E]/12 px-2.5 py-1.5 rounded-lg border border-[#51B01E]/20 hover:bg-[#51B01E] hover:text-white transition-all duration-300 flex items-center gap-1 cursor-pointer"
                   >
                       <Plus size={10} /> NUEVO CLIENTE
                   </button>
               </div>

               {selectedCustomer ? (
                   <div className="bg-slate-950/2 p-4 rounded-xl border border-slate-150 flex justify-between items-center transition-all shadow-3xs ml-1">
                       <div className="min-w-0 flex-1">
                           <span className="font-extrabold text-slate-900 text-[13px] block truncate uppercase tracking-tight">{selectedCustomer.name}</span>
                           <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] mt-1.5">
                               {selectedCustomer.docNumber && (
                                 <span className="bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-650 border border-slate-200 uppercase">
                                   {selectedCustomer.docType || 'DOC'}: {selectedCustomer.docNumber}
                                 </span>
                               )}
                               {selectedCustomer.phone && (
                                 <span className="flex items-center gap-1 font-semibold text-slate-500">
                                   <Phone size={10} className="text-[#51B01E]/70" /> {selectedCustomer.phone}
                                 </span>
                               )}
                               {selectedCustomer.address && (
                                 <span className="flex items-center gap-1 font-semibold text-slate-500 truncate max-w-[180px]">
                                   <MapPin size={10} className="text-[#DC2626]/70 flex-none" /> {selectedCustomer.address}
                                 </span>
                               )}
                           </div>
                       </div>
                       <button 
                         onClick={() => setSelectedCustomer(null)} 
                         className="text-red-500 bg-red-50/50 hover:bg-red-100/80 p-2.5 rounded-xl border border-red-200/50 transition-all cursor-pointer flex-none ml-2 active:scale-95 shadow-3xs"
                         title="Quitar cliente"
                       >
                           <Trash2 size={14}/>
                       </button>
                   </div>
               ) : (
                   <div className="relative ml-1">
                       <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         className="w-full pl-10 pr-4 py-3.5 bg-slate-950/2 hover:bg-slate-950/4 focus:bg-white border border-slate-200/80 rounded-xl text-xs font-semibold outline-none focus:ring-4 focus:ring-[#51B01E]/10 focus:border-[#51B01E] transition-all placeholder:text-slate-400"
                         placeholder="Escriba nombre, DNI, RUC o Teléfono..."
                         value={customerSearch}
                         onFocus={() => setIsCustomerFocused(true)}
                         onChange={e => setCustomerSearch(e.target.value)}
                       />
                      
                      {isCustomerFocused && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-2xl max-h-60 overflow-y-auto z-[200] rounded-xl mt-1.5 text-left animate-fade-in divide-y divide-slate-100">
                              {!query ? (
                                  <div>
                                      <div className="p-2 py-2.5 bg-slate-50/80 text-[10px] uppercase font-black text-slate-400 tracking-wider flex justify-between items-center select-none">
                                          <span>Clientes Recientes</span>
                                          <span className="text-[9px] text-slate-400 lowercase font-medium">Búsqueda rápida</span>
                                      </div>
                                      {recentCustomers.length === 0 ? (
                                          <div className="p-3.5 text-xs text-slate-400 text-center">No hay clientes recientes</div>
                                      ) : (
                                          recentCustomers.map(c => (
                                              <div 
                                                  key={c.id} 
                                                  className="p-3 hover:bg-slate-50/60 cursor-pointer text-xs transition-colors flex items-center justify-between"
                                                  onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setIsCustomerFocused(false); }}
                                              >
                                                  <div className="min-w-0 flex-1">
                                                      <div className="font-bold text-slate-700 truncate">{c.name}</div>
                                                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                                                          {c.docNumber && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-semibold">{c.docType || 'DOC'}: {c.docNumber}</span>}
                                                          {c.phone && <span>Tel: {c.phone}</span>}
                                                      </div>
                                                  </div>
                                                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                      Reciente
                                                  </div>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              ) : (
                                  <div>
                                      <div className="p-2 py-2.5 bg-slate-50/80 text-[10px] uppercase font-black text-slate-400 tracking-wider flex justify-between items-center select-none">
                                          <span>Resultados de Búsqueda</span>
                                          <span className="text-[9px] text-emerald-600 lowercase font-medium">{matching.length} encontrados</span>
                                      </div>
                                      {matching.length === 0 ? (
                                          <div className="p-3.5 text-xs text-slate-400 text-center">
                                              No se encontraron coincidencias para "<span className="font-semibold text-slate-600">{customerSearch}</span>"
                                          </div>
                                      ) : (
                                          matching.map(c => (
                                              <div 
                                                  key={c.id} 
                                                  className="p-3 hover:bg-slate-50/60 cursor-pointer text-xs transition-colors"
                                                  onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setIsCustomerFocused(false); }}
                                              >
                                                  <div className="font-bold text-slate-700">{c.name}</div>
                                                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                                                      {c.docNumber && <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-semibold">{c.docType || 'DOC'}: {c.docNumber}</span>}
                                                      {c.phone && <span>Tel: {c.phone}</span>}
                                                  </div>
                                              </div>
                                          ))
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  const renderDocumentTypeSelector = () => (
      <div className="bg-white p-4.5 rounded-2xl shadow-sm border border-slate-200/80 mb-4 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#51B01E] via-[#84CC16] to-[#DC2626]"></div>
          
          <div className="mb-3">
              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase select-none">Tipo de Comprobante</span>
              <div className="flex gap-1 bg-slate-950/5 p-1 rounded-xl border border-slate-100 mt-1">
                  <button
                      type="button"
                      onClick={() => setDocumentType('NOTA_PEDIDO')}
                      className={`flex-1 py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-300 cursor-pointer ${documentType === 'NOTA_PEDIDO' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                      NOTA DE VENTA
                  </button>
                  <button
                      type="button"
                      onClick={() => setDocumentType('FACTURA')}
                      className={`flex-1 py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-300 cursor-pointer ${documentType === 'FACTURA' ? 'bg-gradient-to-r from-[#51B01E] to-[#439618] text-white shadow-md shadow-emerald-500/10' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                      FACTURA
                  </button>
                  <button
                      type="button"
                      onClick={() => setDocumentType('BOLETA')}
                      className={`flex-1 py-1.5 text-center rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-300 cursor-pointer ${documentType === 'BOLETA' ? 'bg-gradient-to-r from-[#DC2626] to-[#C2410C] text-white shadow-md shadow-red-500/10' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                      BOLETA
                  </button>
              </div>
          </div>

          <div>
              <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase select-none">Moneda</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mt-1">
                  <button
                      type="button"
                      onClick={() => setSaleCurrency('PEN')}
                      className={`flex-1 py-1 text-center rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer ${saleCurrency === 'PEN' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                      Soles (S/)
                  </button>
                  <button
                      type="button"
                      onClick={() => setSaleCurrency('USD')}
                      className={`flex-1 py-1 text-center rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer ${saleCurrency === 'USD' ? 'bg-[#51B01E] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/50'}`}
                  >
                      Dólares (US$)
                  </button>
              </div>
              {saleCurrency === 'USD' && (
                  <p className="text-[8px] font-bold text-slate-400 text-right mt-1 font-mono">
                      tc: {exchangeRate.toFixed(2)}
                  </p>
              )}
          </div>
      </div>
  );

  const renderCartList = () => (
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 select-none">
                  <ShoppingCart size={40} className="mb-2 opacity-50" />
                  <p>El carrito está vacío</p>
              </div>
          ) : (
              cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                      <div className="flex-1 min-w-0 mr-2">
                          <div className="text-sm font-bold text-slate-800 leading-tight truncate">{item.serviceName}</div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                              {getDisplayCurrencySymbol()} {getDisplayPrice(item.price).toFixed(2)} x {item.quantity} = <span className="font-bold text-slate-700">{getDisplayCurrencySymbol()} {getDisplayPrice(item.subtotal).toFixed(2)}</span>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                <button 
                                    onClick={() => {
                                        const prod = services.find(s => s.id === item.serviceId);
                                        if (prod) updateCartItem(prod, -1);
                                    }} 
                                    className="w-7 h-7 bg-white rounded shadow-sm flex items-center justify-center text-slate-600 active:scale-90 transition-transform cursor-pointer"
                                >
                                    <Minus size={14}/>
                                </button>
                                <span className="w-6 text-center text-sm font-bold select-none">{item.quantity}</span>
                                <button 
                                    onClick={() => {
                                        const prod = services.find(s => s.id === item.serviceId);
                                        if (prod) updateCartItem(prod, 1);
                                    }} 
                                    className="w-7 h-7 bg-white rounded shadow-sm flex items-center justify-center text-blue-600 active:scale-90 transition-transform cursor-pointer"
                                >
                                    <Plus size={14}/>
                                </button>
                           </div>
                      </div>
                  </div>
              ))
          )}
      </div>
  );

  return (
      <div className="flex flex-col h-full relative">
          
          {/* --- ACTIVE QUOTATION CONVERSION ALERT BANNER --- */}
          {activeQuotationForPOS && (
            <div className="bg-[#51B01E]/10 border-2 border-[#51B01E]/20 text-slate-800 px-4 py-3.5 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6 animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-[#51B01E] text-white p-2.5 rounded-xl">
                  <FileText size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#51B01E] tracking-tight">PEDIDO DESDE COTIZACIÓN: #{activeQuotationForPOS.id}</h4>
                  <p className="text-xs font-semibold text-slate-500">Editando cantidades, agregando insumos o reduciendo precios para el despacho definitivo.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveQuotationForPOS(null);
                  setCart([]);
                  setSelectedCustomer(null);
                }}
                className="bg-[#FF1021] text-white hover:brightness-105 active:scale-95 px-4.5 py-2 rounded-xl text-xs font-bold shadow transition-all"
              >
                Limpiar Cotización
              </button>
            </div>
          )}

          {/* --- SUCCESS OVERLAY --- */}
          {showSuccess && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                  <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-slide-up max-w-sm w-full mx-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle size={48} className="text-green-600 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 text-center mb-1">¡Listo!</h3>
                      <p className="text-slate-600 font-medium text-center">El pedido fue enviado con éxito</p>
                  </div>
              </div>
          )}

          {/* --- STOCK ERROR OVERLAY --- */}
          {showError && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-fade-in">
                  <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-slide-up max-w-sm w-full mx-4 border-b-4 border-red-500">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle size={32} className="text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 text-center mb-1">{errorTitle}</h3>
                      <p className="text-slate-600 font-medium text-center text-sm">{showError}</p>
                  </div>
              </div>
          )}

          {/* --- MODAL POST-VENTA CON EMISIÓN ELECTRÓNICA INMEDIATA --- */}
          {isPostSaleModalOpen && activePostSale && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in font-sans">
                  <div className="bg-white rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-slide-up flex flex-col items-center">
                      
                      {/* Botón de cerrar, activo solo cuando no esté emitiendo a SUNAT */}
                      {!postSaleLoading && (
                          <button 
                              onClick={() => {
                                  setIsPostSaleModalOpen(false);
                                  setActivePostSale(null);
                                  setPostSaleError(null);
                                  setPostSaleSuccessMsg(null);
                              }} 
                              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer"
                              type="button"
                          >
                              <X size={20} />
                          </button>
                      )}

                      {/* Sección de Íconos según estado de emisión */}
                      {postSaleLoading ? (
                          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-5 animate-pulse border border-blue-100">
                              <Loader2 size={40} className="animate-spin" />
                          </div>
                      ) : postSaleError ? (
                          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-5 border border-red-100">
                              <AlertCircle size={40} />
                          </div>
                      ) : (
                          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-5 border border-emerald-100 shadow-sm animate-bounce">
                              <CheckCircle size={40} />
                          </div>
                      )}

                      {/* Título de Estado */}
                      <h3 className="text-xl font-bold text-slate-800 text-center uppercase tracking-tight mb-1">
                          {postSaleLoading ? 'Transmitiendo a SUNAT...' : postSaleError ? 'Fallo de Emisión' : '¡Venta Registrada!'}
                      </h3>
                      
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4 font-mono text-center bg-slate-100 px-3 py-1 rounded-xl">
                          {activePostSale.documentType === 'NOTA_PEDIDO' ? 'NOTA DE VENTA' : activePostSale.documentType}: {activePostSale.sunatDocumentNumber || `INT-${activePostSale.id}`}
                      </p>

                      {/* Recuadro de Resumen del Comprobante */}
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mb-6 text-xs space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                              <span className="text-slate-500 font-bold uppercase">Cliente:</span>
                              <span className="font-extrabold text-slate-800 max-w-[220px] truncate uppercase">{activePostSale.customerName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-bold uppercase">Total Cobrado:</span>
                              <span className="font-black text-slate-900 text-sm font-mono">{activePostSale.currency === 'USD' ? '$' : 'S/'} {activePostSale.total.toFixed(2)}</span>
                          </div>
                          
                          {/* Estado interactivo de SUNAT */}
                          <div className="border-t border-slate-200/60 pt-2.5">
                              {postSaleLoading ? (
                                  <div className="flex flex-col items-center gap-1.5 py-1 text-center font-sans">
                                      <span className="font-bold text-blue-600 animate-pulse text-xs">Comunicando con servidores de SUNAT...</span>
                                      <span className="text-[10px] text-slate-400">Creando XML y firmando con el certificado electrónico CPE</span>
                                  </div>
                              ) : postSaleError ? (
                                  <div className="bg-red-50/50 border border-red-150 rounded-xl p-3 text-red-700">
                                      <p className="font-bold text-[11px] mb-1">CPE no pudo emitirse en directo:</p>
                                      <p className="text-[10px] leading-relaxed font-mono font-medium max-h-24 overflow-y-auto">{postSaleError}</p>
                                      <p className="text-[9px] text-slate-500 mt-2 font-normal leading-normal">
                                          La venta se guardó de forma local en el historial. Puede volver a emitirla al solucionar credenciales SOL/certificado en Configuración.
                                      </p>
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center gap-2 py-1">
                                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                          <CheckCircle size={14} /> 
                                          <span>{activePostSale.documentType === 'NOTA_PEDIDO' ? 'Registrado Localmente' : 'Aceptado por SUNAT (CDR OK)'}</span>
                                      </div>
                                      {activePostSale.sunatPdfUrl && (
                                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                              <Eye size={10} /> Se ha generado el PDF con el CDR de validación
                                          </span>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Botonera de Acciones Post-Venta */}
                      <div className="w-full flex flex-col gap-2.5">
                          {activePostSale.sunatPdfUrl && (
                              <a 
                                  href={activePostSale.sunatPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full bg-gradient-to-r from-[#51B01E] to-[#439618] text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 text-center"
                              >
                                  <FileText size={16} /> Ver / Imprimir Comprobante PDF
                              </a>
                          )}
                          
                          {postSaleError && (
                              <button 
                                  type="button"
                                  disabled={postSaleLoading}
                                  onClick={() => emitCPEImmediately(activePostSale)}
                                  className="w-full bg-red-650 hover:bg-red-700 text-white py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-sans"
                              >
                                  {postSaleLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowDown size={14} />} 
                                  <span>Reintentar Emisión CPE ahora</span>
                              </button>
                          )}

                          <button 
                              type="button"
                              disabled={postSaleLoading}
                              onClick={() => {
                                  setIsPostSaleModalOpen(false);
                                  setActivePostSale(null);
                                  setPostSaleError(null);
                                  setPostSaleSuccessMsg(null);
                              }}
                              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                          >
                              {postSaleLoading ? 'Comunicando...' : 'Entendido, Nueva Venta'}
                          </button>
                      </div>

                  </div>
              </div>
          )}

          {/* --- CHECKOUT / COBRO MODAL (Requirement: Registrar Venta triggers cobrar modal) --- */}
          {isCheckoutModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-3xl w-full md:max-w-4xl p-8 md:p-10 shadow-2xl relative animate-slide-up max-h-[92vh] overflow-y-auto flex flex-col md:flex-row gap-10 font-sans">
                      <button 
                          onClick={() => setIsCheckoutModalOpen(false)} 
                          className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 cursor-pointer"
                          type="button"
                      >
                          <X size={22} />
                      </button>

                      {/* Panel Izquierdo: Resumen General de Venta */}
                      <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 pr-0 md:pr-10">
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                              <ShoppingBag className="text-[#51B01E]" size={20} /> Resumen de Venta
                          </h3>
                          <div className="bg-slate-50/75 rounded-2xl p-6 border border-slate-200 shadow-sm mb-6 text-sm space-y-4">
                              <div className="flex justify-between border-b border-slate-200/85 pb-2.5">
                                  <span className="font-extrabold text-slate-500 uppercase text-xs tracking-wider">Cliente:</span>
                                  <span className="font-bold text-slate-800 text-right max-w-[280px] truncate">{selectedCustomer?.name}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-200/85 pb-2.5">
                                  <span className="font-extrabold text-slate-500 uppercase text-xs tracking-wider">Documento:</span>
                                  <span className="font-mono font-bold text-slate-800">
                                      <span className="font-mono font-bold text-[#439618] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-150">
                                          {documentType === 'NOTA_PEDIDO' ? 'NOTA DE VENTA' : documentType} {selectedCustomer?.docNumber ? `(${selectedCustomer.docNumber})` : ''}
                                      </span>
                                  </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-200/85 pb-2.5">
                                  <span className="font-extrabold text-slate-500 uppercase text-xs tracking-wider">Moneda:</span>
                                  <span className="font-bold text-slate-850">
                                      <span className="bg-white text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 font-medium">{saleCurrency === 'USD' ? 'DÓLARES (USD)' : 'SOLES (PEN)'}</span>
                                  </span>
                              </div>
                              {saleCurrency === 'USD' && (
                                  <div className="flex justify-between border-b border-slate-200/85 pb-2.5">
                                      <span className="font-extrabold text-slate-500 uppercase text-xs tracking-wider">Tipo de Cambio:</span>
                                      <span className="font-mono font-bold text-slate-800">S/. {exchangeRate.toFixed(2)}</span>
                                  </div>
                              )}
                              <div className="space-y-2 pt-1">
                                  <span className="font-extrabold text-slate-400 uppercase tracking-wider block mb-2 text-[10px]">Detalle de Productos:</span>
                                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                      {cart.map((item, idx) => (
                                          <div key={idx} className="flex justify-between text-xs font-semibold text-slate-650">
                                              <span className="truncate max-w-[200px]">{item.serviceName} <span className="text-slate-400 font-bold font-mono">x{item.quantity}</span></span>
                                              <span className="font-mono font-black text-slate-800">{getDisplayCurrencySymbol()} {getDisplayPrice(item.subtotal).toFixed(2)}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                          
                          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-950 flex flex-col justify-center shadow-lg">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Total a Cobrar</span>
                              <span className="text-4xl font-black font-mono text-emerald-400 mt-2">
                                  {getDisplayCurrencySymbol()} {getDisplayPrice(cartTotal).toFixed(2)}
                              </span>
                              {saleCurrency === 'USD' && (
                                  <span className="text-[10px] text-slate-400 font-mono mt-1.5">
                                      Equivalente a: S/. {cartTotal.toFixed(2)} Soles
                                  </span>
                              )}
                          </div>
                      </div>

                      {/* Right side: Receipt cobro flow */}
                      <div className="flex-1 flex flex-col justify-between">
                          <div>
                              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider mb-5">
                                  Información de Pago
                              </h3>

                              {/* Payment Condition Row */}
                              <div className="mb-6">
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 md:mb-3 tracking-wider">Condición de Pago</label>
                                  <div className="grid grid-cols-2 gap-3.5">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setPaymentCondition('CONTADO');
                                              setReceivedCash(getDisplayPrice(cartTotal).toFixed(2));
                                              setInitialPayment('0');
                                          }}
                                          className={`py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border-2 flex items-center justify-center gap-3.5 ${
                                              paymentCondition === 'CONTADO' 
                                                  ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10' 
                                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-300'
                                          }`}
                                      >
                                          <Banknote size={16} /> AL CONTADO
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setPaymentCondition('CRÉDITO');
                                              setReceivedCash('0');
                                              setInitialPayment('0');
                                          }}
                                          className={`py-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border-2 flex items-center justify-center gap-3.5 ${
                                              paymentCondition === 'CRÉDITO' 
                                                  ? 'bg-[#51B01E] border-[#51B01E] text-white shadow-md shadow-emerald-600/15' 
                                                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-305'
                                          }`}
                                      >
                                          <Clock size={16} /> AL CRÉDITO
                                      </button>
                                  </div>
                              </div>

                              {paymentCondition === 'CONTADO' ? (
                                  <>
                                      {/* Payment Method Selected (for single/cash) */}
                                      <div className="mb-6">
                                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 md:mb-3 tracking-wider">Método de Pago</label>
                                          <div className="grid grid-cols-2 gap-3.5 max-h-[220px] overflow-y-auto pr-1">
                                              {paymentMethods && paymentMethods.filter(pm => pm.isActive && !pm.deleted).map(pm => {
                                                  const isSelected = selectedPaymentMethodId === pm.id;
                                                  return (
                                                      <button
                                                          key={pm.id}
                                                          type="button"
                                                          onClick={() => setSelectedPaymentMethodId(pm.id)}
                                                          className={`flex items-center gap-2.5 p-1.5 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                                                              isSelected 
                                                                  ? 'border-[#51B01E] bg-emerald-50/45 text-slate-850' 
                                                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700'
                                                          }`}
                                                      >
                                                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                              isSelected ? 'bg-[#51B01E] text-white shadow-sm' : 'bg-slate-100 text-slate-650'
                                                          }`}>
                                                              <PaymentMethodIcon pm={pm} size={28} />
                                                          </div>
                                                          <span className={`text-xs leading-tight truncate ${isSelected ? 'font-black text-[#439618]' : 'font-semibold'}`}>{pm.name}</span>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      </div>

                                      {/* Conditional Cash Fields */}
                                      <div className="mb-4 flex gap-3 animate-fade-in animate-duration-200">
                                          <div className="flex-1">
                                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider">Monto Entregado ({getDisplayCurrencySymbol()})</label>
                                              <div className="relative">
                                                  <input
                                                      type="number"
                                                      step="any"
                                                      className="w-full pl-3 pr-8 py-2 border border-slate-250 rounded-xl font-mono font-bold text-sm shadow-xs outline-none focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E] transition-all"
                                                      value={receivedCash}
                                                      onChange={e => setReceivedCash(e.target.value)}
                                                  />
                                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                                      {getDisplayCurrencySymbol()}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex-1">
                                              <span className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider">Vuelto Estimado</span>
                                              {(() => {
                                                  const isSuccess = (parseFloat(receivedCash) || 0) >= getDisplayPrice(cartTotal);
                                                  const diff = (parseFloat(receivedCash) || 0) - getDisplayPrice(cartTotal);
                                                  return (
                                                      <div className={`px-3 py-2 border rounded-xl font-mono text-sm leading-tight flex items-center justify-between h-[38px] font-bold transition-all ${
                                                          isSuccess 
                                                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700 shadow-xs' 
                                                              : 'bg-rose-50 border-rose-200 text-rose-600'
                                                      }`}>
                                                          <span>{getDisplayCurrencySymbol()} {Math.max(0, diff).toFixed(2)}</span>
                                                          {isSuccess ? (
                                                              <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                                                          ) : (
                                                              <AlertCircle size={14} className="text-rose-400 shrink-0" />
                                                          )}
                                                      </div>
                                                  );
                                              })()}
                                          </div>
                                      </div>
                                  </>
                              ) : (
                                  <>
                                      {/* Credit term selection */}
                                      <div className="mb-4 animate-fade-in animate-duration-200">
                                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Plazo de Crédito</label>
                                          <div className="relative">
                                              <select
                                                  className="w-full pl-3 pr-10 py-2 border border-slate-250 rounded-xl outline-none text-xs font-semibold appearance-none bg-white shadow-xs focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E] transition-all"
                                                  value={creditDays}
                                                  onChange={e => setCreditDays(e.target.value as any)}
                                              >
                                                  <option value="15">💡 15 Días (Medio Mes)</option>
                                                  <option value="30">📅 30 Días (Un Mes Completo)</option>
                                                  <option value="45">⏳ 45 Días (Mes y Medio)</option>
                                                  <option value="60">⌛ 60 Días (Dos Meses)</option>
                                                  <option value="90">🏛️ 90 Días (Tres Meses)</option>
                                              </select>
                                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 font-bold text-[10px]">▼</div>
                                          </div>
                                      </div>

                                      {/* Due date estimation display */}
                                      <div className="mb-4 bg-emerald-50/60 border-2 border-dashed border-emerald-110 rounded-2xl p-4 flex justify-between items-center animate-fade-in animate-duration-200">
                                          <div className="flex items-center gap-3">
                                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                  <Calendar size={18} />
                                              </div>
                                              <div>
                                                  <span className="block text-[10px] font-extrabold text-[#439618] uppercase tracking-wider leading-none mb-1">Vence el Día</span>
                                                  <span className="text-sm font-black text-[#439618] font-mono leading-none">
                                                      {(() => {
                                                          const daysNum = parseInt(creditDays) || 15;
                                                          const baseDate = (isRetrofechaEnabled && emissionDate) ? new Date(emissionDate + 'T12:05:00Z') : new Date();
                                                          baseDate.setDate(baseDate.getDate() + daysNum);
                                                          return baseDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                      })()}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className="bg-[#51B01E]/10 px-3 py-1 rounded-lg text-[10px] font-black text-[#439618] font-mono">
                                              +{creditDays} DÍAS
                                          </div>
                                      </div>
                                  </>
                              )}

                              {/* Sale Comments Note */}
                              <div className="mb-4">
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-wider">Comentarios / Observaciones</label>
                                  <textarea
                                      rows={2}
                                      placeholder="Ej. Entregar ticket a Vigilancia..."
                                      className="w-full px-3 py-2 border border-slate-250 rounded-xl text-xs outline-none shadow-xs focus:ring-2 focus:ring-slate-100 resize-none font-medium text-slate-650"
                                      value={saleNotes}
                                      onChange={e => setSaleNotes(e.target.value)}
                                  />
                              </div>
                          </div>

                          <div className="flex gap-2.5 mt-4 pt-4 border-t border-slate-100">
                              <button
                                  type="button"
                                  onClick={() => setIsCheckoutModalOpen(false)}
                                  className="px-4 py-3 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                              >
                                  CANCELAR
                              </button>
                              <button
                                  type="button"
                                  onClick={handleSaveOrder}
                                  className="flex-1 bg-gradient-to-r from-[#51B01E] to-[#439618] hover:brightness-105 active:scale-98 text-white py-3 rounded-xl text-xs font-black tracking-wider uppercase shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                  <CheckCircle size={16} /> COBRAR Y GENERAR VENTA
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- NEW CUSTOMER MODAL --- */}
          {isNewCustomerModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
                  <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative my-8 animate-slide-up max-h-[90vh] overflow-y-auto">
                      <button 
                          onClick={() => setIsNewCustomerModalOpen(false)} 
                          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                          type="button"
                      >
                          <X size={20} />
                      </button>

                      <div className="mb-4">
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                              <User className="text-[#51B01E]" size={22} /> Nuevo Cliente
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">Registra un nuevo cliente para esta venta.</p>
                      </div>

                      <form onSubmit={handleCreateCustomer} className="space-y-4">
                          {/* Tipo de Documento */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de Documento</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {['DNI', 'RUC', 'SIN_DOCUMENTO'].map((doc) => (
                                      <button
                                          key={doc}
                                          type="button"
                                          onClick={() => {
                                              setNewCustomerForm(prev => ({ 
                                                  ...prev, 
                                                  docType: doc as any,
                                                  docNumber: doc === 'SIN_DOCUMENTO' ? '' : prev.docNumber
                                              }));
                                              setSearchClientError(null);
                                          }}
                                          className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center uppercase tracking-wide cursor-pointer ${
                                              newCustomerForm.docType === doc 
                                              ? 'bg-[#51B01E]/10 border-[#51B01E] text-[#51B01E]' 
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                          }`}
                                      >
                                          {doc === 'SIN_DOCUMENTO' ? 'No Documento' : doc}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          {/* Número de Documento (if DNI or RUC) */}
                          {newCustomerForm.docType !== 'SIN_DOCUMENTO' && (
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Número de Documento</label>
                                  <div className="flex gap-2">
                                      <input
                                          type="tel"
                                          maxLength={newCustomerForm.docType === 'RUC' ? 11 : 8}
                                          required
                                          placeholder={`Ingresar ${newCustomerForm.docType}`}
                                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none font-mono text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                          value={newCustomerForm.docNumber}
                                          onChange={e => {
                                              setNewCustomerForm(prev => ({ ...prev, docNumber: e.target.value.replace(/\D/g, '') }));
                                              setSearchClientError(null);
                                          }}
                                          onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  handleQueryDecolecta();
                                              }
                                          }}
                                      />
                                      <button 
                                          type="button"
                                          onClick={handleQueryDecolecta}
                                          disabled={isSearchingClient}
                                          className="px-4 bg-[#51B01E] hover:brightness-105 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
                                      >
                                          {isSearchingClient ? (
                                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                          ) : 'Buscar'}
                                      </button>
                                  </div>
                                  {searchClientError && (
                                      <p className="text-red-500 text-xs font-extrabold mt-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 animate-pulse">{searchClientError}</p>
                                  )}
                              </div>
                          )}

                          {/* Nombre o Razón Social */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Razón Social o Nombre Completo</label>
                              <input
                                  type="text"
                                  required
                                  placeholder="Ej. Químicos López S.A.C. o Juan Pérez"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E] uppercase font-bold"
                                  value={newCustomerForm.name}
                                  onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                              />
                              
                              {/* Etiquetas de Estado SUNAT */}
                              {(newCustomerForm.sunatStatus || newCustomerForm.sunatCondition) && (
                                  <div className="flex gap-1.5 mt-1.5">
                                      {newCustomerForm.sunatStatus && (
                                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${
                                              newCustomerForm.sunatStatus.toUpperCase() === 'ACTIVO'
                                              ? 'bg-[#51B01E]/10 text-[#51B01E] border-[#51B01E]/20'
                                              : 'bg-red-50 text-red-600 border-red-200'
                                          }`}>
                                              SUNAT: {newCustomerForm.sunatStatus}
                                          </span>
                                      )}
                                      {newCustomerForm.sunatCondition && (
                                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${
                                              newCustomerForm.sunatCondition.toUpperCase() === 'HABIDO'
                                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                                              : 'bg-amber-50 text-amber-600 border-amber-200'
                                          }`}>
                                              Condición: {newCustomerForm.sunatCondition}
                                          </span>
                                      )}
                                  </div>
                              )}
                          </div>

                          {/* Teléfono y Email en una sola línea */}
                          <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Teléfono o Celular</label>
                                  <input
                                      type="tel"
                                      placeholder="Ej. 999555111"
                                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                      value={newCustomerForm.phone}
                                      onChange={e => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Correo Electrónico</label>
                                  <input
                                      type="email"
                                      placeholder="Ej. cliente@correo.com"
                                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                      value={newCustomerForm.email}
                                      onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                  />
                              </div>
                          </div>

                          {/* Dirección */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dirección de Despacho</label>
                              <input
                                  type="text"
                                  placeholder="Ej. Av. Los Próceres 123, Ate"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                  value={newCustomerForm.address}
                                  onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                              />
                          </div>

                          {/* Zona de Despacho */}
                          <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Zona de Despacho</label>
                              <select 
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                  value={newCustomerForm.zone}
                                  onChange={e => setNewCustomerForm(prev => ({ ...prev, zone: e.target.value }))}
                              >
                                  {zones.map((z: string) => (
                                      <option key={z} value={z}>{z}</option>
                                  ))}
                              </select>
                          </div>

                          {/* Distrito, Provincia, Departamento, UBIGEO (Grouped for address detail) */}
                          <div className="grid grid-cols-4 gap-2">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Distrito</label>
                                  <input
                                      type="text"
                                      placeholder="Ej. Ate"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl outline-none text-xs shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                      value={newCustomerForm.district}
                                      onChange={e => setNewCustomerForm(prev => ({ ...prev, district: e.target.value }))}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Provincia</label>
                                  <input
                                      type="text"
                                      placeholder="Ej. Lima"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl outline-none text-xs shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                      value={newCustomerForm.province}
                                      onChange={e => setNewCustomerForm(prev => ({ ...prev, province: e.target.value }))}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Departamento</label>
                                  <input
                                      type="text"
                                      placeholder="Ej. Lima"
                                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl outline-none text-xs shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E]"
                                      value={newCustomerForm.department}
                                      onChange={e => setNewCustomerForm(prev => ({ ...prev, department: e.target.value }))}
                                   />
                               </div>
                               <div>
                                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">UBIGEO</label>
                                   <input
                                       type="text"
                                       placeholder="Ej. 150117"
                                       maxLength={6}
                                       className="w-full px-2 py-1.5 border border-slate-200 rounded-xl outline-none text-xs shadow-sm focus:ring-2 focus:ring-[#51B01E]/20 focus:border-[#51B01E] font-mono font-bold"
                                       value={newCustomerForm.ubigeo}
                                       onChange={e => setNewCustomerForm(prev => ({ ...prev, ubigeo: e.target.value.replace(/\D/g, '') }))}
                                  />
                              </div>
                          </div>

                          {/* Submit and Cancel Buttons */}
                          <div className="flex gap-2 pt-2">
                              <button 
                                  type="button" 
                                  onClick={() => setIsNewCustomerModalOpen(false)}
                                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-600 transition-all cursor-pointer"
                              >
                                  Cancelar
                              </button>
                              <button 
                                  type="submit"
                                  className="flex-1 py-2.5 rounded-xl bg-[#51B01E] hover:brightness-105 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                              >
                                  Guardar y Asignar
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {/* --- DESKTOP LAYOUT (Hidden on mobile) --- */}
          <div className="hidden lg:flex h-full gap-6">
              {/* Products Column */}
              <div className="flex-1 flex flex-col gap-4">
                  
                  <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                          <input 
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 ring-blue-100 text-sm"
                            placeholder="Buscar productos o escanee código de barras..."
                            value={searchTerm}
                            onKeyDown={handleSearchKeyDown}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-2 items-center text-xs font-bold text-slate-600 bg-emerald-50/80 px-3.5 py-3 rounded-xl border border-emerald-150 shadow-3xs cursor-help select-none" title="Lector de código de barras activo. Escanee el producto en cualquier momento sin necesidad de enfocar campos.">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Escanear Producto Activo</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-none select-none">
                          <button
                              type="button"
                              onClick={() => setViewMode('grid')}
                              className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#51B01E] font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                              title="Vista de Tarjetas / Cards"
                          >
                              <LayoutGrid size={18} />
                          </button>
                          <button
                              type="button"
                              onClick={() => setViewMode('list')}
                              className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-sm text-[#51B01E] font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                              title="Vista de Lista"
                          >
                              <List size={18} />
                          </button>
                      </div>
                  </div>

                  {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-2">
                          {filteredProducts.map(prod => {
                              const inCart = getCartItem(prod.id);
                              // Determine if stock is low or out
                              const isOutOfStock = prod.trackStock && (prod.stock || 0) <= 0;
                              
                              return (
                                  <div 
                                      key={prod.id} 
                                      onClick={() => !isOutOfStock && updateCartItem(prod, 1)}
                                      className={`bg-white p-4.5 rounded-2xl border border-slate-200/85 hover:border-[#51B01E]/40 hover:bg-slate-50/40 hover:shadow-lg cursor-pointer transition-all duration-300 flex flex-col justify-between h-40 select-none relative overflow-hidden ${isOutOfStock ? 'opacity-60 bg-slate-100/30 cursor-not-allowed' : ''}`}
                                  >
                                      {/* Branded Left Accent Strip */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${isOutOfStock ? 'bg-red-500' : 'bg-[#51B01E]'}`}></div>
                                      <div>
                                          <div className="font-extrabold text-slate-900 text-[14px] leading-tight mb-1">{prod.name}</div>
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {prod.internalCode || 'S/C'}</div>
                                      </div>
                                      
                                      <div className="flex justify-between items-end">
                                          <div>
                                              <div className="font-black text-lg text-slate-900">{getDisplayCurrencySymbol()} {getDisplayPrice(prod.price).toFixed(2)}</div>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider inline-block mt-1.5 ${isOutOfStock ? 'bg-red-100 text-red-650' : 'bg-[#51B01E]/10 text-[#51B01E]'}`}>
                                                  Stock: {prod.stock} {prod.unit}
                                              </span>
                                          </div>
                                          
                                          {inCart ? (
                                               <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-3xs" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, -1); }} className="w-8 h-8 bg-white rounded shadow text-slate-600 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"><Minus size={16}/></button>
                                                    <span className="font-bold w-6 text-center">{inCart.quantity}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, 1); }} className="w-8 h-8 bg-white rounded shadow text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors cursor-pointer"><Plus size={16}/></button>
                                               </div>
                                          ) : (
                                               <button 
                                                  onClick={(e) => { e.stopPropagation(); !isOutOfStock && updateCartItem(prod, 1); }} 
                                                  disabled={isOutOfStock}
                                                  className={`${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : themeColors.primary} text-white p-2 rounded-lg shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
                                               >
                                                   <Plus size={20} />
                                               </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="space-y-2.5 overflow-y-auto pr-2 pb-2">
                          {filteredProducts.map(prod => {
                              const inCart = getCartItem(prod.id);
                              const isOutOfStock = prod.trackStock && (prod.stock || 0) <= 0;
                              
                              return (
                                  <div 
                                      key={prod.id} 
                                      onClick={() => !isOutOfStock && updateCartItem(prod, 1)}
                                      className={`bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-4 select-none ${isOutOfStock ? 'opacity-70 cursor-not-allowed' : ''}`}
                                  >
                                      <div className="min-w-0 flex-1 flex items-center gap-3">
                                          <div className="bg-[#51B01E]/10 text-[#51B01E] p-2.5 rounded-xl flex-none">
                                              <Package size={20} />
                                          </div>
                                          <div className="min-w-0">
                                              <span className="font-bold text-slate-800 text-base block truncate leading-snug">{prod.name}</span>
                                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                  <span>Cod: {prod.internalCode || '-'}</span>
                                                  <span>•</span>
                                                  <span className={`font-semibold ${isOutOfStock ? 'text-red-500' : 'text-slate-600'}`}>
                                                      Stock: {prod.stock} {prod.unit}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex items-center gap-6 flex-none">
                                          <div className="text-right">
                                              <div className={`font-black text-lg ${themeColors.text}`}>{getDisplayCurrencySymbol()} {getDisplayPrice(prod.price).toFixed(2)}</div>
                                              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">P. Unit.</span>
                                          </div>

                                          <div className="w-32 flex justify-end">
                                              {inCart ? (
                                                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200" onClick={(e) => e.stopPropagation()}>
                                                      <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, -1); }} className="w-8 h-8 bg-white rounded shadow text-slate-600 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"><Minus size={14}/></button>
                                                      <span className="font-bold w-6 text-center text-sm">{inCart.quantity}</span>
                                                      <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, 1); }} className="w-8 h-8 bg-white rounded shadow text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors cursor-pointer"><Plus size={14}/></button>
                                                  </div>
                                              ) : (
                                                  <button 
                                                      onClick={(e) => { e.stopPropagation(); !isOutOfStock && updateCartItem(prod, 1); }} 
                                                      disabled={isOutOfStock}
                                                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : themeColors.primary}`}
                                                  >
                                                      <Plus size={14} /> Agregar
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>

              {/* Desktop Cart Column */}
              <div className="w-96 bg-white rounded-[24px] shadow-2xl shadow-slate-200/50 border border-slate-250 flex flex-col h-full relative z-30">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl relative z-40">
                       {renderDocumentTypeSelector()}
                       {renderCustomerSelector()}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 relative z-10">
                       {renderCartList()}
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] col-span-1">
                      
                      {/* --- ELECTRONIC INVOICING / BACKDATE SETUP (Requirement 1) --- */}
                      {selectedCustomer && cart.length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-xs space-y-2.5 animate-fade-in shadow-xs">

                            <div className="flex justify-between items-center bg-white p-1 rounded border border-slate-200">
                                <span className="font-extrabold text-slate-500 uppercase text-[9px] pl-1">Fecha Emisión (Retrofecha)</span>
                                <input 
                                    type="date"
                                    className="border-0 bg-transparent rounded px-1.5 py-0.5 font-bold text-slate-700 text-xs outline-none"
                                    value={emissionDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={e => {
                                        setEmissionDate(e.target.value);
                                        setIsRetrofechaEnabled(true);
                                    }}
                                />
                            </div>
                            
                            {isRetrofechaEnabled && (
                                <div className="text-[10px] text-[#FF1021] font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg leading-snug">
                                    ✓ Retrofecha habilitada: El pedido se registrará con fecha {new Date(emissionDate + 'T12:00:00Z').toLocaleDateString()} para calzar con el cierre mensual.
                                </div>
                            )}
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-4.5 bg-slate-950/2 px-4 py-3.5 rounded-2xl border border-slate-150 shadow-inner">
                          <span className="text-slate-500 text-[11px] font-black tracking-widest uppercase">TOTAL A PAGAR</span>
                          <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">{getDisplayCurrencySymbol()} {getDisplayPrice(cartTotal).toFixed(2)}</span>
                      </div>
                      <button 
                        disabled={!selectedCustomer || cart.length === 0}
                        onClick={handleOpenCheckout}
                        className={`w-full py-[21px] rounded-2xl font-black text-sm tracking-wider uppercase text-white shadow-xl flex items-center justify-center gap-2.5 transition-all duration-300 ${
                            !selectedCustomer || cart.length === 0 
                            ? 'bg-slate-250 border border-slate-300/50 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'bg-gradient-to-r from-[#51B01E] to-[#439618] hover:brightness-[1.08] active:scale-[0.98] cursor-pointer'
                        }`}
                      >
                          <Save size={18} /> Registrar Venta
                      </button>
                  </div>
              </div>
          </div>

          {/* --- MOBILE LAYOUT (Visible only on mobile) --- */}
          <div className="lg:hidden flex flex-col h-full">
              {/* Mobile Search Header */}
              <div className="flex-none pb-4 sticky top-0 bg-slate-50 z-10 flex gap-2 w-full items-center text-left">
                   <div className="relative flex-1 shadow-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <input 
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 ring-blue-500 shadow-sm text-sm"
                        placeholder="Buscar o escanee código..."
                        value={searchTerm}
                        onKeyDown={handleSearchKeyDown}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 flex-none h-[42px] select-none">
                      <button
                          type="button"
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#51B01E]' : 'text-slate-500'}`}
                      >
                          <LayoutGrid size={16} />
                      </button>
                      <button
                          type="button"
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#51B01E]' : 'text-slate-500'}`}
                      >
                          <List size={16} />
                      </button>
                  </div>
              </div>

              {/* Mobile Product Grid */}
              <div className="flex-1 overflow-y-auto pb-24 text-left">
                  {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredProducts.map(prod => {
                              const inCart = getCartItem(prod.id);
                              const isOutOfStock = prod.trackStock && (prod.stock || 0) <= 0;

                              return (
                                  <div 
                                      key={prod.id} 
                                      onClick={() => !isOutOfStock && updateCartItem(prod, 1)}
                                      className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 active:bg-slate-50 cursor-pointer select-none ${isOutOfStock ? 'opacity-75 cursor-not-allowed' : ''}`}
                                  >
                                      <div className="flex-1 min-w-0">
                                          <div className="font-bold text-slate-800 text-sm truncate mb-0.5">{prod.name}</div>
                                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                              <span className={`px-1.5 py-0.5 rounded ${isOutOfStock ? 'bg-red-100 text-red-600 font-bold' : 'bg-slate-100'}`}>Stock: {prod.stock}</span>
                                              {prod.internalCode && <span className="truncate">#{prod.internalCode}</span>}
                                          </div>
                                          <div className={`font-bold text-lg ${themeColors.text}`}>{getDisplayCurrencySymbol()} {getDisplayPrice(prod.price).toFixed(2)}</div>
                                      </div>
                                      
                                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                          {inCart ? (
                                               <div className="flex flex-col items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100 shadow-3xs">
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, 1); }} className="w-8 h-8 bg-white border border-slate-200 rounded shadow-sm text-blue-600 flex items-center justify-center active:bg-blue-50 cursor-pointer"><Plus size={16}/></button>
                                                    <span className="font-bold text-sm h-5 flex items-center">{inCart.quantity}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, -1); }} className="w-8 h-8 bg-white border border-slate-200 rounded shadow-sm text-slate-500 flex items-center justify-center active:bg-red-50 active:text-red-500 cursor-pointer"><Minus size={16}/></button>
                                               </div>
                                          ) : (
                                               <button 
                                                  onClick={(e) => { e.stopPropagation(); !isOutOfStock && updateCartItem(prod, 1); }} 
                                                  disabled={isOutOfStock}
                                                  className={`${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : themeColors.primary} text-white w-10 h-10 rounded-xl shadow-md flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                                               >
                                                   <Plus size={24} />
                                               </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="space-y-2.5">
                          {filteredProducts.map(prod => {
                              const inCart = getCartItem(prod.id);
                              const isOutOfStock = prod.trackStock && (prod.stock || 0) <= 0;

                              return (
                                  <div 
                                      key={prod.id} 
                                      onClick={() => !isOutOfStock && updateCartItem(prod, 1)}
                                      className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 active:bg-slate-50 cursor-pointer select-none ${isOutOfStock ? 'opacity-75 cursor-not-allowed' : ''}`}
                                  >
                                      <div className="flex-1 min-w-0 flex items-center gap-2.5">
                                          <div className="bg-[#51B01E]/10 text-[#51B01E] p-2 rounded-lg flex-none">
                                              <Package size={16} />
                                          </div>
                                          <div className="min-w-0">
                                              <div className="font-bold text-slate-800 text-sm truncate leading-snug">{prod.name}</div>
                                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                                  <span>Cod: {prod.internalCode || '-'}</span>
                                                  <span>•</span>
                                                  <span className={isOutOfStock ? 'text-red-500 font-bold' : ''}>Stock: {prod.stock}</span>
                                              </div>
                                              <span className={`font-bold text-base block mt-0.5 ${themeColors.text}`}>{getDisplayCurrencySymbol()} {getDisplayPrice(prod.price).toFixed(2)}</span>
                                          </div>
                                      </div>
                                      
                                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                          {inCart ? (
                                               <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-150 font-sans shadow-3xs">
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, -1); }} className="w-7 h-7 bg-white border border-slate-200 rounded shadow-xs text-slate-500 flex items-center justify-center active:bg-red-50 cursor-pointer"><Minus size={12}/></button>
                                                    <span className="font-bold text-xs w-5 text-center">{inCart.quantity}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); updateCartItem(prod, 1); }} className="w-7 h-7 bg-white border border-slate-200 rounded shadow-xs text-blue-600 flex items-center justify-center active:bg-blue-50 cursor-pointer"><Plus size={12}/></button>
                                               </div>
                                          ) : (
                                               <button 
                                                  onClick={(e) => { e.stopPropagation(); !isOutOfStock && updateCartItem(prod, 1); }} 
                                                  disabled={isOutOfStock}
                                                  className={`${isOutOfStock ? 'bg-slate-300 cursor-not-allowed' : themeColors.primary} text-white w-9 h-9 rounded-xl shadow flex items-center justify-center active:scale-95 transition-transform cursor-pointer`}
                                               >
                                                   <Plus size={18} />
                                               </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>

              {/* Mobile Bottom Bar (Floating) */}
              {cartItemsCount > 0 && (
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20 pb-safe">
                      <button 
                          onClick={() => setIsMobileCartOpen(true)}
                          className={`${themeColors.primary} text-white w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-between px-6 active:scale-95 transition-transform`}
                      >
                          <div className="flex items-center gap-2">
                              <div className="bg-white/20 px-2 py-0.5 rounded text-sm font-bold">{cartItemsCount} Items</div>
                          </div>
                          <span className="text-lg">Ver Carrito</span>
                          <span className="text-xl font-black font-mono">{getDisplayCurrencySymbol()} {getDisplayPrice(cartTotal).toFixed(2)}</span>
                      </button>
                  </div>
              )}

              {/* Mobile Full Screen Cart Overlay */}
              {isMobileCartOpen && (
                  <div className="fixed inset-0 bg-slate-50 z-30 flex flex-col animate-slide-up">
                      <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between shadow-sm flex-none">
                          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                              <ShoppingBag className={themeColors.text} /> Tu Pedido
                          </h2>
                          <button onClick={() => setIsMobileCartOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                              <ChevronUp size={24} className="transform rotate-180" />
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {renderDocumentTypeSelector()}
                          {renderCustomerSelector()}
                          
                          <div>
                              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 ml-1">Items ({cartItemsCount})</h3>
                              {renderCartList()}
                          </div>
                      </div>

                      <div className="p-4 bg-white border-t border-slate-200 flex-none pb-safe">
                          
                          {/* --- MOBILE RETROFECHA CONTROL (Requirement 1) --- */}
                          {selectedCustomer && cart.length > 0 && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3 text-xs space-y-2 animate-fade-in font-sans">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase">Fecha (Retrofecha):</span>
                                    <input 
                                        type="date"
                                        className="border border-slate-200 rounded p-1 font-bold text-slate-700 text-xs bg-white"
                                        value={emissionDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={e => {
                                            setEmissionDate(e.target.value);
                                            setIsRetrofechaEnabled(true);
                                        }}
                                    />
                                </div>
                            </div>
                          )}

                          <div className="flex justify-between items-end mb-4">
                              <span className="text-slate-500 text-sm">Total a Pagar</span>
                              <span className="text-3xl font-black text-slate-800 leading-none font-mono">{getDisplayCurrencySymbol()} {getDisplayPrice(cartTotal).toFixed(2)}</span>
                          </div>
                          <button 
                              disabled={!selectedCustomer || cart.length === 0}
                              onClick={handleOpenCheckout}
                              className={`w-full py-5 rounded-2xl font-black text-white shadow-xl text-lg flex items-center justify-center gap-2.5 transition-all duration-300 ${!selectedCustomer || cart.length === 0 ? 'bg-slate-300' : 'bg-gradient-to-r from-[#51B01E] to-[#439618] hover:brightness-[1.08] active:scale-[0.98]'}`}
                          >
                              <Save size={20} /> Registrar Venta
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};
