import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hailey Tai - Art Portfolio',
  description: 'Art portfolio showcasing the work of Hailey Tai',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-light-gray">
        {children}
      </body>
    </html>
  )
} 