import { Artwork } from '@/types/artwork';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export async function fetchArtworks(collection?: string): Promise<Artwork[]> {
  const url = collection 
    ? `${API_BASE_URL}/artworks?collection=${encodeURIComponent(collection)}`
    : `${API_BASE_URL}/artworks`;
    
  const response = await fetch(url, {
    cache: 'no-store' // Disable caching
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch artworks: ${response.status}`);
  }
  return response.json();
}

export async function fetchArtwork(id: string): Promise<Artwork> {
  const response = await fetch(`${API_BASE_URL}/artworks/${id}`, {
    cache: 'no-store' // Disable caching
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch artwork: ${response.status}`);
  }
  return response.json();
}

export async function fetchArtistPick(): Promise<Artwork | null> {
  const response = await fetch(`${API_BASE_URL}/artworks/artist-pick`, {
    cache: 'no-store' // Disable caching
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null; // No artist pick set
    }
    throw new Error(`Failed to fetch artist pick: ${response.status}`);
  }
  return response.json();
}

export async function fetchCollectionPick(collection: string): Promise<Artwork | null> {
  const response = await fetch(`${API_BASE_URL}/artworks/collection-pick/${encodeURIComponent(collection)}`, {
    cache: 'no-store' // Disable caching
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null; // No collection pick set
    }
    throw new Error(`Failed to fetch collection pick: ${response.status}`);
  }
  return response.json();
}

export async function fetchCollections(): Promise<string[]> {
  const artworks = await fetchArtworks();
  const collections = [...new Set(artworks.map(art => art.collection))];
  return collections.sort();
} 

export async function fetchProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`);
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { imageUrl: null, description: null };
  }
} 