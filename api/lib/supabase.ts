import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// Create a Supabase client with service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types based on your schema. "Artwork" also still has the legacy
// collection / isCollectionPick / viewOrder columns, which are no longer used.
export interface Artwork {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  medium: string;
  dimensions: string;
  createdAt: string;
  isArtistPick: boolean;
}

export interface Collection {
  id: string;
  name: string;
  displayOrder: number; // position on the homepage
  coverArtworkId: string | null;
  createdAt: string;
}

// An artwork's membership in a collection
export interface ArtworkCollection {
  artworkId: string;
  collectionId: string;
  viewOrder: number | null; // position within the collection
}

export interface Profile {
  id: string;
  imageUrl?: string;
  description?: string;
  updatedAt: string;
}
