// Vercel serverless function: read, update and delete one artwork
import { supabase } from '../../lib/supabase';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../../lib/supabase-storage';
import { route, requireString } from '../../lib/http';
import { getArtwork, setArtworkCollections } from '../../lib/collections';

export default route({
  GET: async (req) => getArtwork(req.query.id),

  PUT: async (req, res, body) => {
    const { id } = req.query;
    const existing = await getArtwork(id);
    const { description, medium, dimensions, isArtistPick, collectionIds } = body;

    const updateData: Record<string, unknown> = {
      title: requireString(body.title, 'Title'),
      description,
      medium,
      dimensions,
      isArtistPick: Boolean(isArtistPick),
    };
    if (body.image) {
      updateData.imageUrl = await uploadImageToSupabase(Buffer.from(body.image, 'base64'), body.filename || 'artwork.jpg');
    }

    // Only one artwork can be the artist's pick
    if (isArtistPick) {
      await supabase.from('Artwork').update({ isArtistPick: false }).eq('isArtistPick', true).neq('id', id);
    }

    const { error } = await supabase.from('Artwork').update(updateData).eq('id', id);
    if (error) throw error;

    if (collectionIds !== undefined) await setArtworkCollections(id, collectionIds);

    // The replaced image is no longer used; failing to remove it shouldn't fail the update
    if (updateData.imageUrl && existing.imageUrl && existing.imageUrl !== updateData.imageUrl) {
      try {
        await deleteImageFromSupabase(existing.imageUrl);
      } catch (error) {
        console.error('Error deleting replaced image:', error);
      }
    }

    return getArtwork(id);
  },

  DELETE: async (req) => {
    const { id } = req.query;
    const artwork = await getArtwork(id);

    // Memberships are removed by the database, and any collection using it as a cover is cleared
    const { error } = await supabase.from('Artwork').delete().eq('id', id);
    if (error) throw error;

    // Failing to remove the image shouldn't fail the delete; it only leaves an unused file
    if (artwork.imageUrl) {
      try {
        await deleteImageFromSupabase(artwork.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    return { message: 'Artwork deleted successfully' };
  },
});
