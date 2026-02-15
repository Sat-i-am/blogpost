/**
 * Root layout — wraps all pages.
 *
 * Provides:
 * - Global fonts (Geist Sans + Geist Mono)
 * - Site-wide metadata (title template, description)
 * - Navigation header with links to Home and New Post
 */

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { PenSquare } from "lucide-react"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Blog",
    template: "%s | Blog",
  },
  description: "A modern blog platform built with Next.js and TipTap",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        {/* Site-wide navigation */}
        <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-md">
          <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Blog</span><span className="text-primary">.</span>
              </Link>
              <Link href="/my-posts" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                My Posts
              </Link>
            </div>
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              <PenSquare className="size-4" />
              Write
            </Link>
          </nav>
        </header>

        <main className="min-h-[calc(100vh-65px)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-primary/10 py-8 mt-16 bg-gradient-to-t from-primary/5 to-transparent">
          <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
            Built with <span className="text-primary font-medium">Next.js</span> & <span className="text-purple-500 font-medium">TipTap</span>
          </div>
        </footer>
      </body>
    </html>
  )
}
