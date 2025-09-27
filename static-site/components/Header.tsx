import Link from 'next/link';

export default function Header() {
  return (
    <header className="page-margins py-6">
      <div className="w-full flex justify-between items-end">
        <div className="heading-medium">Hailey Tai</div>
        
        <Link href="/about" className="heading-small">About / Contact</Link>
      </div>
    </header>
  );
}
