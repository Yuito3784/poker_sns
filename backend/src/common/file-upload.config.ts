import { diskStorage } from 'multer';
import { extname } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // HEIC/HEIF (スマホの高効率画像)
  'image/heic',
  'image/heif',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes signatures for image validation
const IMAGE_SIGNATURES: { mime: string; check: (buf: Buffer) => boolean }[] = [
  {
    mime: 'image/jpeg',
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: 'image/png',
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  },
  {
    mime: 'image/gif',
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38,
  },
  {
    mime: 'image/webp',
    check: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
  },
  // HEIC/HEIF (High Efficiency Image File Format)
  {
    mime: 'image/heic',
    check: (buf) =>
      buf.length >= 12 &&
      // "ftyp" box at bytes 4-7
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
      // brand starting with "he" (heic / heix / hevc など)
      buf[8] === 0x68 && buf[9] === 0x65,
  },
];

/**
 * Validate uploaded file's magic bytes match an allowed image type.
 * Deletes the file and throws if invalid.
 */
export function validateFileSignature(file: Express.Multer.File): void {
  const header = readFileSync(file.path, { flag: 'r' }).subarray(0, 12);
  const isValid = IMAGE_SIGNATURES.some((sig) => sig.check(header));
  if (!isValid) {
    try { unlinkSync(file.path); } catch { /* best effort cleanup */ }
    throw new BadRequestException(
      'ファイルの内容が許可された画像形式と一致しません。jpg, png, webp, gif, heic のみ対応しています。',
    );
  }
}

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException(
        '許可されていないファイル形式です。jpg, png, webp, gif のみ対応しています。',
      ),
      false,
    );
    return;
  }
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    callback(
      new BadRequestException(
        '許可されていないファイル拡張子です。jpg, jpeg, png, webp, gif のみ対応しています。',
      ),
      false,
    );
    return;
  }
  callback(null, true);
};

/** Get a safe, whitelisted extension from the original filename */
function safeExtname(originalname: string): string {
  const ext = extname(originalname).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : '.bin';
}

export const avatarUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/avatars',
    filename: (_req, file, cb) => {
      const uniqueName = `${uuidv4()}${safeExtname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
};

export const postImageUploadConfig: MulterOptions = {
  storage: diskStorage({
    destination: './uploads/posts',
    filename: (_req, file, cb) => {
      const uniqueName = `${uuidv4()}${safeExtname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
};
