import Link from 'next/link';
import Image from 'next/image';
import SocialMedia from '@/components/SocialMedia';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="px-6 py-6">
        <Link href="/" className="text-dark-gray hover:text-accent-pink transition-colors">
          Back
        </Link>
      </div>
      
      <main className="px-6 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          
          {/* Left Section - Text Content */}
          <div className="space-y-8">
            <h1 className="text-4xl font-light text-dark-gray">
              From <span className="serif-font text-accent-pink">Hailey Atelier</span>, to you
            </h1>
            
            <div className="space-y-6 text-dark-gray serif-font text-lg leading-relaxed">
              <p>
                Founded from a lifelong desire to create, Hailey Atelier is a manifestation of my lived experience. My artistic process aims to memorialize emotion onto canvas. With each brushstroke, I preserve the nuance of movement and ambiance.
              </p>
              <p>
                I hope you find the same solace here, that I do in painting.
              </p>
              <p>
                Thank you for visiting Hailey Atelier.
              </p>
            </div>
            
            <div className="pt-8">
              <a 
                href="mailto:tai.hailey@gmail.com" 
                className="text-dark-gray serif-font text-lg hover:text-accent-pink transition-colors"
              >
                tai.hailey@gmail.com
              </a>
            </div>
          </div>
          
          {/* Right Section - Portrait and Social */}
          <div className="space-y-8">
            <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
              {/* Placeholder for portrait image */}
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <p className="text-gray-600">Portrait Image</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-dark-gray">
                Stay in touch
              </h3>
              <SocialMedia />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 