import Link from 'next/link';
import { fetchArtworks, getAllArtworkIds } from '@/lib/api';
import { Artwork } from '@/types/artwork';
import BackButton from '@/components/BackButton';

// Generate static paths for all artworks
export async function generateStaticParams() {
  const artworkIds = getAllArtworkIds();
  
  return artworkIds.map((id) => ({
    id: id,
  }));
}

export default async function ArtworkPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const artworks = await fetchArtworks();
  const artwork = artworks.find(art => art.id === params.id);

  if (!artwork) {
    return (
      <div className="min-h-screen bg-[#F7F5F3] flex items-center justify-center">
        <div className="text-center">
          <h1 className="heading-medium mb-4">Artwork not found</h1>
          <BackButton />
        </div>
      </div>
    );
  }

  // Group by collection, sort within collections, then sort collections
  const artworksByCollection = new Map<string, Artwork[]>();
  artworks.forEach(art => {
    if (!artworksByCollection.has(art.collection)) {
      artworksByCollection.set(art.collection, []);
    }
    artworksByCollection.get(art.collection)!.push(art);
  });

  // Sort each collection's artworks
  artworksByCollection.forEach(collectionArtworks => {
    collectionArtworks.sort((a, b) => {
      const aViewOrder = a.viewOrder ?? null;
      const bViewOrder = b.viewOrder ?? null;
      
      if (aViewOrder !== null && bViewOrder !== null) return aViewOrder - bViewOrder;
      if (aViewOrder !== null) return -1;
      if (bViewOrder !== null) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  // Sort collections and flatten
  const sortedArtworks = Array.from(artworksByCollection.keys())
    .sort((a, b) => {
      const aIsNumber = /^\d+$/.test(a);
      const bIsNumber = /^\d+$/.test(b);
      
      if (aIsNumber && bIsNumber) return Number(b) - Number(a);
      if (aIsNumber) return -1;
      if (bIsNumber) return 1;
      return a.localeCompare(b);
    })
    .flatMap(collectionName => artworksByCollection.get(collectionName)!);

  const currentIndex = sortedArtworks.findIndex(art => art.id === artwork.id);
  const prevArtwork = currentIndex > 0 ? sortedArtworks[currentIndex - 1] : sortedArtworks[sortedArtworks.length - 1];
  const nextArtwork = currentIndex < sortedArtworks.length - 1 ? sortedArtworks[currentIndex + 1] : sortedArtworks[0];

  // Use local image path if available
  const artworkImageSrc = artwork.localImagePath || artwork.imageUrl;

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      {/* Top navigation bar */}
      <div className="page-margins-wide py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
          <div className="flex justify-between items-center lg:justify-start">
            <BackButton />
            <Link 
              href={`/collection/${artwork.collection}`}
              className="back-link opacity-60 hover:opacity-100 transition-opacity lg:hidden"
            >
              View Collection
            </Link>
          </div>
        </div>
      </div>
      
      <main className="page-margins-wide pb-8 pt-4 lg:pt-3">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
            
            {/* Left Section - Artwork Image */}
            <div className="space-y-4">
              {/* Image container */}
              <div className="w-full h-auto lg:h-[75vh] relative">
                <img 
                  src={artworkImageSrc} 
                  alt={artwork.title}
                  className="w-full h-auto lg:h-full lg:object-contain"
                />
              </div>
              
              {/* Mobile navigation under image */}
              <div className="pt-6 border-t border-black/20 lg:hidden">
                <div className="flex justify-between items-center">
                  <Link 
                    href={`/artwork/${prevArtwork.id}`}
                    className="back-link opacity-60 hover:opacity-100 transition-opacity"
                  >
                    ← Previous
                  </Link>
                  <Link 
                    href={`/artwork/${nextArtwork.id}`}
                    className="back-link opacity-60 hover:opacity-100 transition-opacity"
                  >
                    Next →
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Right Section - Artwork Details */}
            <div className="space-y-6 flex flex-col lg:justify-between lg:min-h-[75vh]">
              <div className="space-y-4">
                <h1 className="artwork-title leading-tight">
                  {artwork.title}
                </h1>
                
                <div className="space-y-6">
                  {artwork.description && (
                    <div className="py-4">
                      <p className="artwork-description max-w-[17rem]" style={{ lineHeight: '1.1' }}>{artwork.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <p className="artwork-description">{artwork.collection}</p>
                    <p className="artwork-description">{artwork.medium}</p>
                    <p className="artwork-description">{artwork.dimensions}</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation positioned at bottom of right column */}
              <div className="pt-6 border-t border-black/20 lg:mt-auto">
                <div className="flex justify-between items-center">
                  <Link 
                    href={`/artwork/${prevArtwork.id}`}
                    className="back-link opacity-60 hover:opacity-100 transition-opacity hidden lg:block"
                  >
                    ← Previous
                  </Link>
                  <Link 
                    href={`/collection/${artwork.collection}`}
                    className="back-link opacity-60 hover:opacity-100 transition-opacity hidden lg:block"
                  >
                    View Collection
                  </Link>
                  <Link 
                    href={`/artwork/${nextArtwork.id}`}
                    className="back-link opacity-60 hover:opacity-100 transition-opacity hidden lg:block"
                  >
                    Next →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
