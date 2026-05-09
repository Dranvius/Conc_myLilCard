'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appNavigation } from '@respira/shared';
import type { CurrentUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { navIcons } from './nav-icons';

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[280px] shrink-0 border-r border-white/70 bg-[linear-gradient(180deg,rgba(15,108,141,0.98),rgba(8,76,97,0.98))] p-6 text-white xl:flex xl:flex-col">
      <div className="mb-10">
        <div className="inline-flex items-center rounded-2xl bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          RespiraCRM
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight">
          Ventas respiratorias con contexto clínico.
        </h1>
        <p className="mt-3 text-sm text-white/70">
          CRM modular para operación comercial, servicio técnico y
          administración interna.
        </p>
      </div>

      <nav className="space-y-2">
        {appNavigation
          .filter((item) => !item.adminOnly || user.role.name === 'ADMIN')
          .map((item) => {
            const Icon = navIcons[item.iconKey];
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                  active
                    ? 'bg-white !text-[#0f6c8d] shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-white/12 bg-white/8 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-white/60">
          Sesión activa
        </p>
        <p className="mt-2 text-sm font-semibold">{user.name}</p>
        <p className="text-sm text-white/70">{user.role.name}</p>
      </div>
    </aside>
  );
}
