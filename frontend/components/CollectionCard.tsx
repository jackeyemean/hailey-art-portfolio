import Link from 'next/link';
import { Collection } from '@/types/artwork';

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  // Skip rendering if collection name is empty
  if (!collection.name || collection.name.trim() === '') {
    return null;
  }
  
  return (
    <Link href={`/collection/${encodeURIComponent(collection.name)}`} className="group">
      <div className="relative overflow-hidden bg-black rounded-lg aspect-square">
        {collection.thumbnail ? (
          <img
            src={collection.thumbnail}
            alt={collection.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <span className="text-white text-2xl font-bold">
              {collection.count}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="text-white text-sm font-medium">
            {collection.name}
          </h3>
        </div>
      </div>
    </Link>
  );
} 