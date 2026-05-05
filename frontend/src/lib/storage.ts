import { supabase } from './supabase';

/**
 * Resolves a storage path to a public URL.
 * @param bucket The Supabase storage bucket name (e.g., 'hairlink')
 * @param path The relative path inside the bucket (e.g., 'profile-photos/image.jpg')
 * @returns The full public URL or null if path is missing.
 */
export const getPublicUrl = (bucket: string, path: string | null | undefined): string | null => {
  if (!path) return null;
  
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Resolves a profile photo filename to its full public URL.
 */
export const getProfilePhotoUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  return getPublicUrl('hairlink', `profile-photos/${filename}`);
};
