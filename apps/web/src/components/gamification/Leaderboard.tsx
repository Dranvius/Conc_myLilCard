'use client';

import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal, Star, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  userId: string;
  points: number;
  level: number;
  user: {
    name: string;
  };
}

export function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiRequest<LeaderboardEntry[]>('/gamification/leaderboard'),
  });

  if (isLoading) return <Skeleton className="h-[400px] w-full rounded-3xl" />;

  return (
    <Card className="p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-yellow-500/10 rounded-xl">
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Ranking de Ventas</h3>
          <p className="text-xs text-muted">Los mejores cerradores del mes</p>
        </div>
      </div>

      <div className="space-y-4">
        {data?.map((entry, index) => (
          <div
            key={entry.userId}
            className={`flex items-center gap-4 p-3 rounded-2xl transition-colors ${
              index === 0 ? 'bg-yellow-500/5 border border-yellow-500/20' : 'hover:bg-surface-muted'
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8 font-bold text-sm">
              {index === 0 ? (
                <Medal className="h-5 w-5 text-yellow-500" />
              ) : index === 1 ? (
                <Medal className="h-5 w-5 text-slate-400" />
              ) : index === 2 ? (
                <Medal className="h-5 w-5 text-amber-700" />
              ) : (
                index + 1
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{entry.user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                  LVL {entry.level}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-bold text-sm text-foreground">{entry.points}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">Puntos</p>
            </div>
          </div>
        ))}

        {!data?.length && (
          <div className="py-8 text-center">
            <Target className="h-10 w-10 text-muted mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted">Aún no hay puntos registrados</p>
          </div>
        )}
      </div>
    </Card>
  );
}
