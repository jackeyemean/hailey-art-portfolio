import Link from 'next/link';
import SocialMedia from '@/components/SocialMedia';
import { fetchProfile } from '@/lib/api';
import { Profile } from '@/types/artwork';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const profile: Profile = await fetchProfile();
  
  return (
    <div className="bg-[#F7F5F3]">
      <div className="px-4 lg:px-16 py-4 lg:py-6">
        <Link href="/" className="back-link">
          Back
        </Link>
      </div>
      
      <main className="px-4 lg:px-16 py-8">
        <div className="w-full">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 2xl:gap-20 lg:pl-8 xl:pl-12 2xl:pl-16 lg:pr-8 xl:pr-12 2xl:pr-16">
            
            {/* Left Section - Text Content */}
                                                                                                       <div className="flex flex-col justify-between items-start h-full">
                 <div className="flex flex-col space-y-4 lg:space-y-6 xl:space-y-8 flex-1">
                <h1 className="heading-large-small leading-tight">
                  From <span className="hailey-pink">Hailey Atelier,</span><br />
                  to you
                </h1>
                
                <div className="body-large space-y-3 lg:space-y-4 xl:space-y-6 leading-relaxed">
                  {profile.description ? (
                    <div className="whitespace-pre-wrap">{profile.description}</div>
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
             
             <div className="pt-2 lg:pt-4 xl:pt-6">
               <a 
                 href="mailto:tai.hailey@gmail.com" 
                 className="mono-medium hover:opacity-80 transition-opacity"
               >
                 tai.hailey@gmail.com
               </a>
             </div>
           </div>
           
                       {/* Right Section - Portrait and Social Media */}
                                                   <div className="flex flex-col justify-between items-center h-full">
                <div className="flex flex-col items-center flex-1">
               <div className="aspect-[800/650] bg-white rounded-lg overflow-hidden w-full max-w-[400px] lg:max-w-[500px] xl:max-w-[600px] 2xl:max-w-[700px]">
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
               
               <div className="w-full space-y-2 lg:space-y-3 xl:space-y-4 2xl:space-y-5 mt-4 lg:mt-6 xl:mt-8 2xl:mt-10">
                 <h2 className="mono-medium text-center">
                   Stay in touch
                 </h2>
                 
                 <div className="flex justify-center">
                   <SocialMedia />
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     </main>
   </div>
 );
} 