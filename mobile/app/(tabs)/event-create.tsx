import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BRAND_GRADIENT_COLORS,
  BRAND_TEAL_DEEP,
  LOGO_IMAGE,
  SLOGAN_UPPER,
} from '@/constants/brand';
import { BrandSparkles } from '@/components/brand/BrandSparkles';
import { NetworkMotif } from '@/components/brand/NetworkMotif';
import {
  loadCalendarEvents,
  saveCalendarEvents,
  type LocalCalendarEvent,
} from '@/lib/calendar-events';

const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

function formatWhenHuman(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleString('pt-BR', { month: 'long' });
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
  return `${day} de ${monthCap}, ${year} às ${hh}:${mm}`;
}

export default function EventCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [when, setWhen] = useState<Date>(new Date());
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  const openWhenPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: when,
        mode: 'date',
        display: 'calendar',
        is24Hour: true,
        onChange: (e: DateTimePickerEvent, selected) => {
          if (e.type !== 'set' || !selected) return;
          const base = new Date(when);
          base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
          DateTimePickerAndroid.open({
            value: base,
            mode: 'time',
            display: 'spinner',
            is24Hour: true,
            onChange: (e2: DateTimePickerEvent, selectedTime) => {
              if (e2.type !== 'set' || !selectedTime) return;
              const next = new Date(base);
              next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              setWhen(next);
            },
          });
        },
      });
      return;
    }
    setIosPickerOpen((v) => !v);
  };

  const onIosDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setWhen((prev) => {
      const next = new Date(prev);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      return next;
    });
  };

  const onIosTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    setWhen((prev) => {
      const next = new Date(prev);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  };

  const save = useCallback(async () => {
    const t = title.trim();
    if (!t) {
      Alert.alert('Título obrigatório', 'Informe um nome para o evento.');
      return;
    }
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
    const existing = await loadCalendarEvents();
    await saveCalendarEvents([...existing, ev]);
    router.back();
  }, [title, notes, when, router]);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <LinearGradient
          colors={[...BRAND_GRADIENT_COLORS]}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.9, y: 0 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <BrandSparkles corners color="rgba(255,255,255,0.55)" />
          <NetworkMotif opacity={0.22} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={14}>
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroTitleRow}>
            <Image source={LOGO_IMAGE} style={styles.heroLogo} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Novo Evento</Text>
              <Text style={styles.heroSlogan}>{SLOGAN_UPPER}</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[styles.sheetInner, { paddingBottom: 28 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Workshop de projetos"
            placeholderTextColor={MUTED}
          />

          <Text style={styles.label}>Data & hora</Text>
          <Pressable
            onPress={openWhenPicker}
            style={({ pressed }) => [styles.whenField, pressed && { opacity: 0.92 }]}>
            <MaterialIcons name="event" size={20} color={BRAND_TEAL_DEEP} />
            <Text style={styles.whenText}>{formatWhenHuman(when)}</Text>
            <MaterialIcons
              name={Platform.OS === 'ios' ? (iosPickerOpen ? 'expand-less' : 'expand-more') : 'schedule'}
              size={20}
              color={MUTED}
            />
          </Pressable>

          {Platform.OS === 'ios' && iosPickerOpen ? (
            <View style={styles.iosPickerWrap}>
              <Text style={styles.iosHint}>Data</Text>
              <DateTimePicker
                value={when}
                mode="date"
                display="inline"
                themeVariant="light"
                onChange={onIosDateChange}
              />
              <Text style={[styles.iosHint, { marginTop: 10 }]}>Horário</Text>
              <View style={styles.iosTimeWheel}>
                <DateTimePicker
                  value={when}
                  mode="time"
                  display="spinner"
                  themeVariant="light"
                  minuteInterval={5}
                  onChange={onIosTimeChange}
                />
              </View>
              <TouchableOpacity style={styles.iosDone} onPress={() => setIosPickerOpen(false)} activeOpacity={0.85}>
                <Text style={styles.iosDoneTxt}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Detalhes opcionais"
            placeholderTextColor={MUTED}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={styles.btnGhostTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => void save()} activeOpacity={0.9}>
              <Text style={styles.btnPrimaryTxt}>Criar Evento</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  backBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    padding: 4,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  heroLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSlogan: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 1.8,
  },
  sheet: {
    flex: 1,
    marginTop: -12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#f8fafc',
  },
  sheetInner: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: MUTED,
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: INK,
    marginBottom: 18,
  },
  notes: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  whenField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  whenText: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  iosPickerWrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    marginBottom: 18,
    overflow: 'hidden',
  },
  iosHint: {
    fontSize: 11,
    fontWeight: '800',
    color: MUTED,
    marginLeft: 6,
    marginBottom: 4,
  },
  iosTimeWheel: {
    height: 216,
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  iosDone: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BRAND_TEAL_DEEP,
  },
  iosDoneTxt: { color: '#fff', fontWeight: '800' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  btnGhost: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BRAND_TEAL_DEEP,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: BRAND_TEAL_DEEP,
  },
  btnPrimary: {
    flex: 3,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BRAND_TEAL_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_TEAL_DEEP,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});
