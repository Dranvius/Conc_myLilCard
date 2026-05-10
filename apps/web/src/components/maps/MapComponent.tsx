'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { type Company } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, MapPin } from 'lucide-react';

// Fix leaflet default icon issue in React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapComponent({ companies }: { companies: Company[] }) {
  // Center map on the first company with coordinates, or a default center (e.g. Bogota, Colombia)
  const defaultCenter: [number, number] = [4.6097, -74.0817];
  
  const mapCenter = companies.find(c => c.latitude && c.longitude)
    ? [companies.find(c => c.latitude && c.longitude)!.latitude!, companies.find(c => c.latitude && c.longitude)!.longitude!] as [number, number]
    : defaultCenter;

  const validCompanies = companies.filter(c => c.latitude && c.longitude);

  return (
    <div className="h-[600px] w-full rounded-[24px] overflow-hidden border border-border/80 shadow-sm relative z-0">
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {validCompanies.map((company) => (
          <Marker 
            key={company.id} 
            position={[company.latitude!, company.longitude!]}
          >
            <Popup className="rounded-xl border-none shadow-xl">
              <div className="flex flex-col gap-2 min-w-[200px] p-1">
                <div className="flex items-center gap-2 text-primary font-semibold text-base">
                  <Building2 className="w-4 h-4" />
                  <span>{company.name}</span>
                </div>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{company.address || company.city}</span>
                </p>
                <Link href={`/companies/${company.id}`} className="mt-3">
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl">
                    Ver Detalles de Visita
                  </Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
