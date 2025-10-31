import Link from 'next/link';
import { fetchArtworks, getAllCollectionNames } from '@/lib/api';
import { Artwork } from '@/types/artwork';
import NavigationTracker from '@/components/NavigationTracker';

// Generate static paths for all collections
export async function generateStaticParams() {
  const collectionNames = getAllCollectionNames();
  
  return collectionNames.map((name) => ({
    collectionName: encodeURIComponent(name),
  }));
}

function formatCollectionTitle(collectionName: string): string {
  if (/^\d{4}$/.test(collectionName)) {
    return `The ${collectionName} Collection`;
  }
  return `The ${collectionName} Collection`;
}

export default async function CollectionPage({ 
  params 
}: { 
  params: { collectionName: string } 
}) {
  const artworks = await fetchArtworks();
  const decodedCollectionName = decodeURIComponent(params.collectionName);
  const collectionArtworks = artworks
    .filter(art => art.collection === decodedCollectionName)
    .sort((a, b) => {
      // Sort by viewOrder first (ascending), then by createdAt for those without viewOrder (descending - newest first)
      const aViewOrder = a.viewOrder !== undefined && a.viewOrder !== null ? a.viewOrder : null;
      const bViewOrder = b.viewOrder !== undefined && b.viewOrder !== null ? b.viewOrder : null;
      
      if (aViewOrder !== null && bViewOrder !== null) {
        return aViewOrder - bViewOrder;
      }
      
      if (aViewOrder !== null && bViewOrder === null) {
        return -1;
      }
      if (aViewOrder === null && bViewOrder !== null) {
        return 1;
      }
      
      // For artworks without viewOrder, sort by createdAt in descending order (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const formattedTitle = formatCollectionTitle(decodedCollectionName);

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <NavigationTracker collectionName={decodedCollectionName} />
      <div className="page-margins py-6">
        <Link href="/" className="back-link">
          Back to Home
        </Link>
      </div>
      
      <main className="page-margins pb-12 pt-3">
        <div className="w-full">
          <div className="text-center mb-10">
            <h1 className="heading-medium">
              {formattedTitle}
            </h1>
          </div>
          
          <div className="artwork-grid">
            {collectionArtworks.length > 0 ? (
              collectionArtworks.map((artwork) => {
                // Use local image path if available
                const imageSrc = artwork.localImagePath || artwork.imageUrl;
                return (
                  <Link key={artwork.id} href={`/artwork/${artwork.id}`}>
                    <div className="artwork-card">
                      <img 
                        src={imageSrc} 
                        alt={artwork.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                );
              })
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
