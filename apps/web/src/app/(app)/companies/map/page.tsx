import { MapViewer } from '@/components/maps/MapViewer';
import { serverApiRequest } from '@/lib/api-client';
import { type Company, type Paged } from '@/lib/types';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building2, List } from 'lucide-react';

export default async function CompaniesMapPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
  const data = await serverApiRequest<Paged<Company>>('/companies?limit=100', cookieHeader); 
  const companies = data?.data || [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Visitas sobre mapa
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Mapa de Cobertura
          </h1>
          <p className="mt-2 text-muted-foreground">
            Visualiza la ubicación geográfica de todas tus empresas e instituciones.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/companies">
            <Button variant="secondary" className="gap-2">
              <List className="w-4 h-4" />
              Vista de Tabla
            </Button>
          </Link>
          <Link href="/companies/new">
            <Button className="gap-2">
              <Building2 className="w-4 h-4" />
              Nueva Empresa
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] border border-border/80 bg-surface shadow-[var(--shadow)] backdrop-blur-sm p-4 sm:p-6">
        {companies.length > 0 ? (
          <MapViewer companies={companies} />
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No hay empresas registradas con coordenadas para mostrar en el mapa.
          </div>
        )}
      </div>
    </div>
  );
}
