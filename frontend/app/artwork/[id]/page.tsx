import Link from 'next/link';
import Image from 'next/image';
import { fetchArtwork } from '@/lib/api';
import { notFound } from 'next/navigation';

interface ArtworkPageProps {
  params: {
    id: string;
  };
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ArtworkPage({ params }: ArtworkPageProps) {
  try {
    const artwork = await fetchArtwork(params.id);
    
    return (
      <div className="min-h-screen bg-light-gray">
        <div className="px-6 py-6">
          <Link href="/" className="text-dark-gray hover:text-accent-pink transition-colors">
            Back to Home
          </Link>
        </div>
        
        <main className="px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Left - Artwork Image */}
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden border-2 border-blue-500">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  className="object-contain"
                />
              </div>
              
              {/* Right - Artwork Details */}
              <div className="space-y-8">
                <div className="text-center">
                  <h1 className="text-3xl font-semibold text-dark-gray mb-4">
                    "{artwork.title}"
                  </h1>
                  <div className="space-y-2 text-dark-gray">
                    <p>{artwork.medium}</p>
                    <p>{artwork.dimensions}</p>
                  </div>
                </div>
                
                {artwork.description && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-dark-gray">Description</h3>
                    <p className="text-dark-gray leading-relaxed">
                      {artwork.description}
                    </p>
                  </div>
                )}
                
                <div className="pt-8">
                  <Link 
                    href={`/collection/${encodeURIComponent(artwork.collection)}`}
                    className="text-dark-gray hover:text-accent-pink transition-colors"
                  >
                    <p>View More From</p>
                    <p className="font-medium">{artwork.collection} Collection</p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    notFound();
  }
} 