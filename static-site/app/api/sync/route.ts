import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';

const DATA_DIR = path.join(process.cwd(), 'public/data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

interface ArtworkData {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  localImagePath: string;
  collection: string;
  medium: string;
  dimensions: string;
  createdAt: string;
  isArtistPick: boolean;
  isCollectionPick: boolean;
  viewOrder?: number;
}

interface ProfileData {
  id?: string;
  imageUrl: string | null;
  localImagePath: string | null;
  description: string | null;
  updatedAt?: string;
}

async function downloadAndOptimizeImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const chunks: Buffer[] = [];
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          // Optimize image with Sharp - convert to WebP and resize
          const webpPath = outputPath.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
          await sharp(buffer)
            .rotate() // Auto-rotate based on EXIF orientation
            .webp({ quality: 80 })
            .resize(1200, 1200, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .toFile(webpPath);
            
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      response.on('error', (err) => {
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function getImageFilename(imageUrl: string): string {
  const urlParts = imageUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  return filename;
}

async function syncArtworks(): Promise<ArtworkData[]> {
  console.log('🎨 Syncing artworks from Supabase...');
  
  const { data: artworks, error } = await supabase
    .from('Artwork')
    .select('*')
    .order('collection', { ascending: true })
    .order('viewOrder', { ascending: true, nullsFirst: false })
    .order('createdAt', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch artworks: ${error.message}`);
  }

  const artworkData: ArtworkData[] = [];

  for (const artwork of artworks) {
    const filename = getImageFilename(artwork.imageUrl);
    const localImagePath = `/data/images/${filename}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`📥 Downloading: "${artwork.title}"`);
    
    try {
      await downloadAndOptimizeImage(artwork.imageUrl, fullImagePath);
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error);
    }

    artworkData.push({
      id: artwork.id,
      title: artwork.title,
      description: artwork.description || undefined,
      imageUrl: artwork.imageUrl,
      localImagePath: localImagePath,
      collection: artwork.collection,
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      createdAt: artwork.createdAt,
      isArtistPick: artwork.isArtistPick,
      isCollectionPick: artwork.isCollectionPick,
      viewOrder: artwork.viewOrder || undefined,
    });
  }

  return artworkData;
}

async function syncProfile(): Promise<ProfileData | null> {
  console.log('👤 Syncing profile from Supabase...');
  
  const { data: profile, error } = await supabase
    .from('Profile')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!profile) {
    return null;
  }

  let localImagePath: string | null = null;
  
  if (profile.imageUrl) {
    const filename = getImageFilename(profile.imageUrl);
    localImagePath = `/data/images/${filename}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`📥 Downloading profile image`);
    
    try {
      await downloadAndOptimizeImage(profile.imageUrl, fullImagePath);
    } catch (error) {
      console.error(`❌ Failed to process profile image:`, error);
      localImagePath = null;
    }
  }

  return {
    id: profile.id,
    imageUrl: profile.imageUrl,
    localImagePath: localImagePath,
    description: profile.description,
    updatedAt: profile.updatedAt,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    if (!requireAdminKey(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting sync process...');

    // Ensure directories exist
    await fs.ensureDir(DATA_DIR);
    await fs.ensureDir(IMAGES_DIR);

    // Sync data from Supabase
    const artworks = await syncArtworks();
    const profile = await syncProfile();

    // Generate collections data
    const collections = Array.from(
      new Set(artworks.map(art => art.collection))
    ).filter(name => name.trim() !== '').map(name => {
      const collectionArtworks = artworks.filter(art => art.collection === name);
      const collectionPick = collectionArtworks.find(art => art.isCollectionPick);
      const thumbnail = collectionPick?.localImagePath || collectionArtworks[0]?.localImagePath;
      
      return {
        name,
        count: collectionArtworks.length,
        thumbnail
      };
    });

    // Find artist pick
    const artistPick = artworks.find(art => art.isArtistPick) || null;

    // Write data files
    await fs.writeJson(path.join(DATA_DIR, 'artworks.json'), artworks, { spaces: 2 });
    await fs.writeJson(path.join(DATA_DIR, 'collections.json'), collections, { spaces: 2 });
    await fs.writeJson(path.join(DATA_DIR, 'profile.json'), profile, { spaces: 2 });
    await fs.writeJson(path.join(DATA_DIR, 'artist-pick.json'), artistPick, { spaces: 2 });

    // Generate route data for static generation
    const routes = {
      artworkIds: artworks.map(art => art.id),
      collectionNames: collections.map(col => col.name)
    };
    await fs.writeJson(path.join(DATA_DIR, 'routes.json'), routes, { spaces: 2 });

    console.log('✅ Sync completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Static site data synchronized successfully',
      stats: {
        artworks: artworks.length,
        collections: collections.length,
        profile: profile ? 'Updated' : 'None',
        artistPick: artistPick ? artistPick.title : 'None'
      }
    });

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}
