import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAdminKey } from '../../lib/auth';
import { uploadImageToSupabase } from '../../lib/supabase-storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      requireAdminKey(req, res, () => {});
      
      const { title, description, collection, medium, dimensions, isArtistPick, isCollectionPick, viewOrder } = req.body;
      
      let updateData: any = {
        title,
        description,
        collection,
        medium,
        dimensions,
        isArtistPick: isArtistPick === 'true',
        isCollectionPick: isCollectionPick === 'true',
        viewOrder: viewOrder ? parseInt(viewOrder) : null
      };

      // If there's a new image, upload it
      if (req.body.image) {
        const imageBuffer = Buffer.from(req.body.image, 'base64');
        const filename = req.body.filename || 'artwork.jpg';
        updateData.imageUrl = await uploadImageToSupabase(imageBuffer, filename);
      }

      const { data, error } = await supabase
        .from('Artwork')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
