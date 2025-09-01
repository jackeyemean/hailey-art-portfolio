import Header from '@/components/Header';
import CollectionCard from '@/components/CollectionCard';
import NavigationTracker from '@/components/NavigationTracker';
import { fetchArtworks, fetchCollections, fetchArtistPick, fetchCollectionPick } from '@/lib/api';
import { Collection, Artwork } from '@/types/artwork';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Force revalidation on every request
  const artworks = await fetchArtworks();
  const collectionNames = await fetchCollections();
  const artistPick = await fetchArtistPick();
  
  // Create collection objects with counts, filtering out empty names
  const collections: Collection[] = (await Promise.all(
    collectionNames
      .filter(name => name.trim() !== '') // Filter out empty collection names
      .map(async (name) => {
        const count = artworks.filter(art => art.collection === name).length;
        const collectionPick = await fetchCollectionPick(name);
        const thumbnail = collectionPick?.imageUrl || artworks.find(art => art.collection === name)?.imageUrl;
        return { name, count, thumbnail };
      })
  )).sort((a, b) => {
    // Check if both are numbers
    const aIsNumber = !isNaN(Number(a.name));
    const bIsNumber = !isNaN(Number(b.name));
    
    // If both are numbers, sort numerically in descending order
    if (aIsNumber && bIsNumber) {return Number(b.name) - Number(a.name);}
    
    // If only a is a number, a comes first
    if (aIsNumber && !bIsNumber) {return -1;}
    
    // If only b is a number, b comes first
    if (!aIsNumber && bIsNumber) {return 1;}
    
    // If both are text, sort alphabetically in descending order
    return b.name.localeCompare(a.name);
  });

  return (
    <div className="bg-[#F7F5F3]">
      <NavigationTracker />
      <Header />
      <main className="page-margins py-3">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20">
            
            {/* Left Section - Artist's Pick */}
            <div className="flex flex-col items-start artist-pick-section">
              <div className="flex flex-col space-y-4">
                <h2 className="heading-medium">Artist's Pick</h2>
                {artistPick && (<p className="body-medium">"{artistPick.title}"</p>)}
                
                {artistPick ? (
                  <Link href={`/artwork/${artistPick.id}`}>
                    <div className="artist-pick-card">
                      <img src={artistPick.imageUrl} alt={artistPick.title} className="w-full h-full object-cover"/>
                    </div>
                  </Link>
                ) : (<div className="artist-pick-card flex items-center justify-center"><p className="text-white text-lg">No artist pick set</p></div>)}
              </div>
              
              {artistPick?.collection && (
                <Link href={`/collection/${artistPick.collection}`} className="space-y-1 block collection-link mt-4">
                  <p className="body-large">View More From</p>
                  <p className="heading-small collection-title">The {artistPick.collection} Collection</p>
                </Link>
              )}
            </div>
            
            {/* Right Section - Collections */}
            <div className="flex flex-col items-start h-full lg:ml-8">
                <div className="flex flex-col space-y-2">
                  <h2 className="heading-medium">Collections</h2>
                  <p className="body-medium">Personal projects, over the years.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 home-collections mt-4">
                  {collections.length > 0 ? (
                    collections.map((collection) => (
                      <div key={collection.name} className="w-full"><CollectionCard collection={collection} /></div>
                    ))
                  ) : (<div className="col-span-full text-center py-8"><p className="text-[#000000]">No collections found</p></div>)}
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 