// Vercel serverless function: the single artist profile
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../lib/supabase-storage';
import { route } from '../lib/http';

async function getProfileRow() {
  const { data, error } = await supabase.from('Profile').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export default route({
  GET: async () => (await getProfileRow()) || { imageUrl: null, description: null },

  PUT: async (req, res, body) => {
    const updateData: Record<string, unknown> = { description: body.description };
    if (body.image) {
      updateData.imageUrl = await uploadImageToSupabase(Buffer.from(body.image, 'base64'), body.filename || 'profile.jpg', 'profile');
    }

    const existing = await getProfileRow();
    const { data, error } = existing
      ? await supabase.from('Profile').update(updateData).eq('id', existing.id).select().single()
      : await supabase.from('Profile').insert(updateData).select().single();
    if (error) throw error;

    // The replaced portrait is no longer used; failing to remove it shouldn't fail the update
    if (updateData.imageUrl && existing?.imageUrl && existing.imageUrl !== updateData.imageUrl) {
      try {
        await deleteImageFromSupabase(existing.imageUrl);
      } catch (error) {
        console.error('Error deleting replaced profile image:', error);
      }
    }

    return data;
  },
});
