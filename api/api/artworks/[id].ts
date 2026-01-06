// Vercel serverless function
import { supabase } from '../../lib/supabase';
import { requireAdminKey } from '../../lib/auth';
import { uploadImageToSupabase } from '../../lib/supabase-storage';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://hailey-web-admin.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Artwork ID is required' });
  }

  // Parse JSON body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse JSON body:', e);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  
  console.log('Parsed JSON body:', body);

  try {
    if (req.method === 'GET') {
      // Get single artwork
      const { data, error } = await supabase
        .from('Artwork')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      return res.status(200).json(data);

    } else if (req.method === 'PUT') {
      // Update artwork - requires admin key
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { title, description, collection, medium, dimensions, isArtistPick, isCollectionPick, viewOrder } = body || {};
      
      let updateData: any = {
        title,
        description,
        collection,
        medium,
        dimensions,
        isArtistPick: Boolean(isArtistPick),
        isCollectionPick: Boolean(isCollectionPick),
        viewOrder: viewOrder ? parseInt(viewOrder) : null
      };

      // If there's a new image, upload it
      if (body?.image) {
        const imageBuffer = Buffer.from(body.image, 'base64');
        const filename = body.filename || 'artwork.jpg';
        updateData.imageUrl = await uploadImageToSupabase(imageBuffer, filename);
      }

      // Handle exclusive picks logic
      if (Boolean(isArtistPick)) {
        // Clear any existing artist pick (except this artwork)
        await supabase
          .from('Artwork')
          .update({ isArtistPick: false })
          .eq('isArtistPick', true)
          .neq('id', id);
      }

      if (Boolean(isCollectionPick) && collection) {
        // Clear any existing collection pick in this collection (except this artwork)
        await supabase
          .from('Artwork')
          .update({ isCollectionPick: false })
          .eq('collection', collection)
          .eq('isCollectionPick', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('Artwork')
        .update(updateData)
        .eq('id', id)
        .select()
        .limit(1);

      if (error) throw error;

      const artwork = data && data.length > 0 ? data[0] : null;

      if (error) throw error;

      return res.status(200).json(artwork);

    } else if (req.method === 'DELETE') {
      // Delete artwork - requires admin key
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // First get the artwork to delete the image
      const { data: artwork } = await supabase
        .from('Artwork')
        .select('imageUrl')
        .eq('id', id)
        .single();

      if (artwork?.imageUrl) {
        try {
          // Delete image from storage (implement this if needed)
          // await deleteImageFromSupabase(artwork.imageUrl);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }

      const { error } = await supabase
        .from('Artwork')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Artwork deleted successfully' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
