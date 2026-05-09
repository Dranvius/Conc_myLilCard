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
    <div className="min-h-screen xl:flex">
      <Sidebar user={user} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
