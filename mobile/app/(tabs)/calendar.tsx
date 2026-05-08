import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'conectfy_calendar_events_v1';

export type LocalCalendarEvent = {
  id: string;
  title: string;
  notes: string;
  /** ISO date (dia inteiro ou horário) */
  dateIso: string;
};

async function loadEvents(): Promise<LocalCalendarEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCalendarEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEvents(list: LocalCalendarEvent[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const BRAND = '#2c9a81';

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LocalCalendarEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState('');

  const refresh = useCallback(async () => {
    const list = await loadEvents();
    list.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    setItems(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const openNew = () => {
    setTitle('');
    setNotes('');
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDateStr(d.toISOString().slice(0, 16));
    setModalOpen(true);
  };

  const saveNew = async () => {
    const t = title.trim();
    if (!t) {
      Alert.alert('Título obrigatório', 'Informe um nome para o evento ou data importante.');
      return;
    }
    const when = new Date(dateStr);
    if (Number.isNaN(when.getTime())) {
      Alert.alert('Data inválida', 'Ajuste data e horário.');
      return;
    }
    const ev: LocalCalendarEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: t,
      notes: notes.trim(),
      dateIso: when.toISOString(),
    };
    const next = [...items, ev];
    await saveEvents(next);
    setModalOpen(false);
    await refresh();
  };

  const removeEv = (id: string) => {
    Alert.alert('Remover?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const next = items.filter((e) => e.id !== id);
          await saveEvents(next);
          await refresh();
        },
      },
    ]);
  };

  const formatRow = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.topbarIcon} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Calendário</Text>
        <TouchableOpacity style={styles.topbarIcon} onPress={openNew} hitSlop={12}>
          <MaterialIcons name="add" size={26} color="#111" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum evento ou data salva. Toque em + para criar.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>{formatRow(item.dateIso)}</Text>
              {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => removeEv(item.id)} hitSlop={10}>
              <MaterialIcons name="delete-outline" size={22} color="#a33" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openNew}>
        <MaterialIcons name="event" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>Novo evento ou data</Text>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Aniversário da Maria"
              placeholderTextColor="#888"
            />
            <Text style={styles.label}>Quando</Text>
            <TextInput
              style={styles.input}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="AAAA-MM-DDTHH:mm"
              placeholderTextColor="#888"
            />
            <Text style={styles.hint}>Use o seletor do sistema ou edite o texto (formato ISO local).</Text>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional"
              placeholderTextColor="#888"
              multiline
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setModalOpen(false)}>
                <Text style={styles.btnGhostTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => void saveNew()}>
                <Text style={styles.btnPrimaryTxt}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e8e8' },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  topbarIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  listPad: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', color: '#666', marginTop: 40, paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f4eded',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  cardDate: { fontSize: 13, color: '#444', marginTop: 4 },
  cardNotes: { fontSize: 13, color: '#555', marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14, color: '#111' },
  label: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
  },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: '#888', marginBottom: 10 },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 16 },
  btnGhostTxt: { fontSize: 16, color: '#666', fontWeight: '600' },
  btnPrimary: {
    backgroundColor: BRAND,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
