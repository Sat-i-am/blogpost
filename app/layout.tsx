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
import Navbar from "@/components/Navbar"
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
        <Navbar />

        <main className="min-h-[calc(100vh-65px)]">
          {children}
        </main>

        {/* Footer */}
        {/* <footer className="border-t border-primary/10 py-8 mt-16 bg-gradient-to-t from-primary/5 to-transparent">
          <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
            Built with <span className="text-primary font-medium">Next.js</span> & <span className="text-purple-500 font-medium">TipTap</span>
          </div>
        </footer> */}
      </body>
    </html>
  )
}
