// Server Component — runs only on the server, never in the browser.
// Posts and auth are resolved here before any HTML reaches the client,
// which is what makes them appear in View Page Source (SSR).
import { storage } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'
import { BlogPost } from '@/lib/types'
import HomeFeed from '@/components/HomeFeed'

export default async function HomePage() {
  // Read the session from the HTTP cookie — this is unforgeable by the client.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserEmail = user?.email ?? undefined

  let posts: BlogPost[] = []
  try {
    const raw = await storage.getPublishedPosts()
    // Prisma returns Date objects; RSC props must be JSON-serialisable, so convert to ISO strings.
    posts = raw.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  } catch (e) {
    console.error('Failed to load posts:', e)
    // Fall through with empty list — HomeFeed renders the "No posts yet" empty state.
  }

  // Hand off to the client island; all interactivity (search, tag filter) lives there.
  return <HomeFeed initialPosts={posts} currentUserEmail={currentUserEmail} />
}
