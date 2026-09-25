import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['application/pdf'];

// Store in memory — we extract text then discard the buffer.
// No files are written to disk.
const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new AppError('Only PDF files are accepted', 400));
    return;
  }
  cb(null, true);
}

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
}).single('resume');

/**
 * Wraps multer in a promise so errors surface to asyncHandler
 * and flow through the global error middleware.
 */
export function handleUpload(
  req: Request,
  res: import('express').Response
): Promise<void> {
  return new Promise((resolve, reject) => {
    uploadPdf(req, res, (err) => {
      if (!err) {
        resolve();
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          reject(
            new AppError(
              `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`,
              400
            )
          );
        } else {
          reject(new AppError(`Upload error: ${err.message}`, 400));
        }
      } else {
        reject(err);
      }
    });
  });
}
