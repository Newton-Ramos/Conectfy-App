import { MessageMediaType } from './entities/message.entity';

export function uploadSubdir(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (
    mimetype === 'application/pdf' ||
    /wordprocessingml|spreadsheetml|presentationml|msword|vnd\.openxmlformats/i.test(mimetype)
  ) {
    return 'documents';
  }
  return 'files';
}

export function inferMediaTypeFromMime(mimetype: string): MessageMediaType {
  if (mimetype.startsWith('image/')) return MessageMediaType.IMAGE;
  if (mimetype.startsWith('video/')) return MessageMediaType.VIDEO;
  if (
    mimetype === 'application/pdf' ||
    /wordprocessingml|spreadsheetml|presentationml|msword|vnd\.openxmlformats/i.test(mimetype)
  ) {
    return MessageMediaType.DOCUMENT;
  }
  return MessageMediaType.FILE;
}
