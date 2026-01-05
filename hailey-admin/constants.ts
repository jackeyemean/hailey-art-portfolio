import {
  API_URL as ENV_API_URL,
  ADMIN_KEY as ENV_ADMIN_KEY,
} from '@env'

console.log('Environment variables loaded:');
console.log('ENV_API_URL:', ENV_API_URL);
console.log('ENV_ADMIN_KEY:', ENV_ADMIN_KEY);

export const API_URL    = ENV_API_URL || 'https://hailey-art-api.vercel.app/api'
export const ADMIN_KEY  = ENV_ADMIN_KEY ?? ''

// No longer needed - images are now served directly from Supabase Storage
// export const BUCKET_URL = `https://${ENV_S3_BUCKET_NAME}.s3.amazonaws.com`
