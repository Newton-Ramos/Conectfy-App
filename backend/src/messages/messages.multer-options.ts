import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { uploadSubdir } from './messages-upload.helpers';

/**
 * Os tipos oficiais do `multer` para `diskStorage` acoplam-se ao global do servidor HTTP usado pelo Express.
 * O `MulterOptions` do Nest define `storage?: any` e `fileFilter` com metadados de ficheiro inline (sem global).
 * Cast único no argumento de `diskStorage` para o compilador não exigir tipos globais do middleware legado.
 */
function diskStorageLoose(options: {
  destination: string | ((req: unknown, file: unknown, cb: (error: Error | null, destination: string) => void) => void);
  filename?: (
    req: unknown,
    file: unknown,
    cb: (error: Error | null, filename: string) => void,
  ) => void;
}): MulterOptions['storage'] {
  return diskStorage(options as never);
}

export const voiceUploadMulterOptions: MulterOptions = {
  storage: diskStorageLoose({
    destination: join(process.cwd(), 'uploads', 'voice'),
    filename: (_req, file, cb) => {
      const f = file as { originalname: string };
      const ext = extname(f.originalname) || '.m4a';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith('audio/')) {
      callback(new Error('Envie apenas arquivo de áudio'), false);
      return;
    }
    callback(null, true);
  },
};

export const mediaUploadMulterOptions: MulterOptions = {
  storage: diskStorageLoose({
    destination: (_req, file, cb) => {
      const f = file as { mimetype: string };
      const sub = uploadSubdir(f.mimetype);
      const dir = join(process.cwd(), 'uploads', sub);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const f = file as { originalname?: string };
      const ext = extname(f.originalname || '') || '';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 48 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (/\.(exe|bat|cmd|msi|scr)$/i.test(file.originalname || '')) {
      callback(new Error('Tipo de arquivo não permitido'), false);
      return;
    }
    callback(null, true);
  },
};
