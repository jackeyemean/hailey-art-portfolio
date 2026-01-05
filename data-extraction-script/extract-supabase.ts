import "dotenv/config";
import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const OUTPUT_DIR = '../static-site';
const DATA_DIR = path.join(OUTPUT_DIR, 'public/data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

interface ArtworkData {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  localImagePath: string; // local image path for static site
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
          const originalSize = buffer.length;
          
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
            
          const stats = await fs.stat(webpPath);
          const compression = Math.round((1 - stats.size/originalSize) * 100);
          console.log(`   Optimized: ${(originalSize/1024/1024).toFixed(2)}MB → ${(stats.size/1024/1024).toFixed(2)}MB (${compression}% smaller)`);
            
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
  // Extract filename from Supabase Storage URL
  const urlParts = imageUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  return filename;
}

async function extractArtworks(): Promise<ArtworkData[]> {
  console.log('Extracting artwork data from Supabase...');
  
  const { data: artworks, error } = await supabase
    .from('Artwork')
    .select('*')
    .order('collection', { ascending: true })
    .order('viewOrder', { ascending: true, nullsFirst: false })
    .order('createdAt', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch artworks: ${error.message}`);
  }

  console.log(`Found ${artworks.length} artworks`);

  const artworkData: ArtworkData[] = [];

  for (const artwork of artworks) {
    const filename = getImageFilename(artwork.imageUrl);
    const localImagePath = `/data/images/${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`📥 Downloading and optimizing "${artwork.title}": ${filename}`);
    
    try {
      await downloadAndOptimizeImage(artwork.imageUrl, fullImagePath);
      console.log(`✅ Complete: ${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`);
    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error);
      // Continue with the original URL as fallback
    }

    artworkData.push({
      id: artwork.id,
      title: artwork.title,
      description: artwork.description || undefined,
      imageUrl: artwork.imageUrl, // Keep original for reference
      localImagePath: localImagePath, // New local path
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

async function extractProfile(): Promise<ProfileData | null> {
  console.log('Extracting profile data from Supabase...');
  
  const { data: profile, error } = await supabase
    .from('Profile')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  if (!profile) {
    console.log('No profile found');
    return null;
  }

  let localImagePath: string | null = null;
  
  if (profile.imageUrl) {
    const filename = getImageFilename(profile.imageUrl);
    localImagePath = `/data/images/${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`📥 Downloading and optimizing profile image: ${filename}`);
    
    try {
      await downloadAndOptimizeImage(profile.imageUrl, fullImagePath);
      console.log(`✅ Complete: ${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`);
    } catch (error) {
      console.error(`❌ Failed to process profile image ${filename}:`, error);
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

async function generateStaticData(): Promise<void> {
  console.log('Generating static data files...');
  
  await fs.ensureDir(DATA_DIR);
  await fs.ensureDir(IMAGES_DIR);

  const artworks = await extractArtworks();
  const profile = await extractProfile();

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

  // artist pick
  const artistPick = artworks.find(art => art.isArtistPick) || null;

  // data files
  await fs.writeJson(path.join(DATA_DIR, 'artworks.json'), artworks, { spaces: 2 });
  await fs.writeJson(path.join(DATA_DIR, 'collections.json'), collections, { spaces: 2 });
  await fs.writeJson(path.join(DATA_DIR, 'profile.json'), profile, { spaces: 2 });
  await fs.writeJson(path.join(DATA_DIR, 'artist-pick.json'), artistPick, { spaces: 2 });

  // generate route data for static generation
  const routes = {
    artworkIds: artworks.map(art => art.id),
    collectionNames: collections.map(col => col.name)
  };
  await fs.writeJson(path.join(DATA_DIR, 'routes.json'), routes, { spaces: 2 });

  console.log('Generated data files:');
  console.log(`   - artworks.json (${artworks.length} items)`);
  console.log(`   - collections.json (${collections.length} items)`);
  console.log(`   - profile.json`);
  console.log(`   - artist-pick.json`);
  console.log(`   - routes.json`);
  console.log(`   - Downloaded ${artworks.length + (profile?.localImagePath ? 1 : 0)} images`);
}

async function main() {
  try {
    console.log('Starting data extraction for Hailey Art Portfolio (Supabase)...');
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    await generateStaticData();
    
    console.log('✅ Data extraction completed successfully');
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    process.exit(1);
  }
}

main();
