/**
 * Home / Blog Feed page — /
 *
 * Displays all published posts with search and tag filtering.
 *
 * WHAT CHANGED (Supabase migration):
 * Before: storage.getPublishedPosts() — direct localStorage call (synchronous)
 * After:  fetch('/api/posts') — HTTP request to our API route (async)
 *
 * The storage import is REMOVED — client components no longer talk to storage directly.
 * Instead they go through the API routes we just created.
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PenSquare } from 'lucide-react'
// REMOVED: import { storage } from '@/lib/storage'   ← no longer needed
import { BlogPost } from '@/lib/types'
import PostCard from '@/components/PostCard'
import SearchBar from '@/components/SearchBar'
import TagFilter from '@/components/TagFilter'

export default function HomePage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  /**
   * Load published posts from the API on mount.
   *
   * BEFORE: setPosts(storage.getPublishedPosts())           ← synchronous, one line
   * AFTER:  fetch → parse JSON → setPosts                    ← async, needs await
   *
   * Hint: useEffect can't be async directly, so define an async function inside it
   *   useEffect(() => {
   *     async function loadPosts() {
   *       const res = await fetch('/api/posts')
   *       const data = await res.json()
   *       setPosts(data)
   *     }
   *     loadPosts()
   *   }, [])
   */
  useEffect(() => {
    // YOUR CODE HERE — fetch from /api/posts and setPosts with the result
    async function loadPosts(){
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data);
    }
    loadPosts()
  }, [])

  // Collect all unique tags from published posts (for the tag filter)
  const allTags = [...new Set(posts.flatMap((p) => p.tags))]

  // Filter posts by search query and selected tags
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTags =
      selectedTags.length === 0 || selectedTags.every((tag) => post.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  /** Toggle a tag in the selected tags list */
  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  /** Update search query (called by SearchBar after debounce) */
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      {/* Hero section */}
      <div className="mb-10 pb-8 border-b border-primary/10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Latest <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Posts</span>
        </h1>
        <p className="text-lg text-muted-foreground">Thoughts, ideas, and tutorials</p>
      </div>

      {/* Search and filter controls */}
      <div className="mb-8 space-y-4">
        <SearchBar onSearch={handleSearch} />
        <TagFilter tags={allTags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />
      </div>

      {/* Post feed */}
      {filteredPosts.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-24 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mb-4 text-primary/30">
            <PenSquare className="size-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {posts.length === 0 ? 'No posts yet' : 'No results found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {posts.length === 0
              ? 'Start writing your first blog post!'
              : 'Try a different search or clear your filters.'}
          </p>
          {posts.length === 0 && (
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg font-medium hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              <PenSquare className="size-4" />
              Write your first post
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
