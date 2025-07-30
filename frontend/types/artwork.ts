export interface Artwork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  collection: string;
  medium: string;
  dimensions: string;
  createdAt: string;
}

export interface Collection {
  name: string;
  count: number;
  thumbnail?: string;
} 