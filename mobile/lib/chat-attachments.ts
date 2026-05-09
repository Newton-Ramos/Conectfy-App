import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImageIfNeeded(uri: string): Promise<{ uri: string; mime: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1680 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mime: 'image/jpeg' };
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function captionForMedia(
  mediaType: string,
  filename: string,
  sizeBytes: number,
): string {
  const sz = formatBytes(sizeBytes);
  let emoji = '📎';
  if (mediaType === 'image') emoji = '📷';
  else if (mediaType === 'video') emoji = '🎬';
  else if (mediaType === 'document') emoji = '📄';
  return `${emoji} ${filename} · ${sz}`;
}
