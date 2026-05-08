/**
 * Máscaras e parsing para edição de perfil (CPF, CEP, data BR, cidade/UF).
 */

/** xxx.xxx.xxx-xx */
export function maskCpfBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function digitsCpf(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 11);
}

/** xxxxx-xxx */
export function maskCepBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function digitsCep(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 8);
}

/** dd/mm/aaaa */
export function maskDataBr(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** CPF já salvo com 11 dígitos → máscara */
export function formatCpfFromApi(cpf: string | undefined | null): string {
  if (!cpf || String(cpf).replace(/\D/g, '').length !== 11) return '';
  return maskCpfBr(String(cpf).replace(/\D/g, ''));
}

/** dataNascimento ISO ou yyyy-mm-dd do TypeORM → dd/mm/aaaa */
export function formatDateFromApi(iso: string | undefined | null): string {
  if (!iso) return '';
  const s = String(iso);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) {
    const yyyy = Number(ymd[1]);
    const mm = Number(ymd[2]);
    const dd = Number(ymd[3]);
    return `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * "Cidade / UF" ou "Cidade, UF" → cidade + UF (2 letras).
 */
export function parseCidadeUf(input: string): { cidade?: string; uf?: string } {
  const t = input.trim();
  if (!t) return {};
  const slash = t.split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  if (slash.length >= 2) {
    const uf = slash[slash.length - 1].toUpperCase();
    const cidade = slash.slice(0, -1).join(' / ').trim();
    if (/^[A-Z]{2}$/.test(uf)) return { cidade, uf };
  }
  const comma = t.split(/\s*,\s*/);
  if (comma.length >= 2) {
    const uf = comma[comma.length - 1].trim().toUpperCase();
    const cidade = comma.slice(0, -1).join(', ').trim();
    if (/^[A-Z]{2}$/.test(uf)) return { cidade, uf };
  }
  return { cidade: t };
}

export function validateCpfOpcional(formatted: string): string | undefined {
  const d = digitsCpf(formatted);
  if (d.length === 0) return undefined;
  if (d.length !== 11) return 'CPF deve conter 11 dígitos';
  return undefined;
}

export function validateCepOpcional(formatted: string): string | undefined {
  const d = digitsCep(formatted);
  if (d.length === 0) return undefined;
  if (d.length !== 8) return 'CEP deve conter 8 dígitos';
  return undefined;
}

export function validateNascimentoOpcional(s: string): string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(t)) return 'Use a data no formato dd/mm/aaaa';
  return undefined;
}
