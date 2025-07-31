import Header from '@/components/Header';
import CollectionCard from '@/components/CollectionCard';
import { fetchArtworks, fetchCollections, fetchArtistPick } from '@/lib/api';
import { Collection, Artwork } from '@/types/artwork';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Force revalidation on every request
  const artworks = await fetchArtworks();
  const collectionNames = await fetchCollections();
  const artistPick = await fetchArtistPick();
  
  console.log('Collection names:', collectionNames);
  console.log('Artworks:', artworks);
  console.log('Artist pick:', artistPick);
  
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
            
            {artistPick ? (
              <Link href={`/artwork/${artistPick.id}`}>
                <div className="bg-black rounded-lg aspect-square overflow-hidden relative group cursor-pointer">
                  <img 
                    src={artistPick.imageUrl} 
                    alt={artistPick.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-end">
                    <div className="p-4 text-white">
                      <h3 className="font-medium text-lg">{artistPick.title}</h3>
                      <p className="text-sm opacity-90">{artistPick.collection}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-black rounded-lg aspect-square flex items-center justify-center">
                <p className="text-white text-lg">No artist pick set</p>
              </div>
            )}
            
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