import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminKey } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collection = searchParams.get('collection');
    
    let query = supabase
      .from('Artwork')
      .select('*')
      .order('viewOrder', { ascending: true, nullsLast: true })
      .order('createdAt', { ascending: false });

    if (collection) {
      query = query.eq('collection', collection);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    if (!requireAdminKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload image to S3
    const imageUrl = await uploadToS3(buffer, image.name, image.type);

    // Get form fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const collection = formData.get('collection') as string;
    const medium = formData.get('medium') as string;
    const dimensions = formData.get('dimensions') as string;
    const isArtistPick = formData.get('isArtistPick') === 'true';
    const isCollectionPick = formData.get('isCollectionPick') === 'true';
    const viewOrder = formData.get('viewOrder');

    // If this artwork is being set as artist's pick, unset any existing artist's pick
    if (isArtistPick) {
      await supabase
        .from('Artwork')
        .update({ isArtistPick: false })
        .eq('isArtistPick', true);
    }

    // If this artwork is being set as collection pick, unset any existing collection pick in the same collection
    if (isCollectionPick) {
      await supabase
        .from('Artwork')
        .update({ isCollectionPick: false })
        .eq('isCollectionPick', true)
        .eq('collection', collection);
    }

    // Create the artwork
    const { data, error } = await supabase
      .from('Artwork')
      .insert({
        title,
        description: description || null,
        imageUrl,
        collection,
        medium,
        dimensions,
        isArtistPick,
        isCollectionPick,
        viewOrder: viewOrder ? parseInt(viewOrder as string) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
