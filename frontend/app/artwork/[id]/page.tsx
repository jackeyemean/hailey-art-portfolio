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
      <div className="min-h-screen bg-[#DFE2E4] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#DFE2E4]">
      <div className="px-2 py-8">
        <Link href="/" className="back-link">
          Back to Home
        </Link>
      </div>
      
      <main className="px-2 pb-12 pt-8">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-40 lg:gap-48">
            
            {/* Left Section - Artwork Image */}
            <div className="space-y-8">
              <div className="w-full h-[80vh]">
                <img 
                  src={artwork.imageUrl} 
                  alt={artwork.title}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            {/* Right Section - Artwork Details */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="heading-large leading-tight">
                  "{artwork.title}"
                </h1>
                
                <div className="body-large space-y-4 leading-relaxed">
                  {artwork.description && (
                    <p>{artwork.description}</p>
                  )}
                  
                  <div className="space-y-2">
                    <p><strong>Collection:</strong> {artwork.collection}</p>
                    <p><strong>Medium:</strong> {artwork.medium}</p>
                    <p><strong>Dimensions:</strong> {artwork.dimensions}</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <Link href={`/collection/${artwork.collection}`} className="body-medium hover:opacity-80 transition-opacity">
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