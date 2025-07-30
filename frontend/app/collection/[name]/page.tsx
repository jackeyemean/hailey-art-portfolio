import Link from 'next/link';
import ArtworkCard from '@/components/ArtworkCard';
import SocialMedia from '@/components/SocialMedia';
import { fetchArtworks } from '@/lib/api';
import { notFound } from 'next/navigation';

interface CollectionPageProps {
  params: {
    name: string;
  };
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }: CollectionPageProps) {
  const collectionName = decodeURIComponent(params.name);
  const artworks = await fetchArtworks(collectionName);
  
  if (artworks.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="px-6 py-6">
        <Link href="/" className="text-dark-gray hover:text-accent-pink transition-colors">
          Back to Home
        </Link>
      </div>
      
      <main className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-semibold text-dark-gray text-center mb-12">
            The {collectionName} Collection
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        </div>
      </main>
      
      <footer className="px-6 py-6">
        <SocialMedia />
      </footer>
    </div>
  );
} 