/**
 * Autosave hook for the blog editor.
 *
 * Debounces editor content, then saves to localStorage via the storage layer.
 * Shows a status indicator: 'idle' -> 'saving' -> 'saved' -> back to 'idle'.
 *
 * This hook assembles a full BlogPost object on each save:
 * - Generates a slug from the title
 * - Converts HTML content to markdown via turndown
 * - Extracts a plain-text excerpt (first 150 chars) for previews
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from './useDebounce'
import { storage } from '@/lib/storage'
import { htmlToMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slugify'
import { BlogPost } from '@/lib/types'

type AutosaveStatus = 'idle' | 'saving' | 'saved'

interface UseAutosaveOptions {
  postId: string
  content: string       // HTML from TipTap
  title: string
  tags: string[]
  delay?: number        // debounce delay in ms (default: 2000)
}

/**
 * Strip HTML tags and return plain text. Used to generate excerpts.
 * Uses regex instead of DOM to avoid "document is not defined" errors during SSR.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function useAutosave({ postId, content, title, tags, delay = 2000 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')

  // Debounce all inputs together as a single string to trigger one save
  const debouncedContent = useDebounce(content, delay)
  const debouncedTitle = useDebounce(title, delay)

  // Track whether this is the initial render (skip saving on mount)
  const isFirstRender = useRef(true) // useRef holds a value that persists across re-renders without triggering one. It starts as true.

  // Track the createdAt date so it doesn't change on every save
  const createdAt = useRef<string>(new Date().toISOString())

  // On mount, load existing post's createdAt if editing
  useEffect(() => {
    const existing = storage.getPostById(postId)
    if (existing) {
      createdAt.current = existing.createdAt
    }
  }, [postId])

  // Save whenever debounced values change (but not on first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Don't save if there's no meaningful content
    if (!debouncedTitle && !debouncedContent) return

    setStatus('saving')

    // Build the post object
    const allSlugs = storage
      .getAllPosts()
      .filter((p) => p.id !== postId)
      .map((p) => p.slug)

    const post: BlogPost = {
      id: postId,
      title: debouncedTitle,
      slug: uniqueSlug(debouncedTitle || 'untitled', allSlugs),
      content: debouncedContent,
      markdown: htmlToMarkdown(debouncedContent),
      excerpt: stripHtml(debouncedContent).slice(0, 150),
      tags,
      createdAt: createdAt.current,
      updatedAt: new Date().toISOString(),
      published: storage.getPostById(postId)?.published ?? false,
    }

    storage.savePost(post)
    setStatus('saved')

    // Reset status back to idle after 2 seconds
    const timer = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [debouncedContent, debouncedTitle, postId, tags])

  return { status }
}
