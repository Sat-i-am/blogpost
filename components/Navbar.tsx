'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavbarProps {
  isLoggedIn: boolean
}

export default function Navbar({ isLoggedIn }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Blog</span>
          <span className="text-primary">.</span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Link
                href="/my-posts"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                My Posts
              </Link>
              <Link
                href="/editor"
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <PenSquare className="size-4" />
                Write
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
