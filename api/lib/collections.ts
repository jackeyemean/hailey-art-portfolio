import { supabase } from './supabase';
import { HttpError } from './http';

export interface CollectionRef {
  id: string;
  name: string;
  viewOrder: number | null; // this artwork's position within the collection
}

// Columns returned for an artwork, with its memberships embedded
const ARTWORK_SELECT =
  'id, title, description, imageUrl, medium, dimensions, createdAt, isArtistPick, ' +
  'ArtworkCollection(viewOrder, Collection(id, name, displayOrder))';

// Flattens the embedded memberships into `collections`, ordered like the homepage
function shapeArtwork(row: any) {
  const { ArtworkCollection: memberships = [], ...artwork } = row;
  const collections: CollectionRef[] = memberships
    .filter((m: any) => m.Collection)
    .sort((a: any, b: any) => a.Collection.displayOrder - b.Collection.displayOrder)
    .map((m: any) => ({ id: m.Collection.id, name: m.Collection.name, viewOrder: m.viewOrder }));
  return { ...artwork, collections };
}

export async function listArtworks() {
  const { data, error } = await supabase
    .from('Artwork')
    .select(ARTWORK_SELECT)
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return (data || []).map(shapeArtwork);
}

export async function getArtwork(id: string) {
  const { data, error } = await supabase.from('Artwork').select(ARTWORK_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, 'Artwork not found');
  return shapeArtwork(data);
}

/**
 * Makes `collectionIds` the artwork's exact set of collections. Collections it stays in keep
 * their position; collections it joins get no position, which places it after the ordered
 * artworks there (newest first) until the collection is reordered.
 */
export async function setArtworkCollections(artworkId: string, collectionIds: unknown) {
  if (!Array.isArray(collectionIds) || collectionIds.some((id) => typeof id !== 'string')) {
    throw new HttpError(400, 'collectionIds must be a list of collection ids');
  }
  const wanted = [...new Set(collectionIds as string[])];

  if (wanted.length > 0) {
    const { data: found, error } = await supabase.from('Collection').select('id').in('id', wanted);
    if (error) throw error;
    if ((found || []).length !== wanted.length) throw new HttpError(400, 'Unknown collection');
  }

  const { data: current, error: currentError } = await supabase
    .from('ArtworkCollection')
    .select('collectionId')
    .eq('artworkId', artworkId);
  if (currentError) throw currentError;
  const have = (current || []).map((m) => m.collectionId as string);

  const toRemove = have.filter((id) => !wanted.includes(id));
  const toAdd = wanted.filter((id) => !have.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('ArtworkCollection')
      .delete()
      .eq('artworkId', artworkId)
      .in('collectionId', toRemove);
    if (error) throw error;

    // A collection shouldn't keep using an artwork that left it as its cover
    const { error: coverError } = await supabase
      .from('Collection')
      .update({ coverArtworkId: null })
      .eq('coverArtworkId', artworkId)
      .in('id', toRemove);
    if (coverError) throw coverError;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('ArtworkCollection')
      .insert(toAdd.map((collectionId) => ({ artworkId, collectionId, viewOrder: null })));
    if (error) throw error;
  }
}

// Order within a collection: artworks with a position first (lowest first), then the rest newest first
export function compareMembership(
  a: { viewOrder: number | null; createdAt: string },
  b: { viewOrder: number | null; createdAt: string },
) {
  if (a.viewOrder !== null && b.viewOrder !== null) return a.viewOrder - b.viewOrder;
  if (a.viewOrder !== null) return -1;
  if (b.viewOrder !== null) return 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
