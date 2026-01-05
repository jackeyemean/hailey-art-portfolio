import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminKey } from '@/lib/auth';
import { uploadToS3, deleteFromS3 } from '@/lib/s3-server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('Artwork')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    if (!requireAdminKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing artwork
    const { data: existing, error: fetchError } = await supabase
      .from('Artwork')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    let imageUrl = existing.imageUrl;

    // If new image uploaded, delete old and upload new
    if (image) {
      // Delete old image from S3
      const oldKey = new URL(existing.imageUrl).pathname.slice(1);
      await deleteFromS3(oldKey);

      // Upload new image
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageUrl = await uploadToS3(buffer, image.name, image.type);
    }

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
        .eq('isArtistPick', true)
        .neq('id', params.id);
    }

    // If this artwork is being set as collection pick, unset any existing collection pick in the same collection
    if (isCollectionPick) {
      await supabase
        .from('Artwork')
        .update({ isCollectionPick: false })
        .eq('isCollectionPick', true)
        .eq('collection', collection)
        .neq('id', params.id);
    }

    // Update the artwork
    const { data, error } = await supabase
      .from('Artwork')
      .update({
        title,
        description: description || null,
        collection,
        medium,
        dimensions,
        imageUrl,
        isArtistPick,
        isCollectionPick,
        viewOrder: viewOrder ? parseInt(viewOrder as string) : null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    if (!requireAdminKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get artwork to delete
    const { data: artwork, error: fetchError } = await supabase
      .from('Artwork')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !artwork) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    // Delete image from S3
    const key = new URL(artwork.imageUrl).pathname.slice(1);
    await deleteFromS3(key);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('Artwork')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      id: params.id,
      deletedImageKey: key,
      imageUrl: artwork.imageUrl,
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
