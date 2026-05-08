/** Mesmas chaves que `PREDEFINED_CIRCLES` no backend (`circles.service.ts`). */
export const PREDEFINED_CIRCLE_KEYS = [
  'Família',
  'Trabalho',
  'Amigos',
  'Networking',
  'Esportes',
  'Estudos',
] as const;

export type PredefinedCircleKey = (typeof PREDEFINED_CIRCLE_KEYS)[number];
