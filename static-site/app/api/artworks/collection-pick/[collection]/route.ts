import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { collection: string } }
) {
  try {
    const { data, error } = await supabase
      .from('Artwork')
      .select('*')
      .eq('isCollectionPick', true)
      .eq('collection', params.collection)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return NextResponse.json(data || null);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
