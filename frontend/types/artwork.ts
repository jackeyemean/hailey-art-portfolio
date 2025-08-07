export interface Artwork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
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
  description: string | null;
  updatedAt?: string;
} 