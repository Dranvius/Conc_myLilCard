'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api-client';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Polling unread count every 30 seconds
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => apiRequest<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  // Fetch all notifications when panel opens
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<Notification[]>('/notifications'),
    enabled: isOpen,
  });

  const markAsRead = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: () =>
      apiRequest('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </Button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h4 className="text-sm font-semibold">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                  {unreadCount}
                </span>
              )}
            </h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Marcar todo
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted">
                <Bell className="mx-auto mb-2 h-6 w-6 opacity-30" />
                Sin notificaciones nuevas
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex flex-col gap-1 px-4 py-3 text-sm transition-colors',
                      !n.isRead && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('font-medium leading-tight', !n.isRead && 'text-primary')}>
                        {n.title}
                      </p>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {!n.isRead && (
                          <button
                            title="Marcar como leída"
                            className="rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                            onClick={() => markAsRead.mutate(n.id)}
                            disabled={markAsRead.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          title="Eliminar"
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                          onClick={() => deleteNotification.mutate(n.id)}
                          disabled={deleteNotification.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
