import Image from 'next/image';
import Link from 'next/link';
import { Artwork } from '@/types/artwork';

interface ArtworkCardProps {
  artwork: Artwork;
}

export default function ArtworkCard({ artwork }: ArtworkCardProps) {
  return (
    <Link href={`/artwork/${artwork.id}`} className="group">
      <div className="relative overflow-hidden bg-black rounded-lg aspect-square">
        <Image
          src={artwork.imageUrl}
          alt={artwork.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="text-white text-sm font-medium truncate">
            {artwork.title}
          </h3>
        </div>
      </div>
    </Link>
  );
} 