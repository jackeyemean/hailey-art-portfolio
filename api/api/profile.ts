// Vercel serverless function
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../lib/supabase-storage';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://hailey-web-admin.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Profile API Request:', req.method, req.url);
  
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

  try {
    if (req.method === 'GET') {
      // Get the single profile (there should only be one)
      const { data, error } = await supabase
        .from('Profile')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Profile GET error:', error);
        throw error;
      }
      
      // Return profile or default empty profile
      const profile = data || { imageUrl: null, description: null };
      return res.status(200).json(profile);

    } else if (req.method === 'PUT') {
      // Update profile - requires admin key
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { description } = body || {};
      
      let updateData: any = { description };

      // If there's a new image, upload it
      if (body?.image) {
        const imageBuffer = Buffer.from(body.image, 'base64');
        const filename = body.filename || 'profile.jpg';
        updateData.imageUrl = await uploadImageToSupabase(imageBuffer, filename, 'profile');
      }

      // Check if a profile already exists
      const { data: existingProfile } = await supabase
        .from('Profile')
        .select('id, imageUrl')
        .limit(1)
        .single();

      let data, error;
      
      if (existingProfile) {
        // Update existing profile
        const result = await supabase
          .from('Profile')
          .update(updateData)
          .eq('id', existingProfile.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Create new profile (UUID will be auto-generated)
        const result = await supabase
          .from('Profile')
          .insert(updateData)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // The replaced portrait is no longer used; failing to remove it shouldn't fail the update
      const previousImageUrl = existingProfile?.imageUrl;
      if (updateData.imageUrl && previousImageUrl && previousImageUrl !== updateData.imageUrl) {
        try {
          await deleteImageFromSupabase(previousImageUrl);
        } catch (error) {
          console.error('Error deleting replaced profile image:', error);
        }
      }

      return res.status(200).json(data);

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Profile API Error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
