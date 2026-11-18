// types.ts
export type RootStackParamList = {
  List: undefined;
  Form: { artworkId?: string; collectionId?: string };
  ProfileForm: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string; name: string };
};

// A collection an artwork belongs to, with the artwork's position in it
export interface CollectionRef {
  id: string;
  name: string;
  viewOrder: number | null;
}

export interface Artwork {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  medium: string | null;
  dimensions: string | null;
  createdAt: string;
  isArtistPick: boolean;
  collections: CollectionRef[];
}

export interface ArtworkInput {
  title: string;
  description: string;
  medium: string;
  dimensions: string;
  isArtistPick: boolean;
  collectionIds: string[];
  image?: string; // base64, only when the photo changes
  filename?: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  displayOrder: number;
  coverArtworkId: string | null;
  coverImageUrl: string | null;
  artworkCount: number;
}

export interface CollectionArtwork {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  isArtistPick: boolean;
  viewOrder: number | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  displayOrder: number;
  coverArtworkId: string | null;
  artworks: CollectionArtwork[]; // in display order
}

export interface Profile {
  description: string | null;
  imageUrl: string | null;
}
