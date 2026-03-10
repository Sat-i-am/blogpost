/**
 * PostFeed — client component
 *
 * Why "use client"?
 * Search input and tag filtering require local state (searchQuery, selectedTags)
 * that updates on every user interaction. useState only works in client components.
 
 */

"use client"

import { useState, useCallback } from 'react'
import { PenSquare } from 'lucide-react'
import Link from 'next/link'
import { BlogPost } from '@/lib/types'
import PostCard from '@/components/PostCard'
import SearchBar from '@/components/SearchBar'
import TagFilter from '@/components/TagFilter'

interface PostFeedProps {
  initialPosts: BlogPost[]
  currentUserEmail?: string
}

export default function PostFeed({ initialPosts, currentUserEmail }: PostFeedProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = [...new Set(initialPosts.flatMap((p) => p.tags))]

  const filteredPosts = initialPosts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTags =
      selectedTags.length === 0 || selectedTags.every((tag) => post.tags.includes(tag))

    return matchesSearch && matchesTags
  })

  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  return (
    <>
      <div className="mb-8 space-y-4">
        <SearchBar onSearch={handleSearch} />
        <TagFilter tags={allTags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />
      </div>

      {filteredPosts.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserEmail={currentUserEmail} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mb-4 text-primary/30">
            <PenSquare className="size-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">
            {initialPosts.length === 0 ? 'No posts yet' : 'No results found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {initialPosts.length === 0
              ? 'Start writing your first blog post!'
              : 'Try a different search or clear your filters.'}
          </p>
          {initialPosts.length === 0 && (
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
    </>
  )
}
