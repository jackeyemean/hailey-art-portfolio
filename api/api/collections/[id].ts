// Vercel serverless function: one collection, with its artworks in order
import { supabase } from '../../lib/supabase';
import { route, requireString, HttpError } from '../../lib/http';
import { compareMembership } from '../../lib/collections';

async function getCollection(id: string) {
  const { data: collection, error } = await supabase
    .from('Collection')
    .select('id, name, displayOrder, coverArtworkId, createdAt')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!collection) throw new HttpError(404, 'Collection not found');

  const { data: memberships, error: membershipError } = await supabase
    .from('ArtworkCollection')
    .select('viewOrder, Artwork(id, title, imageUrl, createdAt, isArtistPick)')
    .eq('collectionId', id);
  if (membershipError) throw membershipError;

  const artworks = (memberships || [])
    .filter((m: any) => m.Artwork)
    .map((m: any) => ({ ...m.Artwork, viewOrder: m.viewOrder }))
    .sort(compareMembership);

  return { ...collection, artworks };
}

export default route({
  GET: async (req) => getCollection(req.query.id),

  /**
   * Any of: name (rename), coverArtworkId (an artwork in the collection, or null),
   * artworkOrder (every artwork id in the collection, in the new order).
   */
  PUT: async (req, res, body) => {
    const { id } = req.query;
    const collection = await getCollection(id);
    const memberIds = collection.artworks.map((a: any) => a.id);
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) update.name = requireString(body.name, 'Name');

    if (body.coverArtworkId !== undefined) {
      if (body.coverArtworkId !== null && !memberIds.includes(body.coverArtworkId)) {
        throw new HttpError(400, 'The cover must be an artwork in this collection');
      }
      update.coverArtworkId = body.coverArtworkId;
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabase.from('Collection').update(update).eq('id', id);
      if (error?.code === '23505') throw new HttpError(409, `A collection named "${update.name}" already exists`);
      if (error) throw error;
    }

    if (body.artworkOrder !== undefined) {
      const order = body.artworkOrder;
      if (!Array.isArray(order) || order.length !== memberIds.length || !memberIds.every((a: string) => order.includes(a))) {
        throw new HttpError(400, 'artworkOrder must list every artwork in the collection exactly once');
      }
      for (const [index, artworkId] of order.entries()) {
        const { error } = await supabase
          .from('ArtworkCollection')
          .update({ viewOrder: index + 1 })
          .eq('collectionId', id)
          .eq('artworkId', artworkId);
        if (error) throw error;
      }
    }

    return getCollection(id);
  },

  // Deletes the collection only; its artworks stay and just leave this collection
  DELETE: async (req) => {
    const { id } = req.query;
    await getCollection(id);
    const { error } = await supabase.from('Collection').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Collection deleted' };
  },
});
