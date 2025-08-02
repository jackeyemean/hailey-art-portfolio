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
    <div className="bg-[#DFE2E4]">
      <Header />
      
             <main className="px-16 py-6">
        <div className="w-full">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 lg:gap-40">
            
                                     {/* Left Section - Artist's Pick */}
            <div className="flex flex-col space-y-4 items-start">
              <h2 className="heading-medium">
                Artist's Pick
              </h2>
              
              {artistPick && (
                <p className="body-medium">
                  "{artistPick.title}"
                </p>
              )}
              
                                           {artistPick ? (
                <Link href={`/artwork/${artistPick.id}`}>
                  <div className="artist-pick-card">
                    <img 
                      src={artistPick.imageUrl} 
                      alt={artistPick.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
              ) : (
                <div className="artist-pick-card flex items-center justify-center">
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
            <div className="flex flex-col space-y-4 ml-8 items-start h-full">
               <h2 className="heading-medium">
                 Collections
               </h2>
               
               <p className="body-medium">
                 Personal projects, over the years.
               </p>
               
                                               <div className="grid grid-rows-2 gap-2 home-collections flex-grow" style={{ 
                  gridTemplateColumns: `repeat(${Math.max(2, Math.ceil(collections.length / 2))}, 1fr)`,
                  gap: '8px',
                  alignContent: 'end'
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