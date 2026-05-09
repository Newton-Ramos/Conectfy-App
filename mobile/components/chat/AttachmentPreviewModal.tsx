import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { PickedAttachment } from './AttachmentPickerModal';
import { formatBytes } from '@/lib/chat-attachments';

const BRAND = '#2c9a81';

type Props = {
  visible: boolean;
  asset: PickedAttachment | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function AttachmentPreviewModal({ visible, asset, onCancel, onConfirm, busy }: Props) {
  if (!asset) return null;

  const sizeLabel = asset.size != null ? formatBytes(asset.size) : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel}>
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
          <Text style={styles.title}>Pré-visualização</Text>
          <Text style={styles.filename} numberOfLines={2}>
            {asset.name}
          </Text>
          {sizeLabel ? <Text style={styles.meta}>{sizeLabel}</Text> : null}

          <View style={styles.previewScroll}>
            {asset.kind === 'image' ? (
              <Image
                source={{ uri: asset.uri }}
                style={styles.previewImage}
                contentFit="contain"
                transition={320}
              />
            ) : asset.kind === 'video' ? (
              <View style={styles.videoPlaceholder}>
                <MaterialIcons name="play-circle-outline" size={72} color={BRAND} />
                <Text style={styles.videoHint}>
                  {asset.durationSec != null ? `${asset.durationSec}s` : 'Vídeo'}
                </Text>
              </View>
            ) : (
              <View style={styles.docPlaceholder}>
                <MaterialIcons name="insert-drive-file" size={56} color={BRAND} />
                <Text style={styles.docHint}>Pronto para enviar</Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnGhost}
              onPress={onCancel}
              disabled={busy}
              hitSlop={8}>
              <Text style={styles.btnGhostTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, busy && styles.btnPrimaryOff]}
              onPress={onConfirm}
              disabled={busy}
              hitSlop={8}>
              <Text style={styles.btnPrimaryTxt}>{busy ? 'Enviando…' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  filename: { fontSize: 15, fontWeight: '600', color: '#334155' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 },
  previewScroll: { maxHeight: 380 },
  previewContent: { alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', minHeight: 220, maxHeight: 360, borderRadius: 12 },
  videoPlaceholder: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  videoHint: { fontWeight: '700', color: '#475569' },
  docPlaceholder: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  docHint: { fontWeight: '600', color: '#64748b' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btnGhost: { paddingVertical: 12, paddingHorizontal: 14 },
  btnGhostTxt: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  btnPrimary: {
    backgroundColor: BRAND,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  btnPrimaryOff: { opacity: 0.65 },
  btnPrimaryTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
