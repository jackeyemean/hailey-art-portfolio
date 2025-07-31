import Link from 'next/link';

export default function Header() {
  return (
    <header className="px-2 py-4">
      <div className="w-full flex justify-between items-center">
        <Link href="/" className="heading-large">
          Hailey Tai
        </Link>
        
        <Link href="/about" className="heading-small">
          About / Contact
        </Link>
      </div>
    </header>
  );
} 