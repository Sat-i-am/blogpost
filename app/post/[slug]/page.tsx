/**
 * Single Post view — /post/[slug]
 *
 * Displays a published blog post with:
 * - Title, date, reading time, tags
 * - Rendered markdown content (via react-markdown with GFM + syntax highlighting)
 * - Edit link to /editor/[id]
 *
 * Note: Since we use localStorage (client-only), this is a client component.
 * When migrating to a DB, this can become a server component with generateMetadata for SEO.
 */

"use client"

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { storage } from '@/lib/storage'
import { BlogPost } from '@/lib/types'

/**
 * Calculate reading time based on word count.
 * Assumes average reading speed of 200 words per minute.
 */
function readingTime(text: string): string {
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(words / 200)
  return `${minutes} min read`
}

/**
 * Format an ISO date string into a human-readable format.
 * Example: "2026-02-14T10:30:00Z" -> "Feb 14, 2026"
 */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [post, setPost] = useState<BlogPost | null>(null)
  const [notFound, setNotFound] = useState(false)

  // Load the post from localStorage on mount
  useEffect(() => {
    const found = storage.getPostBySlug(slug)
    if (found) {
      setPost(found)
    } else {
      setNotFound(true)
    }
  }, [slug])

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Post not found</h1>
        <p className="text-muted-foreground mb-4">
          The post you are looking for doesn't exist.
        </p>
        <Link href="/" className="text-primary underline">
          Back to home
        </Link>
      </div>
    )
  }

  if (!post) return null

  return (
    <article className="max-w-3xl mx-auto py-8 px-4">
      {/* Post header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

        {/* Meta info: date, reading time, edit link */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
          <time>{formatDate(post.createdAt)}</time>
          <span>&middot;</span>
          <span>{readingTime(post.content)}</span>
          <span>&middot;</span>
          <Link href={`/editor/${post.id}`} className="text-primary hover:underline">
            Edit
          </Link>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Post content rendered from markdown */}
      <div className="prose prose-neutral max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.markdown}
        </ReactMarkdown>
      </div>

      {/* Back link */}
      <div className="mt-12 pt-6 border-t">
        <Link href="/" className="text-primary hover:underline">
          &larr; Back to all posts
        </Link>
      </div>
    </article>
  )
}
