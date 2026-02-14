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
    template: "%s | Blog",       // Post pages can set their own title: "My Post | Blog"
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Site-wide navigation */}
        <header className="border-b">
          <nav className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Blog
            </Link>
            <Link
              href="/editor"
              className="text-sm px-3 py-1.5 border rounded-md hover:bg-muted transition-colors"
            >
              New Post
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  )
}
