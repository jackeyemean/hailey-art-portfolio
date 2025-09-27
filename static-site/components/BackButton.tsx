'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BackButtonProps {
  className?: string;
}

export default function BackButton({ className = "back-link opacity-60 hover:opacity-100 transition-opacity" }: BackButtonProps) {
  const router = useRouter();
  const [backDestination, setBackDestination] = useState<{ url: string; label: string }>({ url: '/', label: 'Back to Home' });

  useEffect(() => {
    // Get the stored back destination from sessionStorage
    const stored = sessionStorage.getItem('artworkBackDestination');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBackDestination(parsed);
      } catch (error) {
        console.error('Error parsing back destination:', error);
        setBackDestination({ url: '/', label: 'Back to Home' });
      }
    }
  }, []);

  const handleBack = () => {
    router.push(backDestination.url);
  };

  return (
    <button 
      onClick={handleBack}
      className={className}
    >
      {backDestination.label}
    </button>
  );
}
