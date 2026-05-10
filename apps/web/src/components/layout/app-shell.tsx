import type { ReactNode } from 'react';
import type { CurrentUser } from '@/lib/types';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden xl:flex bg-surface">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
