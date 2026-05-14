import type { Request } from 'express';

/** Payload do utilizador após JwtAuthGuard / JwtStrategy. */
export interface JwtUser {
  userId: number;
  email?: string;
  nome?: string;
  role?: string;
}

/** Request HTTP com `user` populado pelo Passport JWT. */
export type AuthenticatedRequest = Request & { user: JwtUser };

/** Ficheiro gravado em disco pelo Multer (disk storage). */
export interface UploadFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}
