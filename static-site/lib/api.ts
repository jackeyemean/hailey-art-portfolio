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

export async function fetchArtworks(): Promise<Artwork[]> {
  return loadJsonFile<Artwork[]>('artworks.json');
}

export async function fetchArtistPick(): Promise<Artwork | null> {
  try {
    const artistPick = loadJsonFile<Artwork | null>('artist-pick.json');
    return artistPick;
  } catch (error) {
    return null;
  }
}

// Collections in homepage order
export async function fetchCollectionsWithData(): Promise<Collection[]> {
  return loadJsonFile<Collection[]>('collections.json');
}

export async function fetchCollection(slug: string): Promise<Collection | undefined> {
  const collections = await fetchCollectionsWithData();
  return collections.find(col => col.slug === slug);
}

export async function fetchCollectionByName(name: string): Promise<Collection | undefined> {
  const collections = await fetchCollectionsWithData();
  return collections.find(col => col.name === name);
}

// A collection's artworks, in display order
export async function fetchCollectionArtworks(collection: Collection): Promise<Artwork[]> {
  const byId = new Map((await fetchArtworks()).map(art => [art.id, art]));
  return collection.artworkIds.map(id => byId.get(id)).filter((art): art is Artwork => Boolean(art));
}

// Every artwork once, for Previous/Next: each collection in homepage order (an artwork in several
// collections appears where it first occurs), then any artworks not in a collection, newest first
export async function fetchArtworkSequence(): Promise<Artwork[]> {
  const artworks = await fetchArtworks();
  const byId = new Map(artworks.map(art => [art.id, art]));
  const ids = new Set<string>();
  for (const collection of await fetchCollectionsWithData()) {
    collection.artworkIds.forEach(id => { if (byId.has(id)) ids.add(id); });
  }
  const sequence = Array.from(ids).map(id => byId.get(id)!);
  const unfiled = artworks
    .filter(art => !ids.has(art.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return [...sequence, ...unfiled];
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

export function getAllCollectionSlugs(): string[] {
  const collections = loadJsonFile<Collection[]>('collections.json');
  return collections.map(col => col.slug);
}
