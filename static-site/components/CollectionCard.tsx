import Link from 'next/link';
import { Collection } from '@/types/artwork';

interface CollectionCardProps {collection: Collection;}

export default function CollectionCard({ collection }: CollectionCardProps) {
  // Check if it's a year collection (4 digits)
  const isYear = /^\d{4}$/.test(collection.name);
  
  // For year collections, extract last 2 digits
  const yearText = isYear ? collection.name.slice(-2) : '';

  return (
    <Link href={`/collection/${encodeURIComponent(collection.name)}`} className="group">
      <div className="collection-card group-hover:scale-105 transition-transform duration-300 ease-out">
        {collection.thumbnail ? (
          <img 
            src={collection.thumbnail} 
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : null}
        
        {isYear ? (
          <div className="collection-number">{yearText}</div>
        ) : (
          <div className="collection-text">
            {collection.name.split(' ').map((word, index) => (
              <span key={index}>{word}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
