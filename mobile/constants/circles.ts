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

/**
 * Cor sólida da badge por círculo (lista de contatos, dashboard de círculos).
 * Paleta vibrante para leitura rápida por categoria.
 */
export const CIRCLE_BADGE_BG: Record<string, string> = {
  Família: '#ea580c',
  Trabalho: '#b45309',
  Amigos: '#e11d48',
  Networking: '#2563eb',
  Esportes: '#65a30d',
  Estudos: '#9333ea',
};

function hexToRgba(hex: string, alpha: number): string {
  const x = hex.replace('#', '').trim();
  const full =
    x.length === 3
      ? x
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : x;
  if (full.length !== 6) return `rgba(100,116,139,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Fundo suave (~10% opacidade) atrás do ícone do círculo. */
export function circleIconBackdrop(key: string, alpha = 0.1): string {
  const hex = CIRCLE_BADGE_BG[key] ?? '#64748b';
  return hexToRgba(hex, alpha);
}

/** Cor de ícone / badge por chave (fallback cinza para tags personalizadas). */
export function circleAccentSolid(key: string): string {
  return CIRCLE_BADGE_BG[key] ?? '#64748b';
}
