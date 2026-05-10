export interface NavItemDefinition {
  label: string;
  href: string;
  iconKey:
    | 'layout-dashboard'
    | 'building-2'
    | 'users'
    | 'package'
    | 'funnel'
    | 'file-text'
    | 'badge-dollar-sign'
    | 'stethoscope'
    | 'receipt'
    | 'receipt'
    | 'star'
    | 'shield'
    | 'settings'
    | 'bar-chart'
    | 'calendar';
  adminOnly?: boolean;
}

export const appNavigation: NavItemDefinition[] = [
  { label: 'Dashboard', href: '/dashboard', iconKey: 'layout-dashboard' },
  { label: 'Empresas', href: '/companies', iconKey: 'building-2' },
  { label: 'Contactos', href: '/contacts', iconKey: 'users' },
  { label: 'Productos', href: '/products', iconKey: 'package' },
  { label: 'Oportunidades', href: '/opportunities', iconKey: 'funnel' },
  { label: 'Propuestas', href: '/proposals', iconKey: 'file-text' },
  { label: 'Ventas', href: '/sales', iconKey: 'badge-dollar-sign' },
  { label: 'Órdenes', href: '/service-orders', iconKey: 'stethoscope' },
  { label: 'Facturas', href: '/invoices', iconKey: 'receipt' },
  { label: 'Calendario', href: '/calendar', iconKey: 'calendar' },
  { label: 'Reseñas', href: '/reviews', iconKey: 'star' },
  { label: 'Admin', href: '/admin', iconKey: 'shield', adminOnly: true },
  { label: 'Reportes', href: '/reports', iconKey: 'bar-chart' },
  { label: 'Ajustes', href: '/settings', iconKey: 'settings' },
];
