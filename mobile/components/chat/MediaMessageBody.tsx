import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { resolveMediaUrl, type ChatMessage } from '@/api/client';

const BRAND = '#2c9a81';
const INK = '#0f172a';

function resolvedUri(item: ChatMessage): string | null {
  const raw = item.clientUpload?.localUri ?? item.mediaUrl;
  if (!raw) return null;
  if (raw.startsWith('file:') || raw.startsWith('content:')) return raw;
  return resolveMediaUrl(raw);
}

function extractFileTitle(content: string): string {
  const dot = content.indexOf('·');
  const left = (dot > 0 ? content.slice(0, dot) : content).trim();
  const space = left.indexOf(' ');
  if (space <= 0) return left;
  return left.slice(space + 1).trim();
}

function docIconName(filename: string): keyof typeof MaterialIcons.glyphMap {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'picture-as-pdf';
  if (/\.(doc|docx)$/i.test(lower)) return 'description';
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return 'grid-on';
  if (/\.(ppt|pptx)$/i.test(lower)) return 'slideshow';
  return 'insert-drive-file';
}

function VideoThumb({
  uri,
  durationSec,
}: {
  uri: string;
  durationSec?: number | null;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { uri: t } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: Math.min(800, 400),
        });
        if (alive) setThumb(t);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uri]);

  if (thumb && !failed) {
    return (
      <Image source={{ uri: thumb }} style={styles.videoThumb} contentFit="cover" transition={200} />
    );
  }
  return (
    <View style={styles.videoThumbFallback}>
      <MaterialIcons name="videocam" size={40} color="#fff" />
      {durationSec != null ? (
        <View style={styles.durationBadge}>
          <Text style={styles.durationTxt}>{durationSec}s</Text>
        </View>
      ) : null}
    </View>
  );
}

type Props = {
  item: ChatMessage;
  mine: boolean;
  onPressImage: (uri: string) => void;
  onPressVideo: (uri: string) => void;
  onPressDocument: (uri: string) => void;
  onRetry?: () => void;
};

export function MediaMessageBody({
  item,
  mine,
  onPressImage,
  onPressVideo,
  onPressDocument,
  onRetry,
}: Props) {
  const uri = resolvedUri(item);
  const mt = item.mediaType;
  const upload = item.clientUpload;
  const showUploadOverlay =
    upload &&
    (upload.phase === 'compressing' || upload.phase === 'uploading' || upload.phase === 'sending');
  const progress = upload?.progress ?? 0;
  const failed = upload?.phase === 'failed';

  if (!uri || !mt) return null;

  if (mt === 'image') {
    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => (failed && onRetry ? onRetry() : onPressImage(uri))}
        style={styles.mediaTap}>
        <Image
          source={{ uri }}
          style={styles.msgImage}
          contentFit="cover"
          transition={280}
          recyclingKey={String(item.id)}
        />
        {showUploadOverlay ? (
          <View style={styles.uploadMask}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.uploadPct}>{progress}%</Text>
          </View>
        ) : null}
        {failed && onRetry ? (
          <View style={styles.failBadge}>
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.failTxt}>Toque para tentar novamente</Text>
          </View>
        ) : null}
        <View style={[styles.mediaProgressBar, showUploadOverlay ? styles.mediaProgressVisible : null]}>
          <View style={[styles.mediaProgressFill, { width: `${progress}%` }]} />
        </View>
      </TouchableOpacity>
    );
  }

  if (mt === 'video') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => (failed && onRetry ? onRetry() : onPressVideo(uri))}
        style={styles.mediaTap}>
        <View style={styles.videoBox}>
          <VideoThumb uri={uri} durationSec={item.mediaDurationSec} />
          <View style={styles.playFab}>
            <MaterialIcons name="play-arrow" size={36} color="#fff" />
          </View>
          {item.mediaDurationSec != null ? (
            <View style={styles.durationBadgeAbs}>
              <Text style={styles.durationTxt}>{item.mediaDurationSec}s</Text>
            </View>
          ) : null}
        </View>
        {showUploadOverlay ? (
          <View style={styles.uploadMask}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.uploadPct}>{progress}%</Text>
          </View>
        ) : null}
        {failed && onRetry ? (
          <View style={styles.mediaFailStrip}>
            <MaterialIcons name="refresh" size={16} color="#fff" />
            <Text style={styles.mediaFailTxt}>Toque para tentar novamente</Text>
          </View>
        ) : null}
        <View style={[styles.mediaProgressBar, showUploadOverlay ? styles.mediaProgressVisible : null]}>
          <View style={[styles.mediaProgressFill, { width: `${progress}%` }]} />
        </View>
      </TouchableOpacity>
    );
  }

  if (mt === 'document' || mt === 'file') {
    const filename = extractFileTitle(item.content) || 'Arquivo';
    const shortName =
      filename.length > 36 ? `${filename.slice(0, 18)}…${filename.slice(-10)}` : filename;

    return (
      <TouchableOpacity
        style={[styles.fileRow, mine ? styles.fileRowMine : styles.fileRowTheirs]}
        onPress={() => (failed && onRetry ? onRetry() : onPressDocument(uri))}
        activeOpacity={0.88}>
        <View style={styles.fileIcon}>
          <MaterialIcons name={docIconName(filename)} size={28} color={mine ? '#075e54' : BRAND} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.fileName, { color: INK }]} numberOfLines={2}>
            {shortName}
          </Text>
          <Text style={styles.fileHint} numberOfLines={1}>
            {mt === 'document' ? 'Documento' : 'Arquivo'} · toque para abrir
          </Text>
        </View>
        {showUploadOverlay ? <ActivityIndicator size="small" color={BRAND} /> : null}
        <View style={[styles.fileProgressTrack, showUploadOverlay ? { opacity: 1 } : { opacity: 0 }]}>
          <View style={[styles.fileProgressFill, { width: `${progress}%` }]} />
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  mediaTap: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 280,
  },
  msgImage: {
    width: 260,
    height: 260,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  uploadMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadPct: { color: '#fff', fontWeight: '800', fontSize: 13 },
  failBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220,38,38,0.92)',
    padding: 8,
    borderRadius: 10,
  },
  failTxt: { color: '#fff', fontSize: 11, fontWeight: '700', flex: 1 },
  mediaFailStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(220,38,38,0.92)',
  },
  mediaFailTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  mediaProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    opacity: 0,
  },
  mediaProgressVisible: { opacity: 1 },
  mediaProgressFill: {
    height: '100%',
    backgroundColor: BRAND,
  },
  videoBox: {
    width: 260,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  videoThumb: { width: '100%', height: '100%' },
  videoThumbFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  playFab: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationBadgeAbs: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 220,
    maxWidth: 280,
    overflow: 'hidden',
  },
  fileRowMine: { backgroundColor: 'rgba(255,255,255,0.35)' },
  fileRowTheirs: { backgroundColor: 'rgba(241,245,249,0.95)' },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(44,154,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: { fontWeight: '700', fontSize: 14 },
  fileHint: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
  fileProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  fileProgressFill: { height: '100%', backgroundColor: BRAND },
});
