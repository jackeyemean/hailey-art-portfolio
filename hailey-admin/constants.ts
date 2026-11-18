import {
  API_URL as ENV_API_URL,
  ADMIN_KEY as ENV_ADMIN_KEY,
} from '@env'

// EXPO_PUBLIC_API_URL (set in the shell) points a local run at a local API without editing .env
export const API_URL = process.env.EXPO_PUBLIC_API_URL || ENV_API_URL || 'https://hailey-art-api.vercel.app/api'
export const ADMIN_KEY = ENV_ADMIN_KEY ?? ''
