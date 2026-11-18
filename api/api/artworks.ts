// Vercel serverless function: list and create artworks
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase } from '../lib/supabase-storage';
import { route, requireString } from '../lib/http';
import { listArtworks, getArtwork, setArtworkCollections } from '../lib/collections';

export default route({
  GET: async () => listArtworks(),

  POST: async (req, res, body) => {
    const { description, medium, dimensions, isArtistPick, collectionIds = [] } = body;
    const title = requireString(body.title, 'Title');

    const imageUrl = body.image
      ? await uploadImageToSupabase(Buffer.from(body.image, 'base64'), body.filename || 'artwork.jpg')
      : '';

    // Only one artwork can be the artist's pick
    if (isArtistPick) {
      await supabase.from('Artwork').update({ isArtistPick: false }).eq('isArtistPick', true);
    }

    const { data, error } = await supabase
      .from('Artwork')
      .insert([{ title, description, imageUrl, medium, dimensions, isArtistPick: Boolean(isArtistPick) }])
      .select('id')
      .single();
    if (error) throw error;

    await setArtworkCollections(data.id, collectionIds);

    res.status(201).json(await getArtwork(data.id));
  },
});
