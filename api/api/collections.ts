// Vercel serverless function: list, create and reorder collections
import { supabase } from '../lib/supabase';
import { route, requireString, HttpError } from '../lib/http';
import { compareMembership } from '../lib/collections';

export async function listCollections() {
  const { data: collections, error } = await supabase
    .from('Collection')
    .select('id, name, displayOrder, coverArtworkId, createdAt')
    .order('displayOrder', { ascending: true });
  if (error) throw error;

  const { data: memberships, error: membershipError } = await supabase
    .from('ArtworkCollection')
    .select('collectionId, viewOrder, Artwork(id, imageUrl, createdAt)');
  if (membershipError) throw membershipError;

  return collections.map((c) => {
    const inCollection = (memberships || [])
      .filter((m: any) => m.collectionId === c.id && m.Artwork)
      .map((m: any) => ({ ...m.Artwork, viewOrder: m.viewOrder }))
      .sort(compareMembership);
    // Same rule as the site: the chosen cover, or else the collection's first artwork
    const cover = inCollection.find((a) => a.id === c.coverArtworkId) ?? inCollection[0];
    return {
      ...c,
      artworkCount: inCollection.length,
      coverImageUrl: cover?.imageUrl ?? null,
    };
  });
}

export default route({
  GET: async () => listCollections(),

  // Create a collection at the end of the homepage order
  POST: async (req, res, body) => {
    const name = requireString(body.name, 'Name');
    const { data: last } = await supabase
      .from('Collection')
      .select('displayOrder')
      .order('displayOrder', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('Collection')
      .insert({ name, displayOrder: (last?.displayOrder ?? 0) + 1 })
      .select()
      .single();
    if (error?.code === '23505') throw new HttpError(409, `A collection named "${name}" already exists`);
    if (error) throw error;

    res.status(201).json({ ...data, artworkCount: 0, coverImageUrl: null });
  },

  // Reorder the homepage: body.order is every collection id in the new order
  PUT: async (req, res, body) => {
    const order = body.order;
    if (!Array.isArray(order)) throw new HttpError(400, 'order must be a list of collection ids');

    const { data: all, error } = await supabase.from('Collection').select('id');
    if (error) throw error;
    const ids = (all || []).map((c) => c.id);
    if (order.length !== ids.length || !ids.every((id) => order.includes(id))) {
      throw new HttpError(400, 'order must list every collection exactly once');
    }

    for (const [index, id] of order.entries()) {
      const { error: updateError } = await supabase.from('Collection').update({ displayOrder: index + 1 }).eq('id', id);
      if (updateError) throw updateError;
    }
    return listCollections();
  },
});
