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

  const MAX_ATTEMPTS = 4;
  let lastError: any;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (!error) {
      console.log(`[Storage] Upload OK: bucket=${bucket}, path=${fileName}, attempt=${attempt}`);
      return fileName;
    }

    lastError = error;
    const cause: any = (error as any)?.originalError?.cause || (error as any)?.cause;
    const transient =
      cause?.code === 'ECONNRESET' ||
      cause?.code === 'ETIMEDOUT' ||
      cause?.code === 'ENOTFOUND' ||
      String((error as any)?.message || '').includes('fetch failed');

    console.warn(`[Storage] Upload attempt ${attempt}/${MAX_ATTEMPTS} failed:`, (error as any)?.message, cause?.code || '');

    if (!transient) break;
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }

  console.error('[Storage] Upload giving up:', lastError);
  throw Object.assign(new Error('File upload failed'), { status: 500 });
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
