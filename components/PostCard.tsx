/**
 * Post preview card for the blog feed.
 *
 * Displays a compact summary of a blog post:
 * - Title (links to view mode in the editor)
 * - Excerpt (first 150 chars)
 * - Tags as small badges
 * - Date and reading time
 * - View / Edit action buttons
 */

import Link from 'next/link'
import { Clock, Calendar, Users, Eye, Pencil } from 'lucide-react'
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
    <div className="h-full border border-border/80 rounded-xl p-6 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 group flex flex-col">
      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
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

      {/* Title — clicking takes you straight to view mode */}
      <Link href={`/editor/${post.id}?mode=view`} className="block mb-2">
        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h2>
      </Link>

      {/* Excerpt */}
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
        {post.excerpt}
      </p>

      {/* Footer: date, reading time, collab badge */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/60 mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          <time>{formatDate(post.createdAt)}</time>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>{readingTime(post.content)}</span>
        </div>
        {post.allowCollaboration && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <Users className="size-3" />
            Edits open
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Link
          href={`/editor/${post.id}?mode=view`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <Eye className="size-3.5" />
          View
        </Link>
        <Link
          href={`/editor/${post.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
      </div>
    </div>
  )
}
