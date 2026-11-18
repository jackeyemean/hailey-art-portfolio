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
  collections: string[]; // collection names, in homepage order
  medium: string;
  dimensions: string;
  createdAt: string;
  isArtistPick: boolean;
}

interface CollectionData {
  name: string;
  slug: string; // URL path segment: /collection/<slug>/
  count: number;
  thumbnail?: string;
  artworkIds: string[]; // in display order
}

interface DbCollection {
  id: string;
  name: string;
  displayOrder: number;
  coverArtworkId: string | null;
}

interface DbMembership {
  artworkId: string;
  collectionId: string;
  viewOrder: number | null;
}

interface ProfileData {
  id?: string;
  imageUrl: string | null;
  localImagePath: string | null;
  description: string | null;
  updatedAt?: string;
}

// Retries transient network failures (connection resets, DNS hiccups) before giving up
async function downloadWithRetry(url: string, outputPath: string, attempts = 3): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await downloadAndOptimizeImage(url, outputPath);
    } catch (error) {
      if (attempt >= attempts) throw error;
      console.log(`   ⚠️  Attempt ${attempt} failed (${(error as Error).message}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function downloadAndOptimizeImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const chunks: Buffer[] = [];

    const request = protocol.get(url, (response) => {
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
    request.setTimeout(30000, () => request.destroy(new Error('Download timed out')));
  });
}

function getImageFilename(imageUrl: string): string {
  // Extract filename from Supabase Storage URL. The URL is percent-encoded ("Three%20Ponds"),
  // so decode it and keep only URL-safe characters; otherwise the file is saved with a literal
  // "%20" in its name, which local servers can't serve.
  const urlParts = imageUrl.split('/');
  const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
  return filename.replace(/[^A-Za-z0-9._-]+/g, '-');
}

// Keeps the name readable in the URL while staying safe for any static file server.
// Existing names ("2026", "Sketchbook") map to themselves, so their URLs don't change.
function collectionSlug(name: string): string {
  return name.trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

async function fetchCollectionData() {
  const [collectionsResult, membershipsResult] = await Promise.all([
    supabase.from('Collection').select('id, name, displayOrder, coverArtworkId').order('displayOrder', { ascending: true }),
    supabase.from('ArtworkCollection').select('artworkId, collectionId, viewOrder'),
  ]);
  if (collectionsResult.error) throw new Error(`Failed to fetch collections: ${collectionsResult.error.message}`);
  if (membershipsResult.error) throw new Error(`Failed to fetch collection memberships: ${membershipsResult.error.message}`);
  return {
    collections: collectionsResult.data as DbCollection[],
    memberships: membershipsResult.data as DbMembership[],
  };
}

async function extractArtworks(dbCollections: DbCollection[], memberships: DbMembership[]): Promise<ArtworkData[]> {
  console.log('Extracting artwork data from Supabase...');

  const { data: artworks, error } = await supabase
    .from('Artwork')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch artworks: ${error.message}`);
  }

  console.log(`Found ${artworks.length} artworks`);

  // Collection names per artwork, in homepage order (dbCollections is already sorted)
  const namesFor = (artworkId: string) => dbCollections
    .filter(c => memberships.some(m => m.artworkId === artworkId && m.collectionId === c.id))
    .map(c => c.name);

  const artworkData: ArtworkData[] = [];
  const failures: string[] = [];
  let skipped = 0;

  for (const artwork of artworks) {
    const filename = getImageFilename(artwork.imageUrl);
    const localImagePath = `/data/images/${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    // Uploaded images get a new, unique filename, so one already on disk never needs refreshing
    if (alreadyDownloaded(localImagePath)) {
      skipped++;
    } else {
      console.log(`📥 Downloading and optimizing "${artwork.title}": ${filename}`);
      try {
        await downloadWithRetry(artwork.imageUrl, fullImagePath);
        console.log(`✅ Complete: ${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`);
      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error);
        failures.push(`"${artwork.title}" (${filename})`);
      }

      // Add small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    artworkData.push({
      id: artwork.id,
      title: artwork.title,
      description: artwork.description || undefined,
      imageUrl: artwork.imageUrl, // Keep original for reference
      localImagePath: localImagePath, // New local path
      collections: namesFor(artwork.id),
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      createdAt: artwork.createdAt,
      isArtistPick: artwork.isArtistPick,
    });
  }

  if (skipped > 0) console.log(`⏭️  ${skipped} images already downloaded`);

  // Stop before any data file is written, so a flaky connection can't publish broken image paths
  if (failures.length > 0) {
    throw new Error(`${failures.length} image(s) failed to download, no files were updated. Re-run the script.\n  ${failures.join('\n  ')}`);
  }

  return artworkData;
}

// True when the optimized .webp for a site image path (/data/images/x.webp) is already on disk
function alreadyDownloaded(localImagePath: string): boolean {
  return fs.existsSync(path.join(IMAGES_DIR, path.basename(localImagePath)));
}

async function cleanupOrphanedImages(expectedImages: string[]): Promise<void> {
  console.log('🧹 Cleaning up orphaned images...');
  
  try {
    // Get all existing image files
    const existingFiles = await fs.readdir(IMAGES_DIR);
    const imageFiles = existingFiles.filter(file => 
      file.toLowerCase().endsWith('.webp') || 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') || 
      file.toLowerCase().endsWith('.png')
    );

    let deletedCount = 0;

    for (const file of imageFiles) {
      // Check if this image is expected (in our current Supabase data)
      const isExpected = expectedImages.some(expectedFile => {
        // Extract just the filename from the path
        const expectedFilename = path.basename(expectedFile);
        return file === expectedFilename || file === expectedFilename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      });

      if (!isExpected) {
        const filePath = path.join(IMAGES_DIR, file);
        await fs.remove(filePath);
        console.log(`   🗑️  Removed orphaned image: ${file}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} orphaned images`);
    } else {
      console.log('✅ No orphaned images found');
    }

  } catch (error) {
    console.error('❌ Error during image cleanup:', error);
  }
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

    if (!alreadyDownloaded(localImagePath)) {
      console.log(`📥 Downloading and optimizing profile image: ${filename}`);
      try {
        await downloadWithRetry(profile.imageUrl, fullImagePath);
        console.log(`✅ Complete: ${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`);
      } catch (error) {
        throw new Error(`Profile image ${filename} failed to download, no files were updated. Re-run the script. (${(error as Error).message})`);
      }
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

// Collections as the site uses them: homepage order, each with its artworks in display order
// (positioned artworks first, lowest first, then the rest newest first). Empty collections
// are left out so the homepage never shows a card without an image.
function buildCollections(dbCollections: DbCollection[], memberships: DbMembership[], artworks: ArtworkData[]): CollectionData[] {
  const byId = new Map(artworks.map(a => [a.id, a]));
  const result: CollectionData[] = [];

  for (const collection of dbCollections) {
    const members = memberships
      .filter(m => m.collectionId === collection.id && byId.has(m.artworkId))
      .sort((a, b) => {
        if (a.viewOrder !== null && b.viewOrder !== null) return a.viewOrder - b.viewOrder;
        if (a.viewOrder !== null) return -1;
        if (b.viewOrder !== null) return 1;
        return new Date(byId.get(b.artworkId)!.createdAt).getTime() - new Date(byId.get(a.artworkId)!.createdAt).getTime();
      });
    if (members.length === 0) continue;

    const artworkIds = members.map(m => m.artworkId);
    const coverId = collection.coverArtworkId && artworkIds.includes(collection.coverArtworkId)
      ? collection.coverArtworkId
      : artworkIds[0];

    result.push({
      name: collection.name,
      slug: collectionSlug(collection.name),
      count: artworkIds.length,
      thumbnail: byId.get(coverId)?.localImagePath,
      artworkIds,
    });
  }

  // Two names that differ only in punctuation would otherwise fight over one URL
  const slugs = result.map(c => c.slug);
  const clash = result.find((c, i) => !c.slug || slugs.indexOf(c.slug) !== i);
  if (clash) {
    throw new Error(`Collection "${clash.name}" has no usable URL or shares one with another collection; rename it in the admin, no files were updated.`);
  }

  return result;
}

async function generateStaticData(): Promise<void> {
  console.log('Generating static data files...');

  await fs.ensureDir(DATA_DIR);
  await fs.ensureDir(IMAGES_DIR);

  const { collections: dbCollections, memberships } = await fetchCollectionData();
  const artworks = await extractArtworks(dbCollections, memberships);
  const profile = await extractProfile();
  const collections = buildCollections(dbCollections, memberships, artworks);

  // Clean up orphaned images - build list of expected images
  const expectedImages: string[] = [];
  artworks.forEach(artwork => {
    if (artwork.imageUrl) {
      expectedImages.push(getImageFilename(artwork.imageUrl));
    }
  });
  if (profile?.imageUrl) {
    expectedImages.push(getImageFilename(profile.imageUrl));
  }
  
  await cleanupOrphanedImages(expectedImages);

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
    collectionSlugs: collections.map(col => col.slug)
  };
  await fs.writeJson(path.join(DATA_DIR, 'routes.json'), routes, { spaces: 2 });

  console.log('Generated data files:');
  console.log(`   - artworks.json (${artworks.length} items)`);
  console.log(`   - collections.json (${collections.length} items)`);
  console.log(`   - profile.json`);
  console.log(`   - artist-pick.json`);
  console.log(`   - routes.json`);
  console.log(`   - ${artworks.length + (profile?.localImagePath ? 1 : 0)} images up to date`);
  console.log(`   - Cleaned up orphaned images`);
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
