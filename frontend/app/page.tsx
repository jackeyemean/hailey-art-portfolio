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
    <div className="min-h-screen bg-[#DFE2E4]">
      <Header />
      
      <main className="px-2 py-4">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-24 items-stretch">
            
            {/* Left Section - Artist's Pick */}
            <div className="flex flex-col space-y-4 h-full">
              <h2 className="heading-medium">
                Artist's Pick
              </h2>
              
              {artistPick && (
                <p className="body-medium">
                  "{artistPick.title}"
                </p>
              )}
              
              {artistPick ? (
                <Link href={`/artwork/${artistPick.id}`} className="flex-grow">
                  <div className="artist-pick-card h-full">
                    <img 
                      src={artistPick.imageUrl} 
                      alt={artistPick.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div className="artist-pick-card flex items-center justify-center flex-grow">
                  <p className="text-white text-lg">No artist pick set</p>
                </div>
              )}
              
              {artistPick?.collection && (
                <Link href={`/collection/${artistPick.collection}`} className="space-y-1 block">
                  <p className="body-medium">View More From</p>
                  <p className="heading-small">
                    The {artistPick.collection} Collection
                  </p>
                </Link>
              )}
            </div>
            
            {/* Right Section - Collections */}
            <div className="flex flex-col space-y-4 h-full">
              <h2 className="heading-medium">
                Collections
              </h2>
              
              <p className="body-medium">
                Personal projects, over the years.
              </p>
              
              <div className="grid grid-rows-2 gap-6 flex-grow home-collections" style={{ 
                gridTemplateColumns: `repeat(${Math.max(2, Math.ceil(collections.length / 2))}, 200px)`
              }}>
                {collections.length > 0 ? (
                  collections.map((collection) => (
                    <div key={collection.name} className="w-full">
                      <CollectionCard collection={collection} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-[#000000]">No collections found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 