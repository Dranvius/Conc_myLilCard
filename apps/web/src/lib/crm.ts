import { titleize } from './format';

export const opportunityStages = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

export const leadSourceOptions = [
  'WEB_FORM',
  'REFERRAL',
  'CONGRESS',
  'WHATSAPP',
  'SOCIAL_MEDIA',
  'PHONE',
  'COLD_CALL',
  'OTHER',
] as const;

export const leadSourceLabels: Record<string, string> = {
  WEB_FORM: 'Formulario web',
  REFERRAL: 'Referido',
  CONGRESS: 'Congreso',
  WHATSAPP: 'WhatsApp',
  SOCIAL_MEDIA: 'Redes sociales',
  PHONE: 'Telefono',
  COLD_CALL: 'Cold call',
  OTHER: 'Otro',
};

export const leadScoreLabels: Record<string, string> = {
  P0: 'P0 alta',
  P1: 'P1 fuerte',
  P2: 'P2 media',
  P3: 'P3 baja',
  P4: 'P4 fria',
};

export function formatLeadSource(source?: string | null) {
  if (!source) return 'Sin origen';
  return leadSourceLabels[source] ?? titleize(source);
}

export function formatLeadScore(score?: string | null) {
  if (!score) return 'Sin score';
  return leadScoreLabels[score] ?? score;
}
