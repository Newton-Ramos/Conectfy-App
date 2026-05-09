import type { Href } from 'expo-router';

const CONVERSATIONS: Href = '/(tabs)/explore';

/**
 * Volta para a lista de todas as conversas (aba Conversas).
 * Evita `router.back()` que pode cair em Início ou outra rota do histórico.
 */
export function navigateToConversations(router: { navigate: (href: Href) => void }): void {
  router.navigate(CONVERSATIONS);
}
