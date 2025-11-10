import type { Metadata } from 'next'
import { RootProvider } from './providers'
import { AuthProvider } from './context/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tools Hub - API-Powered Online Tools',
  description:
    'A collection of powerful online tools with REST APIs. Convert cases, count words, resize images, generate meta tags, and more.',
  keywords: [
    'tools',
    'api',
    'converter',
    'counter',
    'generator',
    'case converter',
    'word counter',
    'image resizer',
    'color converter',
    'meta tags',
    'blog titles',
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <RootProvider>{children}</RootProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
