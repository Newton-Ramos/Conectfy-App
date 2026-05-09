import type { Href } from 'expo-router';

function first(p: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = p[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Volta do editor de pessoa para a tela que abriu (contatos, perfil ou chat). */
export function hrefAfterEditPerson(params: Record<string, string | string[] | undefined>): Href {
  const from = first(params, 'from');
  if (from === 'chat') {
    const peerId = first(params, 'userId');
    const peerName = first(params, 'peerName') ?? '';
    if (peerId) {
      return {
        pathname: '/(tabs)/chat/[peerId]',
        params: { peerId: String(peerId), peerName },
      };
    }
  }
  if (from === 'profile') return '/(tabs)/profile';
  if (from === 'contacts') return '/(tabs)/contacts';
  return '/(tabs)/contacts';
}

/** Volta de “adicionar contato”: lista de contatos ou início (quick action). */
export function hrefAfterAddContact(params: Record<string, string | string[] | undefined>): Href {
  return first(params, 'from') === 'home' ? '/(tabs)' : '/(tabs)/contacts';
}

/**
 * Volta da lista de contatos quando foi empilhada a partir de Início ou Círculos.
 * Sem `backSrc`, usa Conversas como hub (evita cair no Início ao trocar de aba).
 */
export function hrefContactsListBack(params: Record<string, string | string[] | undefined>): Href {
  const src = first(params, 'backSrc');
  if (src === 'circles') return '/(tabs)/circles';
  if (src === 'home') return '/(tabs)';
  return '/(tabs)/explore';
}

/** Volta do calendário (normalmente aberto a partir do Início). */
export function hrefCalendarBack(params: Record<string, string | string[] | undefined>): Href {
  return first(params, 'backSrc') === 'home' ? '/(tabs)' : '/(tabs)/explore';
}
