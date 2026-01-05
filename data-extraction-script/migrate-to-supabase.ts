import "dotenv/config";
import { createClient } from '@supabase/supabase-js';
import fs from 'fs-extra';
import path from 'path';
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

const STATIC_DATA_DIR = '../static-site/public/data';
const IMAGES_DIR = path.join(STATIC_DATA_DIR, 'images');
const BUCKET_NAME = 'artwork-images';

interface ExistingArtwork {
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

interface ExistingProfile {
  id?: string;
  imageUrl: string | null;
  localImagePath: string | null;
  description: string | null;
  updatedAt?: string;
}

async function uploadLocalImageToSupabase(localImagePath: string, folder: string): Promise<string> {
  try {
    // Read the local WebP file
    const fullPath = path.join(STATIC_DATA_DIR, localImagePath.replace('/data/', ''));
    
    if (!await fs.pathExists(fullPath)) {
      throw new Error(`Local image not found: ${fullPath}`);
    }

    const imageBuffer = await fs.readFile(fullPath);
    const filename = path.basename(localImagePath);
    const supabaseFilename = `${folder}/${Date.now()}-${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(supabaseFilename, imageBuffer, {
        contentType: 'image/webp',
        upsert: false
      });

    if (error) {
      throw new Error(`Failed to upload ${filename}: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(supabaseFilename);

    console.log(`✅ Uploaded: ${filename} → ${supabaseFilename}`);
    return publicUrl;

  } catch (error) {
    console.error(`❌ Failed to upload image:`, error);
    throw error;
  }
}

async function migrateArtworks(): Promise<void> {
  console.log('🎨 Migrating artworks to Supabase...');
  
  // Read existing artworks data
  const artworksPath = path.join(STATIC_DATA_DIR, 'artworks.json');
  if (!await fs.pathExists(artworksPath)) {
    console.log('No existing artworks.json found');
    return;
  }

  const existingArtworks: ExistingArtwork[] = await fs.readJson(artworksPath);
  console.log(`Found ${existingArtworks.length} artworks to migrate`);

  for (const artwork of existingArtworks) {
    try {
      console.log(`\n📥 Migrating: "${artwork.title}"`);

      // Upload image to Supabase Storage
      const newImageUrl = await uploadLocalImageToSupabase(artwork.localImagePath, 'artworks');

      // Upsert artwork into Supabase database (insert or update if exists)
      const { data, error } = await supabase
        .from('Artwork')
        .upsert({
          id: artwork.id,
          title: artwork.title,
          description: artwork.description || null,
          imageUrl: newImageUrl,
          collection: artwork.collection,
          medium: artwork.medium,
          dimensions: artwork.dimensions,
          createdAt: artwork.createdAt,
          isArtistPick: artwork.isArtistPick,
          isCollectionPick: artwork.isCollectionPick,
          viewOrder: artwork.viewOrder || null,
        });

      if (error) {
        console.error(`❌ Failed to upsert artwork "${artwork.title}":`, error);
        continue;
      }

      console.log(`✅ Migrated artwork: "${artwork.title}"`);

    } catch (error) {
      console.error(`❌ Failed to migrate artwork "${artwork.title}":`, error);
      continue;
    }
  }

  console.log(`\n🎉 Artwork migration completed!`);
}

async function migrateProfile(): Promise<void> {
  console.log('\n👤 Migrating profile to Supabase...');
  
  // Read existing profile data
  const profilePath = path.join(STATIC_DATA_DIR, 'profile.json');
  if (!await fs.pathExists(profilePath)) {
    console.log('No existing profile.json found');
    return;
  }

  const existingProfile: ExistingProfile = await fs.readJson(profilePath);
  
  if (!existingProfile) {
    console.log('No profile data to migrate');
    return;
  }

  try {
    let newImageUrl: string | null = null;

    // Upload profile image if it exists
    if (existingProfile.localImagePath) {
      console.log('📥 Migrating profile image...');
      newImageUrl = await uploadLocalImageToSupabase(existingProfile.localImagePath, 'profile');
    }

    // Upsert profile into Supabase database (insert or update if exists)
    const { data, error } = await supabase
      .from('Profile')
      .upsert({
        id: 1, // Use a fixed ID for profile since there's only one
        imageUrl: newImageUrl,
        description: existingProfile.description,
      });

    if (error) {
      console.error('❌ Failed to upsert profile:', error);
      return;
    }

    console.log('✅ Profile migrated successfully!');

  } catch (error) {
    console.error('❌ Failed to migrate profile:', error);
  }
}

async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration...');

  // Check artworks
  const { data: artworks, error: artworksError } = await supabase
    .from('Artwork')
    .select('id, title')
    .order('createdAt', { ascending: false });

  if (artworksError) {
    console.error('❌ Failed to verify artworks:', artworksError);
  } else {
    console.log(`✅ Found ${artworks.length} artworks in Supabase`);
    artworks.slice(0, 3).forEach(art => console.log(`   - ${art.title}`));
    if (artworks.length > 3) console.log(`   ... and ${artworks.length - 3} more`);
  }

  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('*')
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('❌ Failed to verify profile:', profileError);
  } else if (profile) {
    console.log('✅ Profile found in Supabase');
  } else {
    console.log('ℹ️  No profile in Supabase');
  }
}

async function main() {
  try {
    console.log('🚀 Starting migration from static data to Supabase...');
    console.log(`📁 Reading from: ${STATIC_DATA_DIR}`);
    console.log(`🗄️  Uploading to bucket: ${BUCKET_NAME}`);
    
    // Ensure Supabase Storage bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.error(`❌ Bucket "${BUCKET_NAME}" not found. Please create it in Supabase dashboard first.`);
      process.exit(1);
    }

    await migrateArtworks();
    await migrateProfile();
    await verifyMigration();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test your admin app - it should now show all migrated artworks');
    console.log('2. Use the sync button to regenerate static site data');
    console.log('3. Deploy the updated static site');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
