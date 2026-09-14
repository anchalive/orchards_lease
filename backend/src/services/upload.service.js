import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Upload service — PLACEHOLDER architecture for Cloudinary.
 *
 * Today it accepts an in-memory file (multer memoryStorage) and returns a
 * deterministic fake URL. When ready, replace `uploadBuffer` with a real
 * Cloudinary upload_stream call using config.upload.cloudinary credentials.
 * All callers use { url, publicId } so no downstream changes are needed.
 */

const fakeCdn = (filename) =>
  `https://placehold.co/800x600?text=${encodeURIComponent(filename || 'orchard')}`;

export const uploadBuffer = async (file, folder = 'orchards') => {
  if (config.upload.provider === 'cloudinary') {
    // TODO: real Cloudinary integration
    // const result = await cloudinary.uploader.upload_stream({ folder }, ...);
    logger.warn('[upload] Cloudinary provider selected but not yet implemented — returning placeholder');
  }

  const filename = `${Date.now()}-${(file?.originalname || 'file').replace(/\s+/g, '_')}`;
  const publicId = `${folder}/${filename}`;

  if (config.upload.provider === 'local' || !config.upload.provider) {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, file.buffer);
      
      return {
        url: `/uploads/${filename}`,
        publicId,
        bytes: file?.size || 0,
        provider: 'local',
      };
    } catch (err) {
      logger.error('[upload] Local file write failed, falling back to placeholder', err);
    }
  }

  return {
    url: fakeCdn(file?.originalname),
    publicId,
    bytes: file?.size || 0,
    provider: 'placeholder',
  };
};

export const uploadMany = async (files = [], folder = 'orchards') =>
  Promise.all(files.map((f) => uploadBuffer(f, folder)));

export const destroy = async (publicId) => {
  if (config.upload.provider === 'cloudinary') {
    // TODO: cloudinary.uploader.destroy(publicId)
  }
  logger.info(`[upload:placeholder] destroy ${publicId}`);
  return { result: 'ok' };
};

export default { uploadBuffer, uploadMany, destroy };
