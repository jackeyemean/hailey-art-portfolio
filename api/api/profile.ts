import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';
import { requireAdminKey } from '../lib/auth';
import { uploadImageToSupabase } from '../lib/supabase-storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://hailey-web-admin.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get profile
      const { data, error } = await supabase
        .from('Profile')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return res.status(200).json(data || { imageUrl: null, description: null });

    } else if (req.method === 'PUT') {
      // Update profile - requires admin key
      requireAdminKey(req, res, () => {});
      
      const { description } = req.body;
      
      let updateData: any = { description };

      // If there's a new image, upload it
      if (req.body.image) {
        const imageBuffer = Buffer.from(req.body.image, 'base64');
        const filename = req.body.filename || 'profile.jpg';
        updateData.imageUrl = await uploadImageToSupabase(imageBuffer, filename, 'profile');
      }

      // Try to update first, if no rows exist, insert
      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id')
        .single();

      let data, error;

      if (existingProfile) {
        // Update existing profile
        ({ data, error } = await supabase
          .from('Profile')
          .update(updateData)
          .eq('id', existingProfile.id)
          .select()
          .single());
      } else {
        // Insert new profile
        ({ data, error } = await supabase
          .from('Profile')
          .insert([updateData])
          .select()
          .single());
      }

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
