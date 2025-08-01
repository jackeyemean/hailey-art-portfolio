import Link from 'next/link';
import SocialMedia from '@/components/SocialMedia';
import { fetchProfile } from '@/lib/api';
import { Profile } from '@/types/artwork';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const profile: Profile = await fetchProfile();
  
  return (
    <div className="min-h-screen bg-[#DFE2E4]">
      <div className="px-2 py-8">
        <Link href="/" className="back-link">
          Back
        </Link>
      </div>
      
      <main className="px-2 pb-12 pt-8">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-40 lg:gap-48">
            
            {/* Left Section - Text Content */}
            <div className="space-y-12">
              <div className="space-y-8">
                <h1 className="heading-large leading-tight">
                  From <span className="hailey-pink">Hailey Atelier,</span><br />
                  to you
                </h1>
                
                <div className="body-large space-y-6 leading-relaxed">
                  {profile.description ? (
                    <p>{profile.description}</p>
                  ) : (
                    <>
                      <p>
                        Founded from a lifelong desire to create, Hailey Atelier is a manifestation of my lived experience. My artistic process aims to memorialize emotion onto canvas. With each brushstroke, I preserve the nuance of movement and ambiance.
                      </p>
                      
                      <p>
                        I hope you find the same solace here, that I do in painting.
                      </p>
                      
                      <p>
                        Thank you for visiting Hailey Atelier.
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="pt-6">
                <a 
                  href="mailto:tai.hailey@gmail.com" 
                  className="mono-medium hover:opacity-80 transition-opacity"
                >
                  tai.hailey@gmail.com
                </a>
              </div>
            </div>
            
            {/* Right Section - Portrait and Social Media */}
            <div className="space-y-12">
              <div className="aspect-[315/400] bg-white rounded-lg overflow-hidden">
                {profile.imageUrl ? (
                  <img 
                    src={profile.imageUrl} 
                    alt="Hailey Atelier Portrait"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <p className="text-gray-600">Portrait Image</p>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-6">
                <h2 className="mono-medium">
                  Stay in touch
                </h2>
                
                <SocialMedia />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 