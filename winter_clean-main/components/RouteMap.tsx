import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../App';
import L from 'leaflet';
import 'leaflet-rotate';
import { Navigation, Truck, Package, Clock, Compass, X, Layers, Map as MapIcon, Phone, MessageCircle, LocateFixed, Zap } from 'lucide-react';

export const RouteMap: React.FC = () => {
    const { sales, pickupRequests, customers } = useContext(AppContext);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const routeLayer = useRef<L.Polyline | null>(null);
    const routeCoreLayer = useRef<L.Polyline | null>(null);
    const userMarker = useRef<L.Marker | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    
    const [userPos, setUserPos] = useState<[number, number] | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<{id: string, name: string, type: 'delivery' | 'pickup', lat: number, lng: number} | null>(null);
    const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string} | null>(null);
    const [isSatellite, setIsSatellite] = useState(false);

    // Centro de Lima como respaldo inicial
    const LIMA_CENTER: [number, number] = [-12.046374, -77.042793];

    // Icono de Ubicación con imagen y efecto de flotación (arriba-abajo)
    const userLocationIcon = L.divIcon({
        html: `<img src="https://iili.io/fO6HV6v.png" class="floating-vehicle" style="width: 65px; height: 65px; display: block;" />`,
        className: 'user-location-marker',
        iconSize: [65, 65],
        iconAnchor: [32, 60]
    });

    const deliveryPoints = sales.filter(s => s.status === 'en_ruta' && !s.deleted).map(s => {
        const customer = customers.find(c => c.id === s.customerId);
        return {
            id: s.id,
            name: s.customerName,
            type: 'delivery' as const,
            lat: customer?.gpsLocation?.lat || (LIMA_CENTER[0] + (Math.random() - 0.5) * 0.05),
            lng: customer?.gpsLocation?.lng || (LIMA_CENTER[1] + (Math.random() - 0.5) * 0.05)
        };
    });

    const pickupPoints = pickupRequests.filter(p => p.status === 'pending' && !p.deleted).map(p => ({
        id: p.id,
        name: p.clientName,
        type: 'pickup' as const,
        lat: LIMA_CENTER[0] + (Math.random() - 0.5) * 0.08,
        lng: LIMA_CENTER[1] + (Math.random() - 0.5) * 0.08,
    }));

    const allPoints = [...deliveryPoints, ...pickupPoints];

    const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const newPos: [number, number] = [lat, lng];
                
                setUserPos(newPos);
                
                if (userMarker.current) {
                    userMarker.current.setLatLng(newPos);
                } else if (mapInstance.current) {
                    userMarker.current = L.marker(newPos, {
                        icon: userLocationIcon,
                        zIndexOffset: 1000
                    }).addTo(mapInstance.current);
                }
            },
            () => {
                if (!userPos) {
                    setUserPos(LIMA_CENTER);
                }
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    useEffect(() => {
        if (!mapInstance.current) return;
        if (tileLayerRef.current) mapInstance.current.removeLayer(tileLayerRef.current);
        const url = isSatellite 
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        tileLayerRef.current = L.tileLayer(url).addTo(mapInstance.current);
    }, [isSatellite]);

    useEffect(() => {
        if (!mapRef.current) return;
        
        // Se inicializa el mapa con soporte para rotación táctica
        mapInstance.current = (L as any).map(mapRef.current, { 
            zoomControl: false, 
            attributionControl: false,
            rotate: true,
            touchRotate: true,
            rotateControl: false,
            bearing: 0
        }).setView(LIMA_CENTER, 14);

        const createMarkerIcon = (color: string, isDelivery: boolean) => L.divIcon({
            html: `<div class="${color} p-1 rounded-full border border-white shadow-md text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    ${isDelivery ? '<path d="M10 17h4V5H2v12h3m15 0h2v-3.34a2 2 0 0 0-.73-1.5l-3.27-2.73a2 2 0 0 0-1.27-.43H14m6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>' : '<path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>'}
                </svg>
            </div>`,
            className: '', iconSize: [20, 20], iconAnchor: [10, 10]
        });

        allPoints.forEach(p => {
            const m = L.marker([p.lat, p.lng], { 
                icon: createMarkerIcon(p.type === 'delivery' ? 'bg-green-600' : 'bg-orange-500', p.type === 'delivery') 
            }).addTo(mapInstance.current!);
            m.on('click', () => setSelectedTarget(p));
        });

        updateLocation();
        const interval = setInterval(updateLocation, 10000);
        return () => { clearInterval(interval); mapInstance.current?.remove(); };
    }, []);

    useEffect(() => {
        if (!userPos || allPoints.length === 0 || !mapInstance.current) return;

        const calculateRoute = async () => {
            try {
                const sortedPoints = [...allPoints].sort((a, b) => {
                    const distA = Math.hypot(a.lat - userPos[0], a.lng - userPos[1]);
                    const distB = Math.hypot(b.lat - userPos[0], b.lng - userPos[1]);
                    return distA - distB;
                });

                const coords = [`${userPos[1]},${userPos[0]}`, ...sortedPoints.map(p => `${p.lng},${p.lat}`)].join(';');
                const resp = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
                const data = await resp.json();
                
                if (data.routes?.[0]) {
                    const polyCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                    if (routeLayer.current) routeLayer.current.remove();
                    if (routeCoreLayer.current) routeCoreLayer.current.remove();

                    routeLayer.current = L.polyline(polyCoords, { color: '#00ffff', weight: 6, opacity: 0.4, className: 'neon-line' }).addTo(mapInstance.current!);
                    routeCoreLayer.current = L.polyline(polyCoords, { color: '#ffffff', weight: 2, opacity: 0.8 }).addTo(mapInstance.current!);

                    if (selectedTarget) {
                        const targetResp = await fetch(`https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${selectedTarget.lng},${selectedTarget.lat}?overview=false`);
                        const targetData = await targetResp.json();
                        if (targetData.routes?.[0]) {
                            setRouteInfo({
                                distance: (targetData.routes[0].distance / 1000).toFixed(1) + ' km',
                                duration: Math.ceil((targetData.routes[0].duration * 3.5) / 60) + ' min'
                            });
                        }
                    }
                }
            } catch (e) { console.error(e); }
        };
        calculateRoute();
    }, [userPos, selectedTarget]);

    return (
        <div className="h-full w-full flex flex-col overflow-hidden relative bg-slate-900">
            <style>{`
                .neon-line { filter: drop-shadow(0 0 3px #00ffff); }
                .pulse-dot { animation: pulse-blink 1.5s infinite; }
                @keyframes pulse-blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
                .user-location-marker { pointer-events: none; }
                .floating-vehicle { animation: floating-effect 2s ease-in-out infinite; }
                @keyframes floating-effect {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>

            <div ref={mapRef} className="flex-1 w-full z-0" />

            {/* GPS Sync Indicator - Simplified */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981] pulse-dot" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">GPS</span>
                </div>
            </div>

            {/* Sidebar Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <button onClick={() => setIsSatellite(!isSatellite)} className="bg-white/95 p-2.5 rounded-xl border border-slate-200 shadow-xl text-slate-700 active:scale-90 transition-all">
                    {isSatellite ? <MapIcon size={18} /> : <Layers size={18} />}
                </button>
            </div>

            {/* Optimized Info Card - Fixed to the left and smaller */}
            {selectedTarget && routeInfo && (
                <div className="absolute bottom-6 left-4 w-[65%] max-w-[210px] bg-slate-900/95 backdrop-blur-xl p-2.5 rounded-2xl shadow-2xl z-20 border border-white/5 flex flex-col gap-2 animate-slide-up">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1.5 rounded-lg ${selectedTarget.type === 'delivery' ? 'bg-green-600' : 'bg-orange-500'} text-white`}>
                                {selectedTarget.type === 'delivery' ? <Truck size={12} /> : <Package size={12} />}
                            </div>
                            <p className="font-black text-[10px] text-white truncate uppercase tracking-tight">{selectedTarget.name}</p>
                        </div>
                        <button onClick={() => setSelectedTarget(null)} className="p-1 bg-white/5 rounded-full text-slate-500"><X size={10} /></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white/5 p-1.5 rounded-lg flex items-center gap-1.5 border border-white/5">
                            <Clock className="text-cyan-400" size={10} />
                            <span className="text-[9px] font-black text-slate-100">{routeInfo.duration}</span>
                        </div>
                        <div className="bg-white/5 p-1.5 rounded-lg flex items-center gap-1.5 border border-white/5">
                            <Compass className="text-emerald-400" size={10} />
                            <span className="text-[9px] font-black text-slate-100">{routeInfo.distance}</span>
                        </div>
                    </div>

                    <div className="flex gap-1.5">
                        <a href={`tel:${customers.find(c => c.id === selectedTarget.id)?.phone || ''}`} className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-black text-white transition-all border border-white/5">
                            <Phone size={10} /> LLAMAR
                        </a>
                        <a href={`https://wa.me/${(customers.find(c => c.id === selectedTarget.id)?.phone || '').replace(/\D/g, '')}`} target="_blank" className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-black text-white transition-all shadow-lg">
                            <MessageCircle size={10} /> WHATSAPP
                        </a>
                    </div>
                </div>
            )}

            {/* Re-center Button */}
            <button onClick={() => userPos && mapInstance.current?.flyTo(userPos, 16)} className="absolute bottom-6 right-6 bg-white p-3.5 rounded-2xl shadow-2xl text-slate-800 active:scale-90 transition-all border border-slate-100 z-10">
                <LocateFixed size={20} strokeWidth={2.5} />
            </button>
        </div>
    );
};