// Vercel serverless function
import { supabase } from '../lib/supabase';
import { requireAdminKey } from '../lib/auth';
import { uploadImageToSupabase } from '../lib/supabase-storage';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://hailey-web-admin.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('API Request:', req.method, req.url);
  console.log('Headers:', req.headers);
  
  // Parse request body if it exists
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse body:', e);
      body = {};
    }
  }
  console.log('Parsed body:', body);
  
  try {
    if (req.method === 'GET') {
      // Get artworks
      const { collection } = req.query;
      
      let query = supabase
        .from('Artwork')
        .select('*')
        .order('viewOrder', { ascending: true, nullsFirst: false })
        .order('createdAt', { ascending: false });

      if (collection) {
        query = query.eq('collection', collection);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return res.status(200).json(data);

    } else if (req.method === 'POST') {
      // Create artwork - requires admin key
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      console.log('POST body:', body);
      const { title, description, collection, medium, dimensions, isArtistPick, isCollectionPick, viewOrder } = body || {};
      
      let imageUrl = '';
      
      // If there's an image file, upload it
      if (body?.image) {
        const imageBuffer = Buffer.from(body.image, 'base64');
        const filename = body.filename || 'artwork.jpg';
        imageUrl = await uploadImageToSupabase(imageBuffer, filename);
      }

      const { data, error } = await supabase
        .from('Artwork')
        .insert([{
          title,
          description,
          imageUrl,
          collection,
          medium,
          dimensions,
          isArtistPick: isArtistPick === 'true',
          isCollectionPick: isCollectionPick === 'true',
          viewOrder: viewOrder ? parseInt(viewOrder) : null
        }])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);

    } else if (req.method === 'DELETE') {
      // Delete artwork - requires admin key
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Artwork ID is required' });
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
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
