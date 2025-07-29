import {
  API_URL as ENV_API_URL,
  ADMIN_KEY as ENV_ADMIN_KEY,
  S3_BUCKET_NAME as ENV_S3_BUCKET_NAME,
} from '@env'

export const API_URL    = ENV_API_URL
export const ADMIN_KEY  = ENV_ADMIN_KEY    ?? ''
export const BUCKET_URL = `https://${ENV_S3_BUCKET_NAME}.s3.amazonaws.com`
