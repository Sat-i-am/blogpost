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
import { Calendar, Clock, ArrowLeft, Pencil } from 'lucide-react'
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
      <div className="max-w-3xl mx-auto py-24 px-6 text-center">
        <div className="text-6xl mb-4 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent font-bold">404</div>
        <h1 className="text-2xl font-bold mb-2">Post not found</h1>
        <p className="text-muted-foreground mb-6">
          The post you are looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    )
  }

  if (!post) return null

  return (
    <article className="max-w-3xl mx-auto py-10 px-6">
      {/* Post header */}
      <header className="mb-10">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border border-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-5 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {post.title}
        </h1>

        {/* Meta info: date, reading time, edit link */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            <time>{formatDate(post.createdAt)}</time>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4" />
            <span>{readingTime(post.content)}</span>
          </div>
          <Link
            href={`/editor/${post.id}`}
            className="inline-flex items-center gap-1.5 text-primary hover:underline ml-auto"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </div>
      </header>

      {/* Divider */}
      <hr className="mb-10 border-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Post content rendered from markdown */}
      <div className="prose prose-neutral max-w-none prose-headings:tracking-tight prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-muted prose-pre:border">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.markdown}
        </ReactMarkdown>
      </div>

      {/* Back link */}
      <div className="mt-14 pt-8 border-t border-primary/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to all posts
        </Link>
      </div>
    </article>
  )
}
