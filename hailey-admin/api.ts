// api.ts: every call the admin makes to the API
import { API_URL } from './constants';
import {
  Artwork,
  ArtworkInput,
  CollectionDetail,
  CollectionSummary,
  Profile,
  PublishStatus,
} from './types';

let adminKey = '';

// Set once at login; sent with every request
export function setAdminKey(key: string) {
  adminKey = key;
}

// An error whose message is safe to show the user as-is
export class ApiError extends Error {}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(adminKey ? { 'x-admin-key': adminKey } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (e.g. a platform error page)
  }
  if (!res.ok) {
    if (res.status === 413) throw new ApiError('That image is too large to upload.');
    if (res.status === 503 && data?.error) throw new ApiError(data.error); // e.g. publishing not set up
    if (res.status >= 500) throw new ApiError('Something went wrong on the server. Try again in a moment.');
    throw new ApiError(data?.error || `Something went wrong (error ${res.status}).`);
  }
  return data as T;
}

// Artworks
export const getArtworks = () => request<Artwork[]>('/artworks');
export const getArtwork = (id: string) => request<Artwork>(`/artworks/${id}`);
export const createArtwork = (input: ArtworkInput) => request<Artwork>('/artworks', 'POST', input);
export const updateArtwork = (id: string, input: ArtworkInput) => request<Artwork>(`/artworks/${id}`, 'PUT', input);
export const deleteArtwork = (id: string) => request<unknown>(`/artworks/${id}`, 'DELETE');

// Collections
export const getCollections = () => request<CollectionSummary[]>('/collections');
export const getCollection = (id: string) => request<CollectionDetail>(`/collections/${id}`);
export const createCollection = (name: string) => request<CollectionSummary>('/collections', 'POST', { name });
export const reorderCollections = (order: string[]) => request<CollectionSummary[]>('/collections', 'PUT', { order });
export const updateCollection = (
  id: string,
  changes: { name?: string; coverArtworkId?: string | null; artworkOrder?: string[] },
) => request<CollectionDetail>(`/collections/${id}`, 'PUT', changes);
export const deleteCollection = (id: string) => request<unknown>(`/collections/${id}`, 'DELETE');

// Profile
export const getProfile = () => request<Profile>('/profile');
export const updateProfile = (input: { description: string; image?: string; filename?: string }) =>
  request<Profile>('/profile', 'PUT', input);

// Publishing
export const getPublishStatus = () => request<PublishStatus>('/publish');
export const syncPreview = () => request<PublishStatus>('/publish', 'POST', { action: 'preview' });
export const syncLive = () => request<PublishStatus>('/publish', 'POST', { action: 'live' });

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
