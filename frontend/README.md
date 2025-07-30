# Hailey Art Portfolio Frontend

A beautiful, minimalist art portfolio website built with Next.js and TypeScript.

## Features

- **Homepage** with Artist's Pick and Collections grid
- **About page** with artist information and contact details
- **Collection pages** displaying artworks by collection
- **Individual artwork pages** with detailed information
- **Responsive design** that works on all devices
- **Modern UI** with smooth animations and hover effects

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Next.js Image** for optimized images

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── collection/[name]/ # Collection pages
│   ├── artwork/[id]/      # Individual artwork pages
│   └── page.tsx           # Homepage
├── components/            # Reusable components
├── lib/                   # API utilities
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

## API Integration

The frontend connects to your existing backend API at `http://localhost:4000/api` to fetch:
- All artworks
- Artworks by collection
- Individual artwork details
- Collection information

## Design Features

- **Minimalist aesthetic** matching your Figma design
- **Light gray background** (#f5f5f5)
- **Serif fonts** for headings (Georgia)
- **Sans-serif fonts** for body text (Inter)
- **Accent pink** (#ff6b9d) for highlights
- **Hover effects** and smooth transitions
- **Responsive grid layouts**

## Deployment

This can be easily deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Any static hosting service**

Just run `npm run build` and deploy the `.next` folder. 