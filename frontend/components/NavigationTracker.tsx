'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface NavigationTrackerProps {
  collectionName?: string;
}

export default function NavigationTracker({ collectionName }: NavigationTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Only track non-artwork pages as potential back destinations
    if (!pathname.includes('/artwork/')) {
      let backDestination: { url: string; label: string };

      if (pathname === '/') {
        // Home page
        backDestination = { url: '/', label: 'Back to Home' };
      } else if (pathname.startsWith('/collection/') && collectionName) {
        // Collection page
        backDestination = { 
          url: pathname, 
          label: `Back to ${collectionName}` 
        };
      } else {
        // Other pages default to home
        backDestination = { url: '/', label: 'Back to Home' };
      }

      // Store in sessionStorage so it persists across navigation
      sessionStorage.setItem('artworkBackDestination', JSON.stringify(backDestination));
    }
  }, [pathname, collectionName]);

  // This component doesn't render anything
  return null;
}
