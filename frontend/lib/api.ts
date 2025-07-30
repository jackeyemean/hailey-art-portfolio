import { Artwork } from '@/types/artwork';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export async function fetchArtworks(collection?: string): Promise<Artwork[]> {
  const url = collection 
    ? `${API_BASE_URL}/artworks?collection=${encodeURIComponent(collection)}`
    : `${API_BASE_URL}/artworks`;
    
  const response = await fetch(url, {
    cache: 'no-store', // Disable caching
    next: { revalidate: 0 } // Force revalidation
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch artworks: ${response.status}`);
  }
  return response.json();
}

export async function fetchArtwork(id: string): Promise<Artwork> {
  const response = await fetch(`${API_BASE_URL}/artworks/${id}`, {
    cache: 'no-store', // Disable caching
    next: { revalidate: 0 } // Force revalidation
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch artwork: ${response.status}`);
  }
  return response.json();
}

export async function fetchCollections(): Promise<string[]> {
  const artworks = await fetchArtworks();
  const collections = [...new Set(artworks.map(art => art.collection))];
  return collections.sort();
} 