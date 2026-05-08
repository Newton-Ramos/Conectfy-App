export function normalizeCpf(value: string): string {
  return (value ?? '').toString().replace(/\D/g, '');
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const digits = cpf.split('').map((c) => Number(c));

  // 1º dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) sum1 += digits[i] * (10 - i);
  let dv1 = (sum1 * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== digits[9]) return false;

  // 2º dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) sum2 += digits[i] * (11 - i);
  let dv2 = (sum2 * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  if (dv2 !== digits[10]) return false;

  return true;
}

