import { Audio } from 'expo-av';

let messageSound: Audio.Sound | null = null;
let eventSound: Audio.Sound | null = null;

async function ensureLoaded(): Promise<void> {
  if (messageSound && eventSound) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  const create = async (uri: number) => {
    const { sound } = await Audio.Sound.createAsync(uri, { shouldPlay: false, volume: 0.85 });
    return sound;
  };
  messageSound = await create(require('@/assets/sounds/message.wav'));
  eventSound = await create(require('@/assets/sounds/event.wav'));
}

export async function playMessageNotificationSound(): Promise<void> {
  try {
    await ensureLoaded();
    await messageSound?.replayAsync();
  } catch {
    /* ignore */
  }
}

export async function playEventNotificationSound(): Promise<void> {
  try {
    await ensureLoaded();
    await eventSound?.replayAsync();
  } catch {
    /* ignore */
  }
}
