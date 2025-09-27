import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hailey Atelier',
  description: 'Art Portfolio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&family=Nanum+Myeongjo:wght@300;400&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-light-gray">{children}</body>
    </html>
  )
} 