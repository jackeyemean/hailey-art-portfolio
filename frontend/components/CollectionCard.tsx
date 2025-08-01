import Link from 'next/link';
import { Collection } from '@/types/artwork';

interface CollectionCardProps {
  collection: Collection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  // Check if it's a year collection (4 digits)
  const isYear = /^\d{4}$/.test(collection.name);
  
  // For year collections, extract last 2 digits
  const yearText = isYear ? collection.name.slice(-2) : '';
  
  // Check if it's a sketch collection
  const isSketch = collection.name.toLowerCase().includes('sketch');

  return (
    <Link href={`/collection/${encodeURIComponent(collection.name)}`}>
      <div className="collection-card">
        {collection.thumbnail ? (
          <img 
            src={collection.thumbnail} 
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : null}
        
        {isSketch ? (
          <div className="collection-text">
            Sketch
          </div>
        ) : isYear ? (
          <div className="collection-number">
            {yearText}
          </div>
        ) : (
          <div className="collection-text">
            {collection.name}
          </div>
        )}
      </div>
    </Link>
  );
} 