'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api-client';

interface AISummaryProps {
  opportunityId: string;
}

export function AISummary({ opportunityId }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSummary = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ summary: string }>(`/ai/summarize/${opportunityId}`);
      setSummary(res.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 overflow-hidden relative border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Cerebro de IA (Llama 3.3)</h3>
        </div>
        {!summary && !loading && (
          <Button size="sm" onClick={getSummary} className="rounded-full">
            Analizar Lead
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted">Gemini está analizando el historial y sentimientos del cliente...</p>
        </div>
      ) : summary ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {summary}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted hover:text-primary" onClick={() => setSummary(null)}>
              Actualizar análisis
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Haz clic en "Analizar Lead" para recibir sugerencias personalizadas de venta y detección de riesgos.
        </p>
      )}
    </Card>
  );
}
