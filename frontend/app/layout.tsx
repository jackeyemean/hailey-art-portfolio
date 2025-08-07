import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hailey Atelier',
  description: 'Art portfolio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-light-gray">{children}</body>
    </html>
  )
} 