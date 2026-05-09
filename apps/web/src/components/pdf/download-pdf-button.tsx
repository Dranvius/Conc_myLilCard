// apps/web/src/components/pdf/download-pdf-button.tsx
'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import type { Proposal } from '@/lib/types';
import { ProposalPDF } from './proposal-pdf';

export function DownloadPdfButton({ proposal }: { proposal: Proposal }) {
  return (
    <PDFDownloadLink
      document={<ProposalPDF proposal={proposal} />}
      fileName={`Propuesta_${proposal.code}.pdf`}
    >
      {({ loading }) => (
        <Button variant="secondary" disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          {loading ? 'Generando PDF...' : 'Descargar PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

