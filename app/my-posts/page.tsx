/**
 * My Posts page — shows all posts (drafts + published) for the current user.
 *
 * Features:
 * - Fetches all posts by username from GET /api/posts?username=satyam
 * - Shows both draft and published posts with status badges
 * - Each post has: title, excerpt, tags, date, status badge, edit link, delete button
 * - Delete functionality with confirmation
 */

"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Edit, Trash2, Loader2, Users, Lock } from 'lucide-react'
import { BlogPost } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

/**
 * Calculate reading time from HTML content.
 * Strips tags, counts words, divides by 200 wpm.
 */
function readingTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${minutes} min read`
}

/** Format ISO date to "Feb 14, 2026" style. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MyPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch all posts for the current user.
  // We call supabase.auth.getUser() here to get the email from the active session.
  // getUser() is async (network call to validate the cookie), so we store the result
  // in a local variable — no useState needed for the email itself since we only use
  // it once to kick off the fetch.
  useEffect(() => {
    async function fetchPosts() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return

        const res = await fetch(`/api/posts?username=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const data = await res.json()
          setPosts(data)
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  // Delete a post with confirmation
  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      } else {
        alert('Failed to delete post')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col h-[calc(100vh-65px)]">
      {/* Page header — stays fixed while posts scroll */}
      <div className="mb-6 shrink-0">
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            My Posts
          </span>
        </h1>
        <p className="text-muted-foreground">
          All your posts, including drafts and published content
        </p>
      </div>

      {/* Scrollable posts area — flex-1 takes remaining height, min-h-0 allows it to shrink and scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-16">
            <Loader2 className="size-5 animate-spin" />
            Loading your posts...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">You haven't created any posts yet</p>
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
            >
              Create Your First Post
            </Link>
          </div>
        ) : (
        <div className="grid gap-5 sm:grid-cols-2 pb-8">
          {posts.map((post) => (
            <div
              key={post.id}
              className="relative border border-border/80 rounded-xl p-6 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 group"
            >
              {/* Status badges - positioned absolutely in top right */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {post.published && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full inline-flex items-center gap-1 ${
                      post.allowCollaboration
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}
                  >
                    {post.allowCollaboration
                      ? <><Users className="size-3" /> Edits open</>
                      : <><Lock className="size-3" /> Edits locked</>
                    }
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                    post.published
                      ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}
                >
                  {post.published ? 'Published' : 'Draft'}
                </span>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3 pr-20">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Title */}
              <Link href={`/editor/${post.id}`}>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors leading-snug">
                  {post.title || 'Untitled Post'}
                </h2>
              </Link>

              {/* Excerpt */}
              <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
                {post.excerpt}
              </p>

              {/* Footer: date & reading time */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/60 mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <time>{formatDate(post.updatedAt)}</time>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{readingTime(post.content)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Link
                  href={`/editor/${post.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
                >
                  <Edit className="size-3.5" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(post.id, post.title)}
                  disabled={deletingId === post.id}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-destructive/40 text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingId === post.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
