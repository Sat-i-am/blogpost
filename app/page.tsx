/**
 * Home / Blog Feed page — /
 *
 * Displays all published posts with search and tag filtering.
 * Uses localStorage via the storage layer, so this must be a client component.
 *
 * Layout:
 * - SearchBar at the top for text search
 * - TagFilter chips below for filtering by tags
 * - Grid of PostCard components
 * - Empty state with link to /editor if no posts exist
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { storage } from '@/lib/storage'
import { BlogPost } from '@/lib/types'
import PostCard from '@/components/PostCard'
import SearchBar from '@/components/SearchBar'
import TagFilter from '@/components/TagFilter'

export default function HomePage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Load published posts from localStorage on mount
  useEffect(() => {
    setPosts(storage.getPublishedPosts())
  }, [])

  // Collect all unique tags from published posts (for the tag filter)
  const allTags = [...new Set(posts.flatMap((p) => p.tags))]

  // Filter posts by search query and selected tags
  const filteredPosts = posts.filter((post) => {
    // Search filter: match title, excerpt, or tags
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    // Tag filter: post must have ALL selected tags
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Search and filter controls */}
      <div className="mb-6 space-y-3">
        <SearchBar onSearch={handleSearch} />
        <TagFilter tags={allTags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />
      </div>

      {/* Post feed */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {posts.length === 0
              ? 'No posts yet. Write your first one!'
              : 'No posts match your search.'}
          </p>
          {posts.length === 0 && (
            <Link
              href="/editor"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-colors"
            >
              Create your first post
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
