import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminKey } from '@/lib/auth';
import { uploadImageToSupabase } from '@/lib/supabase-storage';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return NextResponse.json(data || { imageUrl: null, description: null });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check admin authentication
    if (!requireAdminKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    const description = formData.get('description') as string;
    
    let imageUrl = null;

    // Upload image if provided
    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageUrl = await uploadImageToSupabase(buffer, image.name, 'profile');
    }

    // Get existing profile
    const { data: existingProfile } = await supabase
      .from('Profile')
      .select('*')
      .single();

    let profile;

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('Profile')
        .update({
          description: description || existingProfile.description,
          imageUrl: imageUrl || existingProfile.imageUrl,
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) throw error;
      profile = data;
    } else {
      // Create new profile
      const { data, error } = await supabase
        .from('Profile')
        .insert({
          description: description || null,
          imageUrl: imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      profile = data;
    }

    return NextResponse.json(profile);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
