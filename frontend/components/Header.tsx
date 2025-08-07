import Link from 'next/link';

export default function Header() {
  return (
    <header className="px-4 lg:px-16 py-6">
      <div className="w-full flex justify-between items-center">
        <div className="heading-medium">
          Hailey Tai
        </div>
        
        <Link href="/about" className="heading-small">
          About / Contact
        </Link>
      </div>
    </header>
  );
} 