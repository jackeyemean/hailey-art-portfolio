import { supabase } from './supabase';
import sharp from 'sharp';

const BUCKET_NAME = 'artwork-images';

export async function uploadImageToSupabase(
  buffer: Buffer,
  filename: string,
  folder: string = 'artworks'
): Promise<string> {
  try {
    // Convert image to WebP with optimization
    const webpBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .webp({ 
        quality: 85,
        effort: 6 // Higher effort = better compression
      })
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .toBuffer();

    // Generate unique filename with WebP extension
    const timestamp = Date.now();
    const cleanFilename = filename.replace(/\.[^/.]+$/, ''); // Remove original extension
    const webpFilename = `${folder}/${timestamp}-${cleanFilename}.webp`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(webpFilename, webpBuffer, {
        contentType: 'image/webp',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(webpFilename);

    console.log(`✅ Image uploaded and converted to WebP: ${webpFilename}`);
    console.log(`📏 Original size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📏 WebP size: ${(webpBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    console.log(`💾 Compression: ${Math.round((1 - webpBuffer.length / buffer.length) * 100)}%`);

    return publicUrl;

  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  try {
    // Extract filename from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    const folder = pathParts[pathParts.length - 2];
    const fullPath = `${folder}/${filename}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fullPath]);

    if (error) {
      console.error('Error deleting image:', error);
      throw error;
    }

    console.log(`🗑️ Deleted image: ${fullPath}`);

  } catch (error) {
    console.error('Error deleting image from Supabase:', error);
    throw error;
  }
}

// Helper function to get optimized image URL with transformations
export function getOptimizedImageUrl(
  publicUrl: string, 
  width?: number, 
  height?: number, 
  quality: number = 85
): string {
  // Supabase doesn't have built-in image transformations like Cloudinary
  // But since we're already converting to WebP, the images are optimized
  return publicUrl;
}
