/**
 * Validação de contato (alinhada ao cadastro web).
 * Regex sem \\p{...} para compatibilidade com Hermes no React Native.
 */

/** Remove tudo que não for letra latina (com acentos comuns) ou espaço */
export function onlyLettersAndAccents(value: string): string {
  return value.replace(/[^a-zA-ZÀ-ÿ\u00C0-\u024F ]/g, '');
}

/** Formata só com dígitos, máx. 11 — (DD) 99999-9999 */
export function maskPhoneBr(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length <= 2) {
    return `(${ddd}`;
  }
  if (rest.length <= 5) {
    return `(${ddd}) ${rest}`;
  }
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function digitsPhoneBr(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

/** Nome: mínimo 3 caracteres; só letras (latin estendido) e espaços */
export function validateNomeCadastro(nomeTrim: string): string | undefined {
  if (nomeTrim.length < 3) {
    return 'Nome deve ter no mínimo 3 caracteres';
  }
  if (!/^[a-zA-ZÀ-ÿ\u00C0-\u024F ]+$/.test(nomeTrim)) {
    return 'Nome deve conter apenas letras e acentos';
  }
  return undefined;
}

/** E-mail básico (mesma ideia do fluxo web) */
export function validateEmailBasico(emailTrim: string): string | undefined {
  if (!emailTrim) return 'Informe o e-mail';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim);
  if (!ok) return 'E-mail inválido';
  return undefined;
}

/** Celular completo: exatamente 11 dígitos (2 DDD + 9 + 8). */
export function validateTelefoneBrObrigatorio(formatted: string): string | undefined {
  const d = digitsPhoneBr(formatted);
  if (d.length !== 11) {
    return 'Telefone deve estar no formato (DD) 99999-9999 com 11 dígitos';
  }
  if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(formatted.trim())) {
    return 'Use o formato (DD) 99999-9999';
  }
  return undefined;
}

/**
 * Quando o telefone é opcional: vazio ok; se preenchido, deve estar completo.
 */
export function validateTelefoneBrOpcional(formatted: string): string | undefined {
  const d = digitsPhoneBr(formatted);
  if (d.length === 0) return undefined;
  if (d.length !== 11) {
    return 'Telefone deve estar no formato (DD) 99999-9999 com 11 dígitos';
  }
  if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(formatted.trim())) {
    return 'Use o formato (DD) 99999-9999';
  }
  return undefined;
}
