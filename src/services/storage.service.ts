import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { STORAGE_BUCKETS } from '../utils/constants';

const supabaseUrl = process.env.SUPABASE_URL?.startsWith('http') 
  ? process.env.SUPABASE_URL 
  : 'http://placeholder.url';

const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
);

export async function uploadGroundPhoto(
  base64File: string,
  groundId: string
): Promise<string | null> {
  try {
    // Basic base64 processing (expects format: data:image/jpeg;base64,...)
    const matches = base64File.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 input string');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Generate unique path: groundId/uuid.ext
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `${groundId}/${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.GROUND_PHOTOS)
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Return the public URL
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.GROUND_PHOTOS)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    logger.error('Failed to upload ground photo', { error, groundId });
    return null;
  }
}

export async function deletePhoto(bucketName: string, path: string): Promise<boolean> {
  try {
    // Extract the relative path if a full URL was passed
    let relativePath = path;
    if (path.includes('/storage/v1/object/public/')) {
      const parts = path.split(`/storage/v1/object/public/${bucketName}/`);
      if (parts.length > 1) {
        relativePath = parts[1];
      }
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([relativePath]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    logger.error('Failed to delete photo from storage', { error, bucketName, path });
    return false;
  }
}
