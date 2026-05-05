import supabaseAdmin from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const ALLOWED_MIME: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Upload a file to Supabase Storage.
 * Returns the storage path (not the full URL).
 */
export async function uploadFile(
  file: Express.Multer.File,
  bucket: string,
  folder: string,
  allowedTypes: 'image' | 'document' = 'image'
): Promise<string> {
  // Validate MIME type
  if (!ALLOWED_MIME[allowedTypes].includes(file.mimetype)) {
    throw Object.assign(new Error('Invalid file type'), { status: 400 });
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    throw Object.assign(new Error('File too large'), { status: 413 });
  }

  // Generate unique filename
  const ext = path.extname(file.originalname) || '.jpg';
  const fileName = `${folder}/${uuidv4()}${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  console.log(`[Storage] Upload attempt: bucket=${bucket}, path=${fileName}, type=${file.mimetype}, success=${!error}`);

  if (error) {
    console.error('[Storage] Upload error:', error);
    throw Object.assign(new Error('File upload failed'), { status: 500 });
  }

  return fileName;
}

/**
 * Get a public URL for a file in Supabase Storage.
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
  if (error) {
    console.error('[Storage] Delete error:', error);
  }
}
