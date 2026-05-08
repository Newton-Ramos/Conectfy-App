import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'conectfy_chat_local_prefs_v1';

export type ArchivedChat = { peerId: number; nome: string };

type Prefs = {
  archived: ArchivedChat[];
  muted: number[];
};

const defaultPrefs = (): Prefs => ({ archived: [], muted: [] });

export async function loadChatPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultPrefs();
    const j = JSON.parse(raw) as Partial<Prefs>;
    return {
      archived: Array.isArray(j.archived)
        ? j.archived
            .map((a) => ({
              peerId: Number((a as ArchivedChat).peerId),
              nome: String((a as ArchivedChat).nome ?? ''),
            }))
            .filter((a) => Number.isFinite(a.peerId))
        : [],
      muted: Array.isArray(j.muted)
        ? [...new Set(j.muted.map((n) => Number(n)).filter(Number.isFinite))]
        : [],
    };
  } catch {
    return defaultPrefs();
  }
}

async function savePrefs(p: Prefs) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

/** Retorna true se passou a ficar silenciado, false se reativou notificações. */
export async function toggleMute(peerId: number): Promise<boolean> {
  const p = await loadChatPrefs();
  const set = new Set(p.muted);
  const wasMuted = set.has(peerId);
  if (wasMuted) set.delete(peerId);
  else set.add(peerId);
  p.muted = [...set];
  await savePrefs(p);
  return !wasMuted;
}

export async function isMuted(peerId: number): Promise<boolean> {
  const p = await loadChatPrefs();
  return p.muted.includes(peerId);
}

export async function archiveConversation(peerId: number, nome: string): Promise<void> {
  const p = await loadChatPrefs();
  if (p.archived.some((a) => a.peerId === peerId)) return;
  p.archived.push({ peerId, nome: nome || 'Usuário' });
  await savePrefs(p);
}

export async function unarchiveConversation(peerId: number): Promise<void> {
  const p = await loadChatPrefs();
  p.archived = p.archived.filter((a) => a.peerId !== peerId);
  await savePrefs(p);
}

/** Remove referências locais após excluir conversa no servidor */
export async function clearPeerLocalPrefs(peerId: number): Promise<void> {
  const p = await loadChatPrefs();
  p.archived = p.archived.filter((a) => a.peerId !== peerId);
  p.muted = p.muted.filter((id) => id !== peerId);
  await savePrefs(p);
}
