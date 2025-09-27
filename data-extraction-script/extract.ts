import "dotenv/config";
const { PrismaClient } = require('@prisma/client');
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';

// clients
const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const BUCKET = process.env.S3_BUCKET!;
const OUTPUT_DIR = '../final-static-frontend';
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

async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(outputPath).catch(() => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function getImageFilename(imageUrl: string): string {
  // Extract filename from S3 URL
  const urlParts = imageUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  return filename;
}

async function extractArtworks(): Promise<ArtworkData[]> {
  console.log('Extracting artwork data from database...');
  
  const artworks = await prisma.artwork.findMany({
    orderBy: [
      { collection: 'asc' },
      { viewOrder: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  console.log(`Found ${artworks.length} artworks`);

  const artworkData: ArtworkData[] = [];

  for (const artwork of artworks) {
    const filename = getImageFilename(artwork.imageUrl);
    const localImagePath = `/data/images/${filename}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`Downloading image for "${artwork.title}": ${filename}`);
    
    try {
      await downloadImage(artwork.imageUrl, fullImagePath);
      console.log(`Downloaded: ${filename}`);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
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
      createdAt: artwork.createdAt.toISOString(),
      isArtistPick: artwork.isArtistPick,
      isCollectionPick: artwork.isCollectionPick,
      viewOrder: artwork.viewOrder || undefined,
    });
  }

  return artworkData;
}

async function extractProfile(): Promise<ProfileData | null> {
  console.log('Extracting profile data from database...');
  
  const profile = await prisma.profile.findFirst();
  
  if (!profile) {
    console.log('No profile found');
    return null;
  }

  let localImagePath: string | null = null;
  
  if (profile.imageUrl) {
    const filename = getImageFilename(profile.imageUrl);
    localImagePath = `/data/images/${filename}`;
    const fullImagePath = path.join(IMAGES_DIR, filename);

    console.log(`Downloading profile image: ${filename}`);
    
    try {
      await downloadImage(profile.imageUrl, fullImagePath);
      console.log(`Downloaded profile image: ${filename}`);
    } catch (error) {
      console.error(`Failed to download profile image ${filename}:`, error);
      localImagePath = null;
    }
  }

  return {
    id: profile.id,
    imageUrl: profile.imageUrl,
    localImagePath: localImagePath,
    description: profile.description,
    updatedAt: profile.updatedAt.toISOString(),
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
    console.log('Starting data extraction for Hailey Art Portfolio...');
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    await generateStaticData();
    
    console.log('Successful data extraction');
    
  } catch (error) {
    console.error('Error during extraction:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
