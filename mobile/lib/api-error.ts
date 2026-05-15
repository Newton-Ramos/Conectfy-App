import axios from 'axios';

/** Só desloga quando o token é inválido/expirado — não em erro 500 ou rede. */
export function isApiUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/** Mensagem amigável para falhas de rede ou respostas Nest (message array ou string). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data;
    const m = data?.message;
    if (Array.isArray(m)) return m.filter((x) => typeof x === 'string' && x.trim()).join(' ');
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = String((err as { message?: string }).message || '');
    if (msg === 'Network Error' || msg.includes('Network Error')) {
      return 'Sem conexão com o servidor. Confira se o backend está rodando (npm run start:dev na pasta backend) e a URL: em emulador Android use o IP do PC ou deixe EXPO_PUBLIC_API_URL vazio (usa 10.0.2.2:3333). Evite localhost no celular/emulador.';
    }
  }
  return fallback;
}
