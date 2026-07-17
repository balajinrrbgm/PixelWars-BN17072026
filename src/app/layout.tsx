import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PixelWars — Million-Scale Collaborative Canvas',
  description:
    'A real-time collaborative pixel canvas powered by DynamoDB — built for 1 million concurrent players. Place pixels, fight for territory, and watch the canvas evolve.',
  keywords: ['DynamoDB', 'real-time', 'collaborative', 'pixel art', 'WebSocket', 'AWS', 'game'],
  openGraph: {
    title: 'PixelWars',
    description: 'Real-time collaborative pixel canvas at internet scale',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
