/**
 * Home / Blog Feed — /
 *
 * This is a SERVER component intentionally — no "use client" here.
 *
 * Why server component?
 * - Posts are fetched on the server and baked into the initial HTML response.
 *   The user sees content immediately with no loading flicker.
 * - Better SEO: post titles/excerpts are in the HTML, not injected by JS.
 * - We avoid an extra browser → /api/posts → Supabase round-trip; the server
 *   talks to Supabase directly.
 *
 * This page has no interactivity of its own, so "use client" would give us
 * none of the benefits and all of the downsides (hydration overhead, loading state).
 *
 * The interactive parts (search, tag filter) live in <PostFeed>, which is a
 * client component. We pass the fetched data down to it as props.
 */

import { createClient } from '@/lib/supabase/server'
import { storage } from '@/lib/storage'
import PostFeed from '@/components/PostFeed'

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch posts and the current user in parallel — no reason to wait for one before the other.
  // user may be null (this page is public), PostFeed handles that gracefully.
  
  const [posts, { data: { user } }] = await Promise.all([
    storage.getPublishedPosts(),
    supabase.auth.getUser(),
  ])

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      {/* Static hero — no interactivity, fine to render directly in the server component */}
      <div className="mb-10 pb-8 border-b border-primary/10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Latest <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Posts</span>
        </h1>
        <p className="text-lg text-muted-foreground">Thoughts, ideas, and tutorials</p>
      </div>

      {/*
        Hand off to the client component for everything interactive.
        currentUserEmail is used by PostCard to decide whether to show the Edit button.
      */}
      <PostFeed initialPosts={posts ?? []} currentUserEmail={user?.email} />
    </div>
  )
}
