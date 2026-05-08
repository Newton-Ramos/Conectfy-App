import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  playEventNotificationSound,
  playMessageNotificationSound,
} from '@/lib/notification-sounds';

type ToastKind = 'message' | 'event';

type ToastPayload = {
  id: string;
  title: string;
  body?: string;
  kind: ToastKind;
};

type InAppNotifyContextValue = {
  showToast: (kind: ToastKind, title: string, body?: string) => void;
};

const InAppNotifyContext = createContext<InAppNotifyContextValue | null>(null);

export function InAppNotifyProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const showToast = useCallback(
    (kind: ToastKind, title: string, body?: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      void (kind === 'message' ? playMessageNotificationSound() : playEventNotificationSound());

      setToast({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        body,
        kind,
      });
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      hideTimer.current = setTimeout(() => {
        hide();
      }, 4200);
    },
    [hide, opacity],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <InAppNotifyContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { paddingTop: Math.max(insets.top, 10) + 6, opacity },
          ]}>
          <Pressable
            onPress={hide}
            style={[
              styles.banner,
              toast.kind === 'message' ? styles.bannerMsg : styles.bannerEvt,
            ]}>
            <MaterialIcons
              name={toast.kind === 'message' ? 'chat' : 'event'}
              size={22}
              color="#fff"
              style={styles.bannerIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle} numberOfLines={2}>
                {toast.title}
              </Text>
              {toast.body ? (
                <Text style={styles.bannerBody} numberOfLines={3}>
                  {toast.body}
                </Text>
              ) : null}
            </View>
            <MaterialIcons name="close" size={20} color="#fff" />
          </Pressable>
        </Animated.View>
      ) : null}
    </InAppNotifyContext.Provider>
  );
}

export function useInAppNotify() {
  const ctx = useContext(InAppNotifyContext);
  if (!ctx) {
    throw new Error('useInAppNotify must be used within InAppNotifyProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  banner: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerMsg: { backgroundColor: '#1a6b5c' },
  bannerEvt: { backgroundColor: '#8b4513' },
  bannerIcon: { marginTop: 2 },
  bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bannerBody: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 4, lineHeight: 18 },
});
