'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import type { PotentialDuplicate } from '@/lib/types';

export function PotentialDuplicateModal({
  open,
  duplicates,
  title,
  onClose,
  onContinue,
  loading,
}: {
  open: boolean;
  duplicates: PotentialDuplicate[];
  title: string;
  onClose: () => void;
  onContinue: () => Promise<void> | void;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="RespiraCRM encontro registros similares. Puedes revisarlos o continuar si confirmas que se trata de un caso distinto."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void onContinue()} disabled={loading}>
            {loading ? 'Continuando...' : 'Continuar de todas formas'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {duplicates.map((duplicate) => (
          <Card
            key={`${duplicate.entityType}-${duplicate.id}`}
            className="rounded-2xl border border-border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  {duplicate.title}
                </p>
                <p className="text-sm text-muted">{duplicate.subtitle}</p>
                <div className="flex flex-wrap gap-2">
                  {duplicate.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-primary-soft px-2 py-1 text-xs font-medium text-primary"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Match {duplicate.matchScore}
                </span>
                <Link href={duplicate.href}>
                  <Button variant="secondary" size="sm">
                    Abrir registro
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  );
}
