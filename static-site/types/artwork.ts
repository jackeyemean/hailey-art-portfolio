export interface Artwork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  localImagePath: string; // New field for local image path
  collection: string;
  medium: string;
  dimensions: string;
  createdAt: string;
  isArtistPick: boolean;
  isCollectionPick: boolean;
  viewOrder?: number;
}

export interface Collection {
  name: string;
  count: number;
  thumbnail?: string;
}

export interface Profile {
  id?: string;
  imageUrl: string | null;
  localImagePath: string | null; // New field for local image path
  description: string | null;
  updatedAt?: string;
}
