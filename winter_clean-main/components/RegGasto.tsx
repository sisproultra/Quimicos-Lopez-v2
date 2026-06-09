import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '../App';
import { Expense, PaymentMethod } from '../types';
import { MinusCircle, DollarSign, Clock, Calendar, CheckCircle, X, Camera, Trash2, Wallet, RefreshCw, Smartphone, Banknote, QrCode as QrIcon, CreditCard } from 'lucide-react';

export const RegGasto: React.FC = () => {
    const { addExpense, themeStyles, currency, currentUser, paymentMethods, expenseCategories } = useContext(AppContext);
    
    // Active payment methods
    const activePaymentMethods = useMemo(() => paymentMethods.filter(pm => pm.isActive && !pm.deleted), [paymentMethods]);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMethodId, setSelectedMethodId] = useState(activePaymentMethods.find(pm => pm.name.toLowerCase() === 'efectivo')?.id || activePaymentMethods[0]?.id || '');
    const [photos, setPhotos] = useState<string[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    // Camera States
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const remainingSlots = 3 - photos.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotos(prev => [...prev, reader.result as string].slice(0, 3));
            };
            reader.readAsDataURL(file);
        });
    };

    const startCamera = async () => {
        if (photos.length >= 3) return;
        setIsCameraOpen(true);
        try {
            const s = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            console.error("Camera access error:", err);
            alert("No se pudo acceder a la cámara. Verifique los permisos.");
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    const takePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setPhotos(prev => [...prev, dataUrl].slice(0, 3));
                stopCamera();
            }
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amount);
        if (!amt || !description) return;

        const category = expenseCategories.find(c => c.name.toLowerCase().includes('ruta') || c.name.toLowerCase().includes('transporte')) || expenseCategories[0];
        
        const newExpense: Expense = {
            id: `RUT-${Date.now()}`,
            description: description,
            amount: amt,
            categoryId: category.id,
            category: category.name,
            type: 'VARIABLE',
            date: new Date().toISOString(),
            paymentMethodId: selectedMethodId,
            staffId: currentUser?.id,
            staffName: currentUser?.firstName,
            status: 'por_validar',
            deleted: false,
            photos: photos
        };

        addExpense(newExpense);
        
        setAmount('');
        setDescription('');
        setSelectedMethodId(activePaymentMethods.find(pm => pm.name.toLowerCase() === 'efectivo')?.id || activePaymentMethods[0]?.id || '');
        setPhotos([]);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [stream]);

    const PaymentMethodIcon = ({ pm, size = 18 }: { pm: PaymentMethod, size?: number }) => {
        if (pm.imageIcon) {
          return <img src={pm.imageIcon} className="rounded-md object-contain" style={{ width: size, height: size }} alt="" />;
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
        <div className="max-w-md mx-auto space-y-6 animate-fade-in p-4 lg:p-0">
            <div className="text-center space-y-2">
                <div className="bg-red-50 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <MinusCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Registro de Gasto</h2>
                <p className="text-slate-500 text-sm">Registra gastos de ruta con evidencia fotográfica.</p>
            </div>

            {showSuccess && (
                <div className="bg-green-100 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-bounce">
                    <CheckCircle size={24} />
                    <span className="font-bold">Gasto registrado. Espere validación.</span>
                </div>
            )}

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase mb-2 ml-1">Monto del Gasto</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">{currency}</span>
                            <input 
                                type="number" 
                                step="0.01"
                                required
                                autoFocus
                                className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-3xl text-slate-800 outline-none focus:border-red-500 transition-all shadow-inner"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase mb-2 ml-1">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-2">
                            {activePaymentMethods.map(pm => (
                                <button 
                                    key={pm.id}
                                    type="button"
                                    onClick={() => setSelectedMethodId(pm.id)}
                                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center gap-2 transition-all ${selectedMethodId === pm.id ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                >
                                    <PaymentMethodIcon pm={pm} size={16} />
                                    {pm.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase mb-2 ml-1">¿En qué se gastó?</label>
                        <textarea 
                            required
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold outline-none focus:border-red-500 transition-all resize-none h-24 shadow-inner"
                            placeholder="Ej: Reparación de llanta, peaje..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Photo Capture/Upload Section */}
                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase mb-2 ml-1 flex justify-between">
                            Evidencia Fotográfica
                            <span className="text-[10px] text-slate-400 font-bold">{photos.length}/3</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo, index) => (
                                <div key={index} className="aspect-square rounded-xl bg-slate-100 relative overflow-hidden group border border-slate-200">
                                    <img src={photo} className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removePhoto(index)}
                                        className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-lg shadow-md"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {photos.length < 3 && (
                                <div className="flex flex-col gap-1">
                                    <button 
                                        type="button"
                                        onClick={startCamera}
                                        className="aspect-square rounded-xl bg-red-50 border-2 border-dashed border-red-200 flex flex-col items-center justify-center cursor-pointer hover:border-red-500 hover:bg-red-100 transition-all text-red-600"
                                    >
                                        <Camera size={24} />
                                        <span className="text-[8px] font-black uppercase mt-1">Cámara</span>
                                    </button>
                                    <label className="h-6 bg-slate-100 rounded-lg flex items-center justify-center cursor-pointer border border-slate-200">
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Galería</span>
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase"
                    >
                        <MinusCircle size={24} /> Registrar Gasto
                    </button>
                </form>
            </div>

            {/* Live Camera Interface Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-fade-in">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={stopCamera} className="p-3 bg-white/20 text-white rounded-full backdrop-blur-md">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="relative w-full h-full flex flex-col">
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                        
                        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                            <div className="w-12 h-12"></div> {/* Spacer */}
                            <button 
                                type="button"
                                onClick={takePhoto}
                                className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center active:scale-90 transition-transform"
                            >
                                <div className="w-14 h-14 bg-red-600 rounded-full"></div>
                            </button>
                            <button 
                                type="button"
                                onClick={async () => {
                                    stopCamera();
                                    const nextMode = stream?.getTracks()[0].getSettings().facingMode === 'user' ? 'environment' : 'user';
                                    try {
                                        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextMode } });
                                        setStream(s);
                                        setIsCameraOpen(true);
                                        if (videoRef.current) videoRef.current.srcObject = s;
                                    } catch(e) {}
                                }}
                                className="p-3 bg-white/20 text-white rounded-full backdrop-blur-md"
                            >
                                <RefreshCw size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
                Registrado por: {currentUser?.firstName || 'Usuario Autorizado'}
            </p>
        </div>
    );
};
