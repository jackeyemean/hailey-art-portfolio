// Vercel serverless function
import { supabase } from '../lib/supabase';
import { requireAdminKey } from '../lib/auth';
import { uploadImageToSupabase } from '../lib/supabase-storage';

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
  console.log('Parsed body:', body);
  
  try {
    if (req.method === 'GET') {
      // Get the single profile (ID = 1)
      const { data, error } = await supabase
        .from('Profile')
        .select('*')
        .eq('id', 1)
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
      
      console.log('PUT body:', body);
      const { description } = body || {};
      
      let updateData: any = { description };

      // If there's a new image, upload it
      if (body?.image) {
        const imageBuffer = Buffer.from(body.image, 'base64');
        const filename = body.filename || 'profile.jpg';
        updateData.imageUrl = await uploadImageToSupabase(imageBuffer, filename, 'profile');
      }

      // Always use upsert with a fixed ID to ensure only one profile row
      const PROFILE_ID = 1; // Fixed ID for the single profile row
      
      const { data, error } = await supabase
        .from('Profile')
        .upsert({
          id: PROFILE_ID,
          ...updateData
        })
        .select()
        .single();

      if (error) throw error;

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
