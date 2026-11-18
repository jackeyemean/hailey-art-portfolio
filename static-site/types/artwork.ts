export interface Artwork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  localImagePath: string; // New field for local image path
  collections: string[]; // collection names, in homepage order
  medium: string;
  dimensions: string;
  createdAt: string;
  isArtistPick: boolean;
}

export interface Collection {
  name: string;
  slug: string; // URL path segment: /collection/<slug>/
  count: number;
  thumbnail?: string;
  artworkIds: string[]; // in display order
}

export interface Profile {
  id?: string;
  imageUrl: string | null;
  localImagePath: string | null; // New field for local image path
  description: string | null;
  updatedAt?: string;
}
