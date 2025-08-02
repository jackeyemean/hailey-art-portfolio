import Link from 'next/link';
import { fetchArtworks } from '@/lib/api';
import { Artwork } from '@/types/artwork';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function formatCollectionTitle(collectionName: string): string {
  // If it already ends with "Collection", return as is
  if (collectionName.toLowerCase().endsWith('collection')) {
    return `The ${collectionName}`;
  }
  
  // If it's a year (4 digits), format as "The [Year] Collection"
  if (/^\d{4}$/.test(collectionName)) {
    return `The ${collectionName} Collection`;
  }
  
  // For other names (like "Sketch"), format as "The [Name] Collection"
  return `The ${collectionName} Collection`;
}

export default async function CollectionPage({ 
  params 
}: { 
  params: { collectionName: string } 
}) {
  const artworks = await fetchArtworks();
  const collectionArtworks = artworks.filter(art => art.collection === params.collectionName);
  
  const decodedCollectionName = decodeURIComponent(params.collectionName);
  const formattedTitle = formatCollectionTitle(decodedCollectionName);

  return (
    <div className="min-h-screen bg-[#DFE2E4]">
      <div className="px-16 py-8">
        <div className="w-full max-w-6xl mx-auto">
          <Link href="/" className="back-link">
            Back to Home
          </Link>
        </div>
      </div>
      
      <main className="px-16 pb-12 pt-8">
        <div className="w-full">
          <div className="text-center mb-6">
            <h1 className="heading-medium">
              {formattedTitle}
            </h1>
          </div>
          
          <div className="artwork-grid">
            {collectionArtworks.length > 0 ? (
              collectionArtworks.map((artwork) => (
                <Link key={artwork.id} href={`/artwork/${artwork.id}`}>
                  <div className="artwork-card">
                    <img 
                      src={artwork.imageUrl} 
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-[#000000]">No artworks found in this collection</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 