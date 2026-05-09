'use client';

import { LogOut, Search, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import type { CurrentUser } from '@/lib/types';

export function Topbar({ user }: { user: CurrentUser }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No fue posible cerrar sesión',
      );
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border/80 bg-white/80 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-2 text-sm text-muted">
        <Search className="h-4 w-4" />
        Busca empresas, oportunidades o facturas desde cada módulo
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-white px-4 py-2 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </div>

        <Button variant="secondary" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </div>
    </header>
  );
}
