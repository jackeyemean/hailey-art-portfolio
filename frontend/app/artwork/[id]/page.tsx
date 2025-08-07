import Link from 'next/link';
import { fetchArtworks } from '@/lib/api';
import { Artwork } from '@/types/artwork';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
          <Link href="/" className="back-link">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F3]">
      <div className="page-margins-wide py-4 lg:py-6">
        <Link href="/" className="back-link">
          Back to Home
        </Link>
      </div>
      
      <main className="page-margins-wide pb-8 pt-4 lg:pt-3">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-24">
            
            {/* Left Section - Artwork Image */}
            <div className="space-y-4">
              <div className="w-full h-auto lg:h-[75vh]">
                <img 
                  src={artwork.imageUrl} 
                  alt={artwork.title}
                  className="w-full h-auto lg:h-full lg:object-contain"
                />
              </div>
            </div>
            
            {/* Right Section - Artwork Details */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="heading-large leading-tight">
                  {artwork.title}
                </h1>
                
                <div className="space-y-6">
                  {artwork.description && (
                    <div className="py-4">
                      <p className="body-medium max-w-[16rem]" style={{ lineHeight: '1.1' }}>{artwork.description}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <p className="body-medium">{artwork.collection}</p>
                    <p className="body-medium">{artwork.medium}</p>
                    <p className="body-medium">{artwork.dimensions}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Link href={`/collection/${artwork.collection}`} className="body-large hover:opacity-80 transition-opacity">
                  View More From {artwork.collection}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 