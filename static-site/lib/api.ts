import { Artwork, Collection, Profile } from '@/types/artwork';
import fs from 'fs';
import path from 'path';

// Static data loading functions - no more API calls!
const DATA_DIR = path.join(process.cwd(), 'public/data');

function loadJsonFile<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents);
}

export async function fetchArtworks(collection?: string): Promise<Artwork[]> {
  const artworks = loadJsonFile<Artwork[]>('artworks.json');
  
  if (collection) {
    return artworks.filter(art => art.collection === collection);
  }
  
  return artworks;
}

export async function fetchArtwork(id: string): Promise<Artwork> {
  const artworks = loadJsonFile<Artwork[]>('artworks.json');
  const artwork = artworks.find(art => art.id === id);
  
  if (!artwork) {
    throw new Error(`Artwork with id ${id} not found`);
  }
  
  return artwork;
}

export async function fetchArtistPick(): Promise<Artwork | null> {
  try {
    const artistPick = loadJsonFile<Artwork | null>('artist-pick.json');
    return artistPick;
  } catch (error) {
    return null;
  }
}

export async function fetchCollectionPick(collection: string): Promise<Artwork | null> {
  const artworks = loadJsonFile<Artwork[]>('artworks.json');
  const collectionPick = artworks.find(art => 
    art.isCollectionPick && art.collection === collection
  );
  
  return collectionPick || null;
}

export async function fetchCollections(): Promise<string[]> {
  const collections = loadJsonFile<Collection[]>('collections.json');
  return collections.map(col => col.name).sort();
}

export async function fetchCollectionsWithData(): Promise<Collection[]> {
  const collections = loadJsonFile<Collection[]>('collections.json');
  return collections;
}

export async function fetchProfile(): Promise<Profile> {
  try {
    const profile = loadJsonFile<Profile>('profile.json');
    return profile || { imageUrl: null, localImagePath: null, description: null };
  } catch (error) {
    console.error('Error loading profile:', error);
    return { imageUrl: null, localImagePath: null, description: null };
  }
}

// Static route generation helpers
export function getAllArtworkIds(): string[] {
  const artworks = loadJsonFile<Artwork[]>('artworks.json');
  return artworks.map(art => art.id);
}

export function getAllCollectionNames(): string[] {
  const collections = loadJsonFile<Collection[]>('collections.json');
  return collections.map(col => col.name);
}
