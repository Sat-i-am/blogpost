/**
 * My Posts page — /my-posts
 *
 * Displays all posts (drafts + published) for the current user.
 * Username is hardcoded to "satyam" for now (will become dynamic when auth is added).
 */

"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PenSquare, Pencil, Trash2, Calendar, Clock } from 'lucide-react'
import { BlogPost } from '@/lib/types'

const USERNAME = 'satyam'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function readingTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${minutes} min read`
}

export default function MyPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadPosts() {
      const res = await fetch(`/api/posts?username=${USERNAME}`)
      const data = await res.json()
      if (res.ok) {
        setPosts(data)
      } else {
        setPosts([])
      }
      setLoading(false)
    }
    loadPosts()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-10 px-6">
        <p className="text-muted-foreground">Loading your posts...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-10 pb-8 border-b border-primary/10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          My <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Posts</span>
        </h1>
        <p className="text-lg text-muted-foreground">All your posts — drafts and published</p>
      </div>

      {posts.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="h-full border border-border/80 rounded-xl p-6 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`px-2.5 py-0.5 text-[11px] font-medium rounded-full ${
                    post.published
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {post.published ? 'Published' : 'Draft'}
                </span>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/editor/${post.id}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="size-3" />
                    {deletingId === post.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {post.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">
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

              <Link
                href={post.published ? `/post/${post.slug}` : `/editor/${post.id}`}
                className="block group flex-1"
              >
                <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors leading-snug">
                  {post.title || 'Untitled'}
                </h2>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
                  {post.excerpt}
                </p>
              </Link>

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <time>{formatDate(post.updatedAt)}</time>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>{readingTime(post.content)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border-2 border-dashed border-primary/20 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mb-4 text-primary/30">
            <PenSquare className="size-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first post to see it here.
          </p>
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground rounded-lg font-medium hover:opacity-90 shadow-md shadow-primary/25 transition-all hover:shadow-lg hover:shadow-primary/30"
          >
            <PenSquare className="size-4" />
            Write your first post
          </Link>
        </div>
      )}
    </div>
  )
}
