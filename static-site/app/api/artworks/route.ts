import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminKey } from '@/lib/auth';
import { uploadImageToSupabase } from '@/lib/supabase-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const collection = searchParams.get('collection');
    
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
    
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      'Access-Control-Max-Age': '86400',
    },
  });
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

    // Upload image to Supabase Storage with WebP conversion
    const imageUrl = await uploadImageToSupabase(buffer, image.name, 'artworks');

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
    
    return new NextResponse(JSON.stringify(data), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      },
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
