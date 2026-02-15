/**
 * Single Post view — /post/[slug]
 *
 * THIS IS NOW A SERVER COMPONENT (no "use client").
 *
 * Why the change?
 * Before (localStorage): Data was only in the browser, so we needed "use client",
 *   useState, useEffect, and fetch() to load the post after the page rendered.
 *   Result: Google/Twitter saw an empty page — bad for SEO.
 *
 * After (Supabase): Data is in the database, which the server can access directly.
 *   The server renders the full HTML before sending it to the browser.
 *   Result: Google sees the complete post — proper SEO at last.
 *
 * What's different:
 * - No "use client" → this runs on the server
 * - No useState/useEffect → the component is an async function that awaits data
 * - No fetch() → we call storage.getPostBySlug() directly (server has DB access)
 * - generateMetadata() → sets <title>, <meta description>, Open Graph tags for SEO
 * - notFound() → Next.js built-in 404 page instead of custom not-found UI
 *
 * Displays a published blog post with:
 * - Title, date, reading time, tags
 * - Rendered markdown content (via react-markdown with GFM + syntax highlighting)
 * - Edit link to /editor/[id]
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Calendar, Clock, ArrowLeft, Pencil } from 'lucide-react'
import { storage } from '@/lib/storage'
import type { Metadata } from 'next'

// --- Type for the route params (Next.js 16 uses Promise for params) ---
type PageProps = {
  params: Promise<{ slug: string }>
}

/**
 * generateMetadata — called by Next.js BEFORE rendering the page.
 *
 * This is the SEO magic. It sets:
 * - <title>Post Title | Blog</title>   (uses the template from layout.tsx)
 * - <meta name="description" content="First 150 chars...">
 * - Open Graph tags (og:title, og:description) — used by Twitter, Facebook, WhatsApp, Slack
 *   when someone shares a link to this post.
 *
 * Without this, social media previews would show generic "Blog" text.
 * With this, they show the actual post title and excerpt.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await storage.getPostBySlug(slug)

  if (!post) {
    return { title: 'Post not found' }
  }

  return {
    title: post.title,                    // becomes "Post Title | Blog" via layout template
    description: post.excerpt,            // <meta name="description">
    openGraph: {
      title: post.title,                  // og:title — shown in social media cards
      description: post.excerpt,          // og:description — shown below the title
      type: 'article',                    // tells platforms this is a blog article
    },
  }
}

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
 * Format a date into a human-readable format.
 * Handles both Date objects (from Prisma) and ISO strings.
 * Example: "Feb 14, 2026"
 */
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Server Component — runs on the server, returns fully rendered HTML.
 *
 * Notice: this is an async function (not possible with client components).
 * We await the data directly — no useState, no useEffect, no loading states.
 * The page arrives fully rendered in the browser.
 */
export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await storage.getPostBySlug(slug)

  // If no post found, show Next.js built-in 404 page
  if (!post) {
    notFound()
  }

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
