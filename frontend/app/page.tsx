import Header from '@/components/Header';
import CollectionCard from '@/components/CollectionCard';
import { fetchArtworks, fetchCollections } from '@/lib/api';
import { Collection } from '@/types/artwork';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Force revalidation on every request
  const artworks = await fetchArtworks();
  const collectionNames = await fetchCollections();
  
  console.log('Collection names:', collectionNames);
  console.log('Artworks:', artworks);
  
  // Create collection objects with counts, filtering out empty names
  const collections: Collection[] = collectionNames
    .filter(name => name.trim() !== '') // Filter out empty collection names
    .map(name => {
      const count = artworks.filter(art => art.collection === name).length;
      const thumbnail = artworks.find(art => art.collection === name)?.imageUrl;
      return { name, count, thumbnail };
    });
  
  console.log('Collections:', collections);

  return (
    <div className="min-h-screen bg-light-gray">
      <Header />
      
      <main className="px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          
          {/* Left Section - Artist's Pick */}
          <div className="space-y-6">
            <h2 className="serif-font text-xl font-semibold text-dark-gray">
              Artist's Pick
            </h2>
            
            {/* Empty Artist's Pick for now */}
            <div className="bg-black rounded-lg aspect-square flex items-center justify-center">
              <p className="text-white text-lg">Coming Soon</p>
            </div>
            
            <div className="text-sm text-dark-gray">
              <p>View More From</p>
              <p className="font-medium">2024 Collection</p>
            </div>
          </div>
          
          {/* Right Section - Collections */}
          <div className="space-y-6">
            <div>
              <h2 className="serif-font text-xl font-semibold text-dark-gray mb-2">
                Collections
              </h2>
              <p className="text-sm text-dark-gray">
                Personal projects, over the years.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <CollectionCard key={collection.name} collection={collection} />
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <p className="text-dark-gray">No collections found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 