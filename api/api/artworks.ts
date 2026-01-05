import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { requireAdminKey } from '../lib/auth';
import { uploadImageToSupabase } from '../lib/supabase-storage';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://hailey-web-admin.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      requireAdminKey(req, res, () => {});
      
      // Handle multipart form data
      const { title, description, collection, medium, dimensions, isArtistPick, isCollectionPick, viewOrder } = req.body;
      
      let imageUrl = '';
      
      // If there's an image file, upload it
      if (req.body.image) {
        const imageBuffer = Buffer.from(req.body.image, 'base64');
        const filename = req.body.filename || 'artwork.jpg';
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
      requireAdminKey(req, res, () => {});
      
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
    return res.status(500).json({ error: 'Internal server error' });
  }
}
