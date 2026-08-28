import imageCompression from 'browser-image-compression';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function compressAndUploadImage(
  file: File,
  folder: string = 'boxes'
): Promise<string> {
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);

    if (isSupabaseConfigured) {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('box-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.warn('Supabase upload failed, falling back to local object URL:', error.message);
        return URL.createObjectURL(compressedFile);
      }

      const { data: publicUrlData } = supabase.storage
        .from('box-images')
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    }

    return URL.createObjectURL(compressedFile);
  } catch (error) {
    console.error('Image compression error:', error);
    return URL.createObjectURL(file);
  }
}
