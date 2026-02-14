/**
 * Post preview card for the blog feed.
 *
 * Displays a compact summary of a blog post:
 * - Title (links to the full post)
 * - Excerpt (first 150 chars)
 * - Tags as small badges
 * - Date and reading time
 *
 * Used by the home page (app/page.tsx) to render the post feed.
 */

import Link from 'next/link'
import { BlogPost } from '@/lib/types'

interface PostCardProps {
  post: BlogPost
}

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

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/post/${post.slug}`} className="block group">
      <div className="border rounded-lg p-5 hover:border-primary/50 hover:shadow-sm transition-all">
        {/* Title */}
        <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>

        {/* Excerpt */}
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Footer: tags, date, reading time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Date & reading time */}
          <div className="flex items-center gap-2 shrink-0">
            <time>{formatDate(post.createdAt)}</time>
            <span>&middot;</span>
            <span>{readingTime(post.content)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
