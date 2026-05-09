import AsyncStorage from '@react-native-async-storage/async-storage';

export const CALENDAR_STORAGE_KEY = 'conectfy_calendar_events_v1';

export type LocalCalendarEvent = {
  id: string;
  title: string;
  notes: string;
  dateIso: string;
};

export async function loadCalendarEvents(): Promise<LocalCalendarEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalCalendarEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCalendarEvents(list: LocalCalendarEvent[]) {
  await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(list));
}
