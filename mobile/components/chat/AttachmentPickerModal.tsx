import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const BRAND = '#2c9a81';

export type PickedAttachment = {
  uri: string;
  mimeType: string;
  name: string;
  kind: 'image' | 'video' | 'document';
  durationSec?: number;
  size?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (asset: PickedAttachment) => void;
};

async function ensureLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

export function AttachmentPickerModal({ visible, onClose, onPick }: Props) {
  const pickGalleryImage = async () => {
    if (!(await ensureLibraryPermission())) {
      onClose();
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.92,
    });
    onClose();
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    onPick({
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? 'foto.jpg',
      kind: 'image',
      size: a.fileSize,
    });
  };

  const pickCamera = async () => {
    if (!(await ensureCameraPermission())) {
      onClose();
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
    });
    onClose();
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    onPick({
      uri: a.uri,
      mimeType: a.mimeType ?? 'image/jpeg',
      name: a.fileName ?? 'camera.jpg',
      kind: 'image',
      size: a.fileSize,
    });
  };

  const pickVideo = async () => {
    if (!(await ensureLibraryPermission())) {
      onClose();
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    });
    onClose();
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const durationSec =
      a.duration != null ? Math.max(1, Math.round(a.duration / 1000)) : undefined;
    onPick({
      uri: a.uri,
      mimeType: a.mimeType ?? 'video/mp4',
      name: a.fileName ?? 'video.mp4',
      kind: 'video',
      durationSec,
      size: a.fileSize,
    });
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*',
      base64: false,
    });
    onClose();
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    onPick({
      uri: a.uri,
      mimeType: a.mimeType ?? 'application/octet-stream',
      name: a.name,
      kind: 'document',
      size: a.size ?? undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Anexar</Text>
            <Row icon="photo-library" label="Galeria de fotos" onPress={() => void pickGalleryImage()} />
            <Row icon="photo-camera" label="Câmera" onPress={() => void pickCamera()} />
            <Row icon="videocam" label="Vídeo" onPress={() => void pickVideo()} />
            <Row icon="description" label="Documento ou arquivo" onPress={() => void pickDocument()} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={22} color={BRAND} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(44,154,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cancelBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 12 },
  cancelTxt: { fontSize: 16, fontWeight: '700', color: BRAND },
});
