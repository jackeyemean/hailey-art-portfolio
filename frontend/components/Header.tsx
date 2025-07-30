import Link from 'next/link';

export default function Header() {
  return (
    <header className="flex justify-between items-center p-6">
      <Link href="/" className="serif-font text-2xl font-semibold text-dark-gray">
        Hailey Tai
      </Link>
      <nav>
        <Link href="/about" className="text-dark-gray hover:text-accent-pink transition-colors">
          About / Contact
        </Link>
      </nav>
    </header>
  );
} 