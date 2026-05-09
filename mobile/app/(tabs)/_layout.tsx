import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BRAND_ACCENT } from '@/constants/brand';
import { InAppNotifyProvider } from '@/contexts/in-app-notify-context';
import { GlobalRealtimeBridge } from '@/components/global-realtime-bridge';

export default function TabLayout() {
  return (
    <InAppNotifyProvider>
      <GlobalRealtimeBridge />
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND_ACCENT,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Conversas',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          title: 'Círculos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contatos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="phone.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) =>
            <IconSymbol size={28} name="person.crop.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="add-contact" options={{ href: null }} />
      <Tabs.Screen name="edit-person" options={{ href: null }} />
      <Tabs.Screen name="chat/[peerId]" options={{ href: null }} />
      <Tabs.Screen name="modal" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="event-create" options={{ href: null }} />
    </Tabs>
    </InAppNotifyProvider>
  );
}
