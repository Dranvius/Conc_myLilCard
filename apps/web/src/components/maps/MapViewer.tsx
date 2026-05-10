'use client';

import dynamic from 'next/dynamic';
import { type Company } from '@/lib/types';
import { MapPin } from 'lucide-react';

// Import the map component dynamically with SSR disabled to prevent window is not defined errors
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-[24px] bg-surface flex items-center justify-center border border-border/80 shadow-sm">
      <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
        <MapPin className="w-10 h-10 text-primary opacity-50" />
        <p className="font-medium">Cargando mapa de visitas...</p>
      </div>
    </div>
  ),
});

export function MapViewer({ companies }: { companies: Company[] }) {
  return <MapComponent companies={companies} />;
}
