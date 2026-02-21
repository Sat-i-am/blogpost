/**
 * Autosave hook for the blog editor.
 *
 * Debounces editor content, then saves to the database via our API route.
 * Shows a status indicator: 'idle' -> 'saving' -> 'saved' -> back to 'idle'.
 *
 * WHAT CHANGED (Supabase migration):
 * Before: storage.savePost(post) — direct localStorage call (synchronous)
 * After:  fetch('/api/posts', { method: 'POST', body: JSON.stringify(post) }) — async HTTP
 *
 * Also changed:
 * - storage.getAllPosts() for slug checking → we skip this for autosave (slug generated from title is good enough)
 * - storage.getPostById() for createdAt and published → we fetch once on mount via API
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebounce } from './useDebounce'
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
  disabled?: boolean    // when true, autosave is suppressed (read-only mode)
}

/**
 * Strip HTML tags and return plain text. Used to generate excerpts.
 * Uses regex instead of DOM to avoid "document is not defined" errors during SSR.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function useAutosave({ postId, content, title, tags, delay = 2000, disabled = false }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')

  // Debounce all inputs together as a single string to trigger one save
  const debouncedContent = useDebounce(content, delay)
  const debouncedTitle = useDebounce(title, delay)

  // Track whether this is the initial render (skip saving on mount)
  const isFirstRender = useRef(true)

  // Track the createdAt date so it doesn't change on every save
  const createdAt = useRef<string>(new Date().toISOString())

  // Track the published status so autosave doesn't accidentally unpublish
  const published = useRef<boolean>(false)

  // On mount, load existing post's createdAt and published status from the API
  useEffect(() => {
    async function loadExisting() {
      const res = await fetch(`/api/posts/${postId}`)
      if (res.ok) {
        const existing = await res.json()
        createdAt.current = existing.createdAt
        published.current = existing.published
      }
    }
    loadExisting()
  }, [postId])

  // Save whenever debounced values change (but not on first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Don't save in read-only mode or if there's no meaningful content.
    // stripHtml catches TipTap's empty state (<p></p>) which is truthy but has no real text.
    if (disabled || (!debouncedTitle.trim() && !stripHtml(debouncedContent))) return

    async function save() {
      setStatus('saving')

      // Build the post object
      const post: BlogPost = {
        id: postId,
        title: debouncedTitle,
        slug: `${uniqueSlug(debouncedTitle || 'untitled', [])}-${postId.slice(0, 8)}`,  // ID suffix mirrors BlogEditor.buildPost — guarantees uniqueness
        content: debouncedContent,
        markdown: htmlToMarkdown(debouncedContent),
        excerpt: stripHtml(debouncedContent).slice(0, 150),
        tags,
        createdAt: createdAt.current,
        updatedAt: new Date().toISOString(),
        published: published.current,  // preserve current published status (don't accidentally unpublish)
      }

      // POST to our API route — the API calls storage.savePost() which does a Prisma upsert
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })

      setStatus('saved')
    }

    save()

    // Reset status back to idle after 2 seconds
    const timer = setTimeout(() => setStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [debouncedContent, debouncedTitle, postId, tags])

  return { status }
}
